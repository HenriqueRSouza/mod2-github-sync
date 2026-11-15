import base64
from unittest.mock import patch

import pytest
from django.urls import reverse

from apps.github_sync.models import Repository

pytestmark = pytest.mark.django_db


@pytest.fixture
def repository():
    return Repository.objects.create(
        github_id=9001,
        owner="team",
        name="service",
        default_branch="main",
        webhook_secret=b"encrypted",
    )


def test_content_endpoint_returns_utf8_with_provenance_and_does_not_echo_token(client, repository):
    payload = {
        "type": "file",
        "path": "src/app.py",
        "sha": "a" * 40,
        "size": 12,
        "encoding": "base64",
        "content": base64.b64encode(b"print('ok')\n").decode(),
        "html_url": "https://github.com/team/service/blob/main/src/app.py",
    }
    with patch("apps.github_sync.views.GitHubClient.get_content", return_value=payload) as get_content:
        response = client.post(
            reverse("repository-content", kwargs={"pk": repository.pk}),
            {"path": "src/app.py", "ref": "main", "token": "temporary-token"},
            content_type="application/json",
        )

    assert response.status_code == 200
    assert response.json()["content"] == "print('ok')\n"
    assert response.json()["source_url"].endswith("src/app.py")
    assert "temporary-token" not in response.content.decode()
    get_content.assert_called_once_with("team", "service", "src/app.py", ref="main")


def test_content_endpoint_accepts_github_base64_line_breaks(client, repository):
    encoded = base64.b64encode(b"print('ok')\n").decode()
    payload = {
        "type": "file",
        "path": "src/app.py",
        "sha": "a" * 40,
        "size": 12,
        "encoding": "base64",
        "content": f"{encoded[:8]}\n{encoded[8:]}\n",
        "html_url": "https://github.com/team/service/blob/main/src/app.py",
    }
    with patch("apps.github_sync.views.GitHubClient.get_content", return_value=payload):
        response = client.post(
            reverse("repository-content", kwargs={"pk": repository.pk}),
            {"path": "src/app.py"},
            content_type="application/json",
        )

    assert response.status_code == 200
    assert response.json()["content"] == "print('ok')\n"


def test_content_endpoint_rejects_path_traversal_and_large_files(client, repository, settings):
    traversal = client.post(
        reverse("repository-content", kwargs={"pk": repository.pk}),
        {"path": "../secret.txt"},
        content_type="application/json",
    )
    settings.GITHUB_CONTENT_MAX_BYTES = 10
    payload = {
        "type": "file",
        "path": "large.txt",
        "sha": "b" * 40,
        "size": 11,
        "encoding": "base64",
        "content": base64.b64encode(b"hello world").decode(),
    }
    with patch("apps.github_sync.views.GitHubClient.get_content", return_value=payload):
        large = client.post(
            reverse("repository-content", kwargs={"pk": repository.pk}),
            {"path": "large.txt"},
            content_type="application/json",
        )

    assert traversal.status_code == 400
    assert traversal.json()["code"] == "invalid_content_path"
    assert large.status_code == 400
    assert large.json()["code"] == "content_too_large"


def test_commit_diff_endpoint_caps_patch_and_reports_truncation(client, repository, settings):
    settings.GITHUB_DIFF_PATCH_MAX_CHARS = 5
    payload = {
        "sha": "c" * 40,
        "html_url": "https://github.com/team/service/commit/ccc",
        "files": [
            {
                "filename": "src/app.py",
                "status": "modified",
                "additions": 3,
                "deletions": 1,
                "changes": 4,
                "patch": "123456789",
            }
        ],
    }
    with patch("apps.github_sync.views.GitHubClient.get_commit", return_value=payload):
        response = client.post(
            reverse("repository-commit-diff", kwargs={"pk": repository.pk, "sha": "c" * 40}),
            {},
            content_type="application/json",
        )

    assert response.status_code == 200
    assert response.json()["files"][0]["patch"] == "12345"
    assert response.json()["files"][0]["truncated"] is True


def test_private_consumer_contract_rejects_legacy_module_key(client, repository, settings):
    settings.MODULE1_AUTH_REQUIRED = True

    denied = client.post(
        reverse("repository-content", kwargs={"pk": repository.pk}),
        {"path": "README.md"},
        content_type="application/json",
    )
    legacy_key = client.post(
        reverse("repository-content", kwargs={"pk": repository.pk}),
        {"path": "../invalid"},
        content_type="application/json",
        HTTP_X_MODULE_API_KEY="consumer-key",
    )

    assert denied.status_code == 401
    assert legacy_key.status_code == 401
