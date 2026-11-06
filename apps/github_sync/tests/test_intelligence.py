from datetime import timedelta
from unittest.mock import Mock, patch

import pytest
from django.urls import reverse
from django.utils import timezone

from apps.github_sync.models import Commit, Contributor, Repository
from apps.github_sync.services.intelligence import repository_intelligence, score_commit_message

pytestmark = pytest.mark.django_db


@pytest.fixture
def repository():
    return Repository.objects.create(github_id=4242, owner="team", name="service", webhook_secret=b"secret")


def test_commit_message_score_distinguishes_specific_and_vague_messages():
    clear = score_commit_message("feat(sync): reconciliar branches M2-131")
    vague = score_commit_message("ajustes")

    assert clear["score"] >= 75
    assert clear["label"] == "clara"
    assert vague["score"] < 50
    assert vague["label"] == "vaga"


def test_repository_intelligence_uses_real_commits_and_reports_bottlenecks(repository):
    author = Contributor.objects.create(login="student")
    for index in range(5):
        Commit.objects.create(
            repository=repository,
            author=author,
            sha=str(index).zfill(40),
            message="ajustes",
            authored_at=timezone.now() - timedelta(hours=index),
        )

    result = repository_intelligence(repository, days=30)

    assert result["total_commits"] == 5
    assert result["analysis_mode"] == "deterministic-v1"
    assert result["average_clarity_score"] < 60
    assert {
        "author_concentration",
        "commit_message_clarity",
    }.issubset({item["code"] for item in result["bottlenecks"]})
    assert len(result["recent_commit_quality"]) == 5


def test_insights_endpoint_validates_period_and_repository(client, repository):
    invalid = client.get(reverse("repository-insights", kwargs={"pk": repository.pk}), {"days": "zero"})
    missing = client.get(reverse("repository-insights", kwargs={"pk": 999999}))
    valid = client.get(reverse("repository-insights", kwargs={"pk": repository.pk}), {"days": 7})

    assert invalid.status_code == 400
    assert missing.status_code == 404
    assert valid.status_code == 200
    assert valid.json()["repository"]["name"] == "team/service"
    assert valid.json()["period_days"] == 7


def test_optional_provider_receives_only_aggregate_summary(repository, settings):
    settings.AI_INSIGHTS_ENABLED = True
    settings.AI_PROVIDER_URL = "https://ai.example/v1/chat/completions"
    settings.AI_PROVIDER_API_KEY = "provider-secret"
    settings.AI_PROVIDER_MODEL = "course-model"
    response = Mock()
    response.json.return_value = {
        "choices": [{"message": {"content": '{"recommendations":["Reduza lotes de commits."]}'}}]
    }
    response.raise_for_status = Mock()

    with patch("apps.github_sync.services.intelligence.requests.post", return_value=response) as post:
        result = repository_intelligence(repository)

    assert result["analysis_mode"] == "provider:course-model"
    assert "Reduza lotes de commits." in result["recommendations"]
    payload = post.call_args.kwargs["json"]
    assert "provider-secret" not in str(payload)
    assert "recent_commit_quality" not in str(payload)
