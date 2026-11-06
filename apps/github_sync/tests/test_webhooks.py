import base64
import hashlib
import hmac
import json
import os
import uuid
from types import SimpleNamespace
from unittest.mock import Mock, patch

import pytest
from celery.exceptions import Retry
from django.contrib.auth import get_user_model
from django.db import OperationalError
from django.urls import reverse
from django.utils import timezone

from apps.github_sync.models import Commit, CommitFile, Repository, WebhookDelivery
from apps.github_sync.services.crypto import encrypt_secret
from apps.github_sync.tasks import _process_webhook_delivery

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


def test_returns_json_when_webhook_credential_cannot_be_decrypted(client, repository):
    repository.webhook_secret = b"ciphertext-from-a-different-runtime"
    repository.save(update_fields=("webhook_secret",))
    body = json.dumps({"repository": {"id": 123}}).encode()

    response = client.post(
        reverse("github-webhook"), data=body, content_type="application/json", **signed_headers(body)
    )

    assert response.status_code == 503
    assert response.json() == {
        "code": "webhook_credential_unavailable",
        "detail": "A credencial do webhook não pôde ser lida. Rotacione o segredo antes de reenviar.",
    }


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
    commit = Commit.objects.get(repository=repository, sha="a" * 40)
    assert list(commit.files.values_list("path", "change_type")) == [
        ("apps/example.py", CommitFile.ChangeType.ADDED)
    ]
    assert WebhookDelivery.objects.get(delivery_id=delivery_id).status == WebhookDelivery.Status.PROCESSED

    updated_payload = {
        **payload,
        "commits": [
            {
                **payload["commits"][0],
                "added": [],
                "modified": ["apps/example.py"],
                "removed": [],
            }
        ],
    }
    updated_body = json.dumps(updated_payload).encode()
    updated = client.post(
        reverse("github-webhook"), data=updated_body, content_type="application/json", **signed_headers(updated_body)
    )

    assert updated.status_code == 202
    assert list(commit.files.values_list("path", "change_type")) == [
        ("apps/example.py", CommitFile.ChangeType.MODIFIED)
    ]


def _delivery(repository):
    return WebhookDelivery.objects.create(
        delivery_id=uuid.uuid4(),
        repository=repository,
        event="push",
        payload={"ref": "refs/heads/main", "commits": []},
    )


def test_permanent_webhook_failure_is_persisted_outside_rolled_back_transaction(repository):
    delivery = _delivery(repository)
    task = SimpleNamespace(request=SimpleNamespace(retries=0), max_retries=3, retry=Mock())

    with patch("apps.github_sync.tasks._process_push", side_effect=ValueError("invalid token=secret-value")):
        with pytest.raises(ValueError):
            _process_webhook_delivery(task, delivery.pk)

    delivery.refresh_from_db()
    assert delivery.status == WebhookDelivery.Status.FAILED
    assert delivery.attempts == 1
    assert "secret-value" not in delivery.error
    task.retry.assert_not_called()


def test_transient_webhook_failure_schedules_bounded_retry(repository):
    delivery = _delivery(repository)
    retry_signal = Retry("scheduled")
    task = SimpleNamespace(
        request=SimpleNamespace(retries=1),
        max_retries=3,
        retry=Mock(side_effect=retry_signal),
    )

    with patch("apps.github_sync.tasks._process_push", side_effect=OperationalError("db unavailable")), patch(
        "apps.github_sync.tasks.random.uniform", return_value=0.25
    ):
        with pytest.raises(Retry):
            _process_webhook_delivery(task, delivery.pk)

    delivery.refresh_from_db()
    assert delivery.status == WebhookDelivery.Status.FAILED
    assert delivery.attempts == 1
    task.retry.assert_called_once()
    assert task.retry.call_args.kwargs["countdown"] == 2.25


def test_authenticated_operator_can_replay_failed_delivery(client, repository):
    delivery = _delivery(repository)
    delivery.status = WebhookDelivery.Status.FAILED
    delivery.error = "temporary"
    delivery.save(update_fields=("status", "error"))
    user = get_user_model().objects.create_user(username="operator", password="secret")
    client.force_login(user)

    with patch("apps.github_sync.views.process_webhook.delay") as delay:
        response = client.post(reverse("webhook-delivery-replay", kwargs={"delivery_id": delivery.delivery_id}))

    assert response.status_code == 202
    delivery.refresh_from_db()
    assert delivery.status == WebhookDelivery.Status.PENDING
    assert delivery.error == ""
    delay.assert_called_once_with(delivery.pk)


def test_replay_rejects_anonymous_and_processed_delivery(client, repository, settings):
    settings.MODULE1_AUTH_REQUIRED = True
    delivery = _delivery(repository)

    anonymous = client.post(reverse("webhook-delivery-replay", kwargs={"delivery_id": delivery.delivery_id}))
    assert anonymous.status_code in (401, 403)

    settings.MODULE1_AUTH_REQUIRED = False
    user = get_user_model().objects.create_user(username="operator-two", password="secret")
    client.force_login(user)
    delivery.status = WebhookDelivery.Status.PROCESSED
    delivery.save(update_fields=("status",))
    response = client.post(reverse("webhook-delivery-replay", kwargs={"delivery_id": delivery.delivery_id}))
    assert response.status_code == 409
    assert response.json()["code"] == "delivery_not_replayable"


def test_webhook_rejects_expired_repository_credential(client, repository):
    repository.webhook_secret_expires_at = timezone.now()
    repository.save(update_fields=("webhook_secret_expires_at",))
    body = json.dumps({"repository": {"id": 123}}).encode()

    response = client.post(
        reverse("github-webhook"), data=body, content_type="application/json", **signed_headers(body)
    )

    assert response.status_code == 401
    assert response.json()["code"] == "webhook_credential_expired"
