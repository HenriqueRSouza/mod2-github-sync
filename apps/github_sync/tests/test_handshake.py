from unittest.mock import Mock

import pytest
import requests
from django.urls import reverse

pytestmark = pytest.mark.django_db


def github_response(status_code, body=None, headers=None):
    response = Mock()
    response.status_code = status_code
    response.headers = {"X-RateLimit-Remaining": "4999", **(headers or {})}
    response.json.return_value = body or {}
    if status_code >= 400:
        response.raise_for_status.side_effect = requests.HTTPError(response=response)
    return response


def test_valid_token_returns_identity_and_scopes_without_echoing_token(client, monkeypatch):
    monkeypatch.setattr(
        requests.Session,
        "get",
        Mock(
            return_value=github_response(
                200,
                {"login": "student", "name": "Aluno Mackenzie", "avatar_url": "https://avatars.example/1"},
                {"X-OAuth-Scopes": "repo, read:org"},
            )
        ),
    )

    response = client.post(
        reverse("github-handshake"), data={"token": "ghp_secret-token"}, content_type="application/json"
    )

    assert response.status_code == 200
    assert response.json() == {
        "valid": True,
        "login": "student",
        "name": "Aluno Mackenzie",
        "avatar_url": "https://avatars.example/1",
        "scopes": ["read:org", "repo"],
        "required_scopes": [],
        "missing_scopes": [],
        "excess_scopes": [],
        "least_privilege": True,
    }
    assert "ghp_secret-token" not in response.content.decode()


def test_token_rejected_by_github_returns_401(client, monkeypatch):
    error_body = {"message": "Bad credentials"}
    monkeypatch.setattr(requests.Session, "get", Mock(return_value=github_response(401, error_body)))

    response = client.post(reverse("github-handshake"), data={"token": "expired"}, content_type="application/json")

    assert response.status_code == 401
    assert response.json()["valid"] is False


def test_missing_token_returns_400(client):
    response = client.post(reverse("github-handshake"), data={}, content_type="application/json")

    assert response.status_code == 400


def test_github_unreachable_returns_503(client, monkeypatch):
    monkeypatch.setattr(requests.Session, "get", Mock(side_effect=requests.ConnectionError("timeout")))

    response = client.post(reverse("github-handshake"), data={"token": "any"}, content_type="application/json")

    assert response.status_code == 503
    assert response.json()["valid"] is False


def test_handshake_rejects_token_missing_environment_scope(client, monkeypatch, settings):
    settings.GITHUB_REQUIRED_SCOPES = {"repo", "read:org"}
    settings.GITHUB_ALLOWED_SCOPES = {"repo", "read:org"}
    monkeypatch.setattr(
        requests.Session,
        "get",
        Mock(return_value=github_response(200, {"login": "student"}, {"X-OAuth-Scopes": "read:org"})),
    )

    response = client.post(reverse("github-handshake"), {"token": "limited"}, content_type="application/json")

    assert response.status_code == 403
    assert response.json()["valid"] is False
    assert response.json()["missing_scopes"] == ["repo"]
