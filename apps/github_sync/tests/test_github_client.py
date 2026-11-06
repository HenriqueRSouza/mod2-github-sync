from unittest.mock import Mock, call

import pytest

from apps.github_sync.services.github import GitHubClient, GitHubRateLimitError


def test_handshake_returns_user_and_oauth_scopes(settings):
    settings.GITHUB_API_URL = "https://github.example/api/v3"
    settings.GITHUB_CA_BUNDLE = "/certs/ca.pem"
    response = Mock()
    response.headers = {
        "X-OAuth-Scopes": "repo:status, read:org",
        "X-RateLimit-Remaining": "10",
    }
    response.json.return_value = {"login": "student"}
    client = GitHubClient(token="token")
    client.session.get = Mock(return_value=response)

    user, scopes = client.handshake()

    assert user == {"login": "student"}
    assert scopes == {"repo:status", "read:org"}
    assert client.session.headers["Authorization"] == "Bearer token"
    client.session.get.assert_called_once_with(
        "https://github.example/api/v3/user",
        params=None,
        timeout=10,
        verify="/certs/ca.pem",
    )
    response.raise_for_status.assert_called_once()


def test_get_repository_returns_github_payload():
    client = GitHubClient()
    response = Mock()
    response.json.return_value = {"id": 42, "name": "service"}
    client.get = Mock(return_value=response)

    result = client.get_repository("team", "service")

    assert result == {"id": 42, "name": "service"}
    client.get.assert_called_once_with("/repos/team/service")


def test_get_content_encodes_path_and_forwards_ref():
    client = GitHubClient()
    response = Mock()
    response.json.return_value = {"type": "file"}
    client.get = Mock(return_value=response)

    result = client.get_content("team", "service", "docs/guia de uso.md", ref="feature/docs")

    assert result == {"type": "file"}
    client.get.assert_called_once_with(
        "/repos/team/service/contents/docs/guia%20de%20uso.md",
        params={"ref": "feature/docs"},
    )


def test_repository_resource_wrappers_use_expected_github_routes():
    client = GitHubClient()
    client.get_paginated = Mock(side_effect=[[{"name": "main"}], [{"number": 7}]])
    response = Mock()
    response.json.return_value = {"sha": "a" * 40, "files": []}
    client.get = Mock(return_value=response)

    branches = client.get_branches("team", "service")
    pull_requests = client.get_pull_requests("team", "service")
    commit = client.get_commit("team", "service", "a" * 40)

    assert branches == [{"name": "main"}]
    assert pull_requests == [{"number": 7}]
    assert commit["sha"] == "a" * 40
    assert client.get_paginated.call_args_list == [
        call("/repos/team/service/branches", per_page=100),
        call(
            "/repos/team/service/pulls",
            params={"state": "all", "sort": "updated", "direction": "desc"},
            per_page=100,
        ),
    ]
    client.get.assert_called_once_with(f"/repos/team/service/commits/{'a' * 40}")


def test_get_commits_paginates_with_since_and_stops_at_200():
    client = GitHubClient()
    first = Mock()
    first.json.return_value = [{"sha": f"a{i}"} for i in range(100)]
    second = Mock()
    second.json.return_value = [{"sha": f"b{i}"} for i in range(100)]
    client.get = Mock(side_effect=[first, second])

    commits = client.get_commits("team", "service", since="2026-10-01T00:00:00Z")

    assert len(commits) == 200
    assert client.get.call_args_list == [
        call(
            "/repos/team/service/commits",
            params={"per_page": 100, "page": 1, "since": "2026-10-01T00:00:00Z"},
        ),
        call(
            "/repos/team/service/commits",
            params={"per_page": 100, "page": 2, "since": "2026-10-01T00:00:00Z"},
        ),
    ]


def test_get_does_not_block_when_success_exhausts_rate_limit(settings):
    settings.GITHUB_API_URL = "https://api.github.test"
    response = Mock()
    response.status_code = 200
    response.headers = {"X-RateLimit-Remaining": "0", "X-RateLimit-Reset": "110"}
    client = GitHubClient()
    client.session.get = Mock(return_value=response)

    assert client.get("/meta") is response

    response.raise_for_status.assert_called_once()


def test_get_raises_capped_rate_limit_error_without_sleep(settings):
    settings.GITHUB_API_URL = "https://api.github.test"
    settings.GITHUB_MAX_RETRY_AFTER = 60
    response = Mock()
    response.status_code = 429
    response.headers = {"X-RateLimit-Remaining": "0", "Retry-After": "300"}
    client = GitHubClient()
    client.session.get = Mock(return_value=response)

    with pytest.raises(GitHubRateLimitError) as captured:
        client.get("/meta")

    assert captured.value.retry_after == 60
    response.raise_for_status.assert_not_called()


def test_get_detects_github_secondary_rate_limit(settings):
    settings.GITHUB_API_URL = "https://api.github.test"
    settings.GITHUB_MAX_RETRY_AFTER = 120
    response = Mock()
    response.status_code = 403
    response.headers = {"X-RateLimit-Remaining": "12", "Retry-After": "30"}
    response.json.return_value = {"message": "You have exceeded a secondary rate limit."}
    client = GitHubClient()
    client.session.get = Mock(return_value=response)

    with pytest.raises(GitHubRateLimitError) as captured:
        client.get("/repos/team/service")

    assert captured.value.retry_after == 30
    response.raise_for_status.assert_not_called()
