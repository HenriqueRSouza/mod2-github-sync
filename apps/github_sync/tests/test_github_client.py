from unittest.mock import Mock

from apps.github_sync.services.github import GitHubClient


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
