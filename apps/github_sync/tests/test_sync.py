from datetime import timedelta
from unittest.mock import patch

import pytest
from django.utils import timezone

from apps.github_sync.models import Branch, Commit, CommitFile, Contributor, PullRequest, Repository
from apps.github_sync.services.sync import sync_repository_from_github

pytestmark = pytest.mark.django_db


def _repository():
    return Repository.objects.create(
        github_id=700,
        owner="team",
        name="service",
        default_branch="main",
        webhook_secret=b"encrypted",
    )


def _github_commit(sha, authored_at):
    return {
        "sha": sha,
        "html_url": f"https://github.com/team/service/commit/{sha}",
        "author": {"login": "student"},
        "commit": {
            "message": "feat: incremental sync",
            "author": {
                "name": "Student",
                "email": "student@example.com",
                "date": authored_at.isoformat(),
            },
        },
    }


def test_incremental_sync_uses_latest_commit_and_preserves_history():
    repository = _repository()
    branch = Branch.objects.create(repository=repository, name="main")
    author = Contributor.objects.create(login="existing")
    previous_time = timezone.now() - timedelta(days=3)
    previous = Commit.objects.create(
        repository=repository,
        branch=branch,
        author=author,
        sha="a" * 40,
        message="previous",
        authored_at=previous_time,
    )
    new_time = timezone.now()

    with patch("apps.github_sync.services.sync.GitHubClient") as client_class:
        client = client_class.return_value
        client.get_repository.return_value = {"id": repository.github_id, "default_branch": "main"}
        client.get_branches.return_value = [{"name": "main"}]
        client.get_pull_requests.return_value = []
        client.get_commits.return_value = [_github_commit("b" * 40, new_time)]
        client.get_commit.return_value = {"files": []}

        count = sync_repository_from_github(repository, token="temporary-token")

    assert count == 1
    assert Commit.objects.filter(pk=previous.pk).exists()
    assert Commit.objects.filter(repository=repository, sha="b" * 40).exists()
    client.get_commits.assert_called_once_with(
        repository.owner,
        repository.name,
        since=previous_time.isoformat(),
        per_page=100,
    )


def test_first_sync_has_no_since_cursor_and_updates_default_branch():
    repository = _repository()
    authored_at = timezone.now()

    with patch("apps.github_sync.services.sync.GitHubClient") as client_class:
        client = client_class.return_value
        client.get_repository.return_value = {"id": repository.github_id, "default_branch": "develop"}
        client.get_branches.return_value = [{"name": "develop"}]
        client.get_pull_requests.return_value = []
        client.get_commits.return_value = [_github_commit("c" * 40, authored_at)]
        client.get_commit.return_value = {"files": []}

        count = sync_repository_from_github(repository)

    repository.refresh_from_db()
    assert count == 1
    assert repository.default_branch == "develop"
    assert Branch.objects.filter(repository=repository, name="develop").exists()
    client.get_commits.assert_called_once_with(
        repository.owner,
        repository.name,
        since=None,
        per_page=100,
    )


def test_sync_reconciles_branches_pull_requests_and_commit_files(settings):
    settings.GITHUB_COMMIT_DETAILS_LIMIT = 10
    repository = _repository()
    stale_branch = Branch.objects.create(repository=repository, name="stale")
    authored_at = timezone.now()
    pull_request = {
        "number": 17,
        "title": "Integra o dashboard",
        "state": "open",
        "user": {"id": 321, "login": "student"},
        "created_at": authored_at.isoformat(),
        "updated_at": authored_at.isoformat(),
        "closed_at": None,
        "merged_at": None,
    }

    with patch("apps.github_sync.services.sync.GitHubClient") as client_class:
        client = client_class.return_value
        client.get_repository.return_value = {"id": repository.github_id, "default_branch": "main"}
        client.get_branches.return_value = [{"name": "main"}, {"name": "feature/docs"}]
        client.get_pull_requests.return_value = [pull_request]
        client.get_commits.return_value = [_github_commit("d" * 40, authored_at)]
        client.get_commit.return_value = {
            "files": [
                {"filename": "README.md", "status": "modified"},
                {"filename": "docs/api.md", "status": "added"},
                {"filename": "old.txt", "status": "removed"},
            ]
        }

        count = sync_repository_from_github(repository)

    assert count == 1
    assert Branch.objects.filter(repository=repository, name="feature/docs", deleted_at__isnull=True).exists()
    stale_branch.refresh_from_db()
    assert stale_branch.deleted_at is not None
    pr = PullRequest.objects.get(repository=repository, number=17)
    assert pr.author.github_id == 321
    assert pr.title == "Integra o dashboard"
    commit = Commit.objects.get(repository=repository, sha="d" * 40)
    assert set(commit.files.values_list("path", "change_type")) == {
        ("README.md", CommitFile.ChangeType.MODIFIED),
        ("docs/api.md", CommitFile.ChangeType.ADDED),
        ("old.txt", CommitFile.ChangeType.REMOVED),
    }
    client.get_commit.assert_called_once_with(repository.owner, repository.name, "d" * 40)
