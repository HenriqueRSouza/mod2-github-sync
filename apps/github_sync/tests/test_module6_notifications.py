from unittest.mock import Mock, patch
from uuid import uuid4

import pytest
from django.urls import reverse

from apps.github_sync.models import Repository
from apps.github_sync.services.notifications import module6_notification_payload, post_module6_notification
from apps.github_sync.tasks import queue_module6_notification

pytestmark = pytest.mark.django_db


@pytest.fixture
def repository():
    return Repository.objects.create(
        github_id=6767,
        owner="owner",
        name="repository",
        project_id=uuid4(),
        webhook_secret=b"encrypted-secret",
    )


def test_module6_payload_uses_project_scope_and_contains_no_credentials(repository):
    payload = module6_notification_payload(
        repository,
        event_id="m2-sync-completed-1",
        notification_type="github.sync.completed",
        title="Sincronização com GitHub concluída",
        body="3 commit(s) foram sincronizados.",
        priority="medium",
    )

    assert payload == {
        "event_id": "m2-sync-completed-1",
        "scope": "project",
        "project_id": str(repository.project_id),
        "source": "github",
        "type": "github.sync.completed",
        "title": "Sincronização com GitHub concluída",
        "body": "3 commit(s) foram sincronizados.",
        "priority": "medium",
        "link": None,
    }
    assert "encrypted-secret" not in str(payload)


def test_module6_request_uses_server_side_key_only_when_enabled(repository, settings):
    settings.MODULE6_NOTIFICATIONS_ENABLED = True
    settings.MODULE6_NOTIFICATIONS_URL = "https://module-6.example/notifications"
    settings.MODULE6_INTEGRATION_KEY = "integration-secret"
    response = Mock()
    response.raise_for_status = Mock()
    payload = module6_notification_payload(
        repository,
        event_id="m2-sync-completed-2",
        notification_type="github.sync.completed",
        title="Sincronização com GitHub concluída",
        body="0 commit(s) foram sincronizados.",
        priority="medium",
    )

    with patch("apps.github_sync.services.notifications.requests.post", return_value=response) as post:
        assert post_module6_notification(payload) is True

    assert post.call_args.kwargs["headers"] == {
        "X-Integration-Key": "integration-secret",
        "Content-Type": "application/json",
    }
    assert post.call_args.kwargs["json"] == payload
    assert "integration-secret" not in str(post.call_args.kwargs["json"])


def test_module6_dispatch_is_not_scheduled_without_explicit_configuration(repository, settings):
    settings.MODULE6_NOTIFICATIONS_ENABLED = False

    with patch("apps.github_sync.tasks.notify_module6.delay") as delay:
        queued = queue_module6_notification(
            repository.pk,
            event_id="m2-sync-completed-3",
            notification_type="github.sync.completed",
            title="Sincronização concluída",
            body="Sem envio externo.",
            priority="medium",
        )

    assert queued is False
    delay.assert_not_called()


def test_module6_queue_failure_does_not_interrupt_the_originating_flow(repository, settings):
    settings.MODULE6_NOTIFICATIONS_ENABLED = True
    settings.MODULE6_NOTIFICATIONS_URL = "https://module-6.example/notifications"
    settings.MODULE6_INTEGRATION_KEY = "integration-secret"

    with patch("apps.github_sync.tasks.notify_module6.delay", side_effect=RuntimeError("broker unavailable")):
        queued = queue_module6_notification(
            repository.pk,
            event_id="m2-sync-completed-4",
            notification_type="github.sync.completed",
            title="Sincronização concluída",
            body="O fluxo M2 permanece saudável.",
            priority="medium",
        )

    assert queued is False


def test_successful_sync_queues_a_module6_notification(client, repository, settings):
    settings.MODULE6_NOTIFICATIONS_ENABLED = True
    settings.MODULE6_NOTIFICATIONS_URL = "https://module-6.example/notifications"
    settings.MODULE6_INTEGRATION_KEY = "integration-secret"

    with patch("apps.github_sync.views.sync_repository_from_github", return_value=7), patch(
        "apps.github_sync.views.queue_module6_notification"
    ) as notify:
        response = client.post(reverse("repository-sync", kwargs={"pk": repository.pk}))

    assert response.status_code == 200
    assert response.json()["commits_synced"] == 7
    assert notify.call_args.kwargs["notification_type"] == "github.sync.completed"
    assert notify.call_args.kwargs["priority"] == "medium"
