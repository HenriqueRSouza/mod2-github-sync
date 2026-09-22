import base64
import hashlib
import hmac
import json
import os
import uuid

import pytest
from django.urls import reverse

from apps.github_sync.models import Commit, Repository, WebhookDelivery
from apps.github_sync.services.crypto import encrypt_secret

pytestmark = pytest.mark.django_db(transaction=True)


@pytest.fixture(autouse=True)
def master_key(monkeypatch):
    monkeypatch.setenv("CREDENTIAL_MASTER_KEY", base64.urlsafe_b64encode(os.urandom(32)).decode())


@pytest.fixture
def repository():
    return Repository.objects.create(
        github_id=123,
        owner="mackenzie",
        name="module-2",
        webhook_secret=encrypt_secret("webhook-secret"),
    )


def signed_headers(body, delivery_id=None):
    digest = hmac.new(b"webhook-secret", body, hashlib.sha256).hexdigest()
    return {
        "HTTP_X_HUB_SIGNATURE_256": f"sha256={digest}",
        "HTTP_X_GITHUB_EVENT": "push",
        "HTTP_X_GITHUB_DELIVERY": str(delivery_id or uuid.uuid4()),
    }


def test_rejects_invalid_signature(client, repository):
    body = json.dumps({"repository": {"id": 123}}).encode()

    response = client.post(
        reverse("github-webhook"),
        data=body,
        content_type="application/json",
        HTTP_X_HUB_SIGNATURE_256="sha256=invalid",
        HTTP_X_GITHUB_EVENT="push",
        HTTP_X_GITHUB_DELIVERY=str(uuid.uuid4()),
    )

    assert response.status_code == 401


def test_processes_push_and_ignores_duplicate(client, repository, settings):
    settings.CELERY_TASK_ALWAYS_EAGER = True
    payload = {
        "repository": {"id": 123},
        "ref": "refs/heads/main",
        "forced": False,
        "commits": [
            {
                "id": "a" * 40,
                "message": "US019 receive webhook",
                "timestamp": "2026-09-22T12:00:00Z",
                "url": "https://github.com/mackenzie/module-2/commit/aaa",
                "author": {"name": "Student", "email": "student@example.com", "username": "student"},
                "added": ["apps/example.py"],
                "modified": [],
                "removed": [],
            }
        ],
    }
    body = json.dumps(payload).encode()
    delivery_id = uuid.uuid4()

    response = client.post(
        reverse("github-webhook"), data=body, content_type="application/json", **signed_headers(body, delivery_id)
    )
    duplicate = client.post(
        reverse("github-webhook"), data=body, content_type="application/json", **signed_headers(body, delivery_id)
    )

    assert response.status_code == 202
    assert duplicate.status_code == 200
    assert Commit.objects.filter(repository=repository, sha="a" * 40).exists()
    assert WebhookDelivery.objects.get(delivery_id=delivery_id).status == WebhookDelivery.Status.PROCESSED
