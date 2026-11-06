from unittest.mock import Mock, patch

import pytest
from django.urls import reverse
from django.utils import timezone

from apps.github_sync.models import Branch, Contributor, CredentialAuditEvent, PullRequest, Repository
from apps.github_sync.services.github import GitHubRateLimitError

pytestmark = pytest.mark.django_db


def test_health_check(client):
    response = client.get(reverse("health"))

    assert response.status_code == 200
    assert response.json() == {"status": "healthy", "database": "up"}


def test_readiness_reports_independent_dependencies(client):
    report = {
        "status": "not_ready",
        "checks": {
            "database": {"status": "up"},
            "redis": {"status": "down", "detail": "redis ping failed"},
            "worker": {"status": "down", "detail": "no Celery worker replied"},
            "crypto": {"status": "up"},
        },
    }
    with patch("apps.github_sync.views.readiness_report", return_value=report):
        response = client.get(reverse("readiness"))

    assert response.status_code == 503
    assert response.json() == report


def test_commit_list_is_paginated(client):
    response = client.get(reverse("commit-list"))

    assert response.status_code == 200
    assert response.json() == {"count": 0, "next": None, "previous": None, "results": []}


def test_branch_list_filters_repository_and_hides_deleted(client):
    repo = Repository.objects.create(github_id=991, owner="owner", name="repo", webhook_secret=b"sec")
    other = Repository.objects.create(github_id=992, owner="owner", name="other", webhook_secret=b"sec")
    Branch.objects.create(repository=repo, name="main")
    Branch.objects.create(repository=repo, name="old", deleted_at=timezone.now())
    Branch.objects.create(repository=other, name="develop")

    response = client.get(reverse("branch-list"), {"repository_id": repo.pk})

    assert response.status_code == 200
    assert [item["name"] for item in response.json()["results"]] == ["main"]


def test_pull_request_list_filters_repository_state_and_author(client):
    repo = Repository.objects.create(github_id=993, owner="owner", name="repo", webhook_secret=b"sec")
    author = Contributor.objects.create(github_id=123, login="aluna")
    now = timezone.now()
    PullRequest.objects.create(
        repository=repo,
        author=author,
        number=42,
        title="Integra o módulo",
        state="open",
        opened_at=now,
        updated_at=now,
    )

    response = client.get(
        reverse("pull-request-list"),
        {"repository_id": repo.pk, "state": "open", "author": "aluna"},
    )

    assert response.status_code == 200
    assert response.json()["count"] == 1
    assert response.json()["results"][0]["number"] == 42


def test_repository_sync_endpoint(client):
    repo = Repository.objects.create(github_id=999, owner="owner", name="repo", webhook_secret=b"sec")
    with patch("apps.github_sync.views.sync_repository_from_github", return_value=5):
        response = client.post(reverse("repository-sync", kwargs={"pk": repo.pk}))
        assert response.status_code == 200
        assert response.json()["commits_synced"] == 5
        assert response.json()["status"] == "synced"


def test_repository_sync_returns_stable_error_without_exception_detail(client):
    repo = Repository.objects.create(github_id=998, owner="owner", name="repo-error", webhook_secret=b"sec")
    with patch(
        "apps.github_sync.views.sync_repository_from_github",
        side_effect=RuntimeError("temporary failure with token=secret-value"),
    ):
        response = client.post(reverse("repository-sync", kwargs={"pk": repo.pk}))

    assert response.status_code == 500
    assert response.json() == {
        "code": "repository_sync_failed",
        "detail": "A sincronização falhou. Tente novamente mais tarde.",
    }
    assert "secret-value" not in response.content.decode()


def test_create_repository_via_github_url(client, monkeypatch):
    import base64
    monkeypatch.setenv("CREDENTIAL_MASTER_KEY", base64.urlsafe_b64encode(b"0" * 32).decode())
    fake_data = {"id": 12345, "name": "bar", "owner": {"login": "foo"}, "default_branch": "main"}
    with patch("apps.github_sync.services.github.GitHubClient.get_repository", return_value=fake_data), patch(
        "apps.github_sync.views.sync_repository_from_github", return_value=10
    ):
        response = client.post(
            reverse("repository-list"),
            {"url": "https://github.com/foo/bar", "webhook_secret": "unique-webhook-secret"},
        )
        assert response.status_code == 201
        assert response.json()["owner"] == "foo"
        assert response.json()["name"] == "bar"
        assert response.json()["initial_sync_status"] == "completed"
        assert response.json()["webhook_secret_version"] == 1
        assert CredentialAuditEvent.objects.get(repository__github_id=12345).action == "created"


