import uuid
from datetime import timedelta

import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone

from apps.github_sync.models import Commit, PullRequest, Repository, WebhookDelivery

pytestmark = pytest.mark.django_db


@pytest.fixture
def signed_in_client(client):
    user = get_user_model().objects.create_user(username="viewer", password="test-password")
    client.force_login(user)
    return client


@pytest.fixture
def repository():
    return Repository.objects.create(github_id=100, owner="team", name="project", webhook_secret=b"encrypted")


def test_dashboard_requires_login(client, repository):
    assert client.get(reverse("dashboard")).status_code == 302
    assert client.get(reverse("dashboard-metrics")).status_code in (401, 403)


def test_dashboard_aggregates_distinct_events_and_sla(signed_in_client, repository):
    now = timezone.now()
    Commit.objects.create(
        repository=repository, sha="a" * 40, message="Implementar painel", authored_at=now - timedelta(hours=1)
    )
    Commit.objects.create(
        repository=repository, sha="b" * 40, message="Corrigir filtros", authored_at=now - timedelta(hours=1)
    )
    push = WebhookDelivery.objects.create(
        delivery_id=uuid.uuid4(), repository=repository, event="push", status="processed",
        payload={"ref": "refs/heads/main", "commits": [{"id": "a"}, {"id": "b"}]},
        processed_at=now,
    )
    WebhookDelivery.objects.filter(pk=push.pk).update(received_at=now - timedelta(seconds=30))
    PullRequest.objects.create(
        repository=repository, number=1, title="Primeira entrega", state="closed",
        opened_at=now - timedelta(days=2), merged_at=now - timedelta(hours=2),
        closed_at=now - timedelta(hours=2), updated_at=now - timedelta(hours=2),
    )
    PullRequest.objects.create(
        repository=repository, number=2, title="Entrega tardia", state="closed",
        opened_at=now - timedelta(days=8), merged_at=now - timedelta(hours=1),
        closed_at=now - timedelta(hours=1), updated_at=now - timedelta(hours=1),
    )
    PullRequest.objects.create(
        repository=repository, number=3, title="Pendente", state="open",
        opened_at=now - timedelta(days=4), updated_at=now - timedelta(hours=1),
    )

    response = signed_in_client.get(reverse("dashboard-metrics"), {"repository_id": repository.pk, "days": 7})
    data = response.json()
    assert response.status_code == 200
    assert (data["total_commits"], data["total_pushes"]) == (2, 1)
    assert (data["prs_opened"], data["prs_merged"], data["prs_overdue"]) == (2, 2, 1)
    assert (data["sla_on_time"], data["sla_percent"]) == (1, 50)
    assert data["processing_within_2m_percent"] == 100
    assert data["last_processed_at"] is not None
    assert {item["kind"] for item in data["recent"]} == {"Commit", "Push", "PR"}
    assert "2 commits no evento" in [item["detail"] for item in data["recent"]]


def test_dashboard_empty_state_and_filters(signed_in_client, repository):
    page = signed_in_client.get(reverse("dashboard"))
    assert page.status_code == 200
    assert b"Nenhuma atividade" in page.content
    data = signed_in_client.get(reverse("dashboard-metrics"), {"days": 30}).json()
    assert data["sla_percent"] is None
    assert data["processing_within_2m_percent"] is None
    assert signed_in_client.get(reverse("dashboard-metrics"), {"days": 15}).status_code == 400
    assert signed_in_client.get(reverse("dashboard-metrics"), {"repository_id": 999}).status_code == 400


def test_dashboard_defaults_to_configured_repository(signed_in_client, repository, settings):
    target = Repository.objects.create(
        github_id=200, owner="HenriqueRSouza", name="mod2-github-sync", webhook_secret=b"encrypted"
    )
    settings.DASHBOARD_DEFAULT_REPOSITORY = "HenriqueRSouza/mod2-github-sync"

    response = signed_in_client.get(reverse("dashboard-metrics"))
    assert response.json()["repository"]["id"] == target.pk