def test_create_repository_reports_initial_sync_failure(client, monkeypatch):
    import base64

    monkeypatch.setenv("CREDENTIAL_MASTER_KEY", base64.urlsafe_b64encode(b"0" * 32).decode())
    fake_data = {"id": 54321, "name": "bar", "owner": {"login": "foo"}, "default_branch": "main"}
    with patch("apps.github_sync.services.github.GitHubClient.get_repository", return_value=fake_data), patch(
        "apps.github_sync.views.sync_repository_from_github", side_effect=RuntimeError("temporary failure")
    ):
        response = client.post(
            reverse("repository-list"),
            {"url": "https://github.com/foo/bar", "webhook_secret": "unique-webhook-secret"},
        )

    assert response.status_code == 201
    assert response.json()["initial_sync_status"] == "failed"
    assert "sincronização inicial falhou" in response.json()["initial_sync_detail"]


def test_create_repository_reports_github_rate_limit(client):
    github_response = Mock(status_code=403)
    error = GitHubRateLimitError(github_response, retry_after=45)
    with patch("apps.github_sync.services.github.GitHubClient.get_repository", side_effect=error):
        response = client.post(
            reverse("repository-list"),
            {"url": "https://github.com/foo/bar", "webhook_secret": "unique-webhook-secret"},
        )

    assert response.status_code == 429
    assert response.json()["code"] == "github_rate_limit_exceeded"
    assert "45 segundos" in response.json()["detail"]


def test_create_repository_reports_unavailable_credential_store(client):
    fake_data = {"id": 98765, "name": "bar", "owner": {"login": "foo"}, "default_branch": "main"}
    with patch("apps.github_sync.services.github.GitHubClient.get_repository", return_value=fake_data), patch(
        "apps.github_sync.views.store_repository_credential",
        side_effect=RuntimeError("missing runtime secret"),
    ):
        response = client.post(
            reverse("repository-list"),
            {"url": "https://github.com/foo/bar", "webhook_secret": "unique-webhook-secret"},
        )

    assert response.status_code == 503
    assert response.json() == {
        "code": "credential_store_unavailable",
        "detail": "O armazenamento seguro de credenciais está temporariamente indisponível.",
    }
    assert "missing runtime secret" not in response.content.decode()


def test_reject_non_github_url(client):
    response = client.post(
        reverse("repository-list"),
        {"url": "https://gitlab.com/foo/bar", "webhook_secret": "unique-webhook-secret"},
    )
    assert response.status_code == 400
    assert "github.com" in response.json()["detail"]


def test_repository_requires_unique_webhook_secret(client):
    response = client.post(reverse("repository-list"), {"url": "https://github.com/foo/bar"})

    assert response.status_code == 400
    assert "webhook_secret" in response.json()["detail"]


def test_reconnecting_repository_rotates_secret_and_audits(client, monkeypatch):
    import base64

    monkeypatch.setenv("CREDENTIAL_MASTER_KEY", base64.urlsafe_b64encode(b"0" * 32).decode())
    fake_data = {"id": 76543, "name": "bar", "owner": {"login": "foo"}, "default_branch": "main"}
    with patch("apps.github_sync.services.github.GitHubClient.get_repository", return_value=fake_data), patch(
        "apps.github_sync.views.sync_repository_from_github", return_value=0
    ):
        first = client.post(
            reverse("repository-list"),
            {"url": "https://github.com/foo/bar", "webhook_secret": "first-webhook-secret"},
        )
        second = client.post(
            reverse("repository-list"),
            {
                "url": "https://github.com/foo/bar",
                "webhook_secret": "second-webhook-secret",
                "webhook_secret_expires_at": "2027-01-01T00:00:00Z",
            },
        )

    assert first.status_code == second.status_code == 201
    repository = Repository.objects.get(github_id=76543)
    assert repository.webhook_secret_version == 2
    assert repository.webhook_secret_expires_at is not None
    assert list(repository.credential_audit_events.values_list("action", flat=True)) == ["rotated", "created"]


def test_module1_auth_is_fail_closed_and_legacy_api_key_is_rejected(client, settings):
    settings.MODULE1_AUTH_REQUIRED = True

    denied = client.post(reverse("repository-list"), {})
    legacy_key = client.post(reverse("repository-list"), {}, HTTP_X_MODULE_API_KEY="internal-key")

    assert denied.status_code == 401
    assert legacy_key.status_code == 401
