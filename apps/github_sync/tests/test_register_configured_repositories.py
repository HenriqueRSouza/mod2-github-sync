from io import StringIO
from unittest.mock import Mock, patch

import pytest
import requests
from django.core.management import call_command

from apps.github_sync.models import Repository
from apps.github_sync.services.crypto import decrypt_secret

pytestmark = pytest.mark.django_db


@pytest.fixture
def configured(settings):
    settings.GITHUB_REPOSITORIES = ["Team/Project"]
    settings.GITHUB_WEBHOOK_SECRET = "webhook-secret"
    settings.GITHUB_TOKEN = ""
    settings.GITHUB_BACKFILL_DAYS = 0
    return settings


def _metadata_response():
    response = Mock()
    response.json.return_value = {"id": 42, "owner": {"login": "team"}, "name": "project", "default_branch": "develop"}
    return response


def test_registers_configured_repository(configured):
    with patch("apps.github_sync.management.commands.register_configured_repositories.GitHubClient") as client:
        client.return_value.get.return_value = _metadata_response()
        call_command("register_configured_repositories", stdout=StringIO())

    client.return_value.get.assert_called_once_with("/repos/Team/Project")
    repository = Repository.objects.get(github_id=42)
    assert (repository.owner, repository.name, repository.default_branch) == ("team", "project", "develop")
    assert decrypt_secret(repository.webhook_secret) == "webhook-secret"


def test_is_idempotent(configured):
    with patch("apps.github_sync.management.commands.register_configured_repositories.GitHubClient") as client:
        client.return_value.get.return_value = _metadata_response()
        call_command("register_configured_repositories", stdout=StringIO())
        call_command("register_configured_repositories", stdout=StringIO())
    assert Repository.objects.count() == 1


def test_skips_when_not_configured(settings):
    settings.GITHUB_REPOSITORIES = []
    settings.GITHUB_WEBHOOK_SECRET = ""
    with patch("apps.github_sync.management.commands.register_configured_repositories.GitHubClient") as client:
        call_command("register_configured_repositories", stdout=StringIO())
    client.assert_not_called()
    assert Repository.objects.count() == 0


def test_github_failure_does_not_raise(configured):
    err = StringIO()
    with patch("apps.github_sync.management.commands.register_configured_repositories.GitHubClient") as client:
        client.return_value.get.side_effect = requests.HTTPError("404 Not Found")
        call_command("register_configured_repositories", stdout=StringIO(), stderr=err)
    assert "Could not fetch Team/Project" in err.getvalue()
    assert Repository.objects.count() == 0


def _json(data):
    response = Mock()
    response.json.return_value = data
    return response


def test_imports_recent_commits_and_pull_requests(configured):
    from django.utils import timezone

    from apps.github_sync.models import Commit, PullRequest

    configured.GITHUB_BACKFILL_DAYS = 30
    now = timezone.now()
    recent, old = now.isoformat(), (now - timezone.timedelta(days=60)).isoformat()
    commit = {
        "sha": "a" * 40,
        "html_url": "https://github.com/team/project/commit/aaa",
        "author": {"login": "dev"},
        "commit": {"message": "feat: x", "author": {"name": "Dev", "email": "dev@example.com", "date": recent}},
    }
    pull = {
        "number": 7, "title": "Add x", "state": "closed", "user": {"login": "dev"},
        "created_at": recent, "updated_at": recent, "closed_at": recent, "merged_at": recent,
    }
    old_pull = {**pull, "number": 1, "created_at": old, "updated_at": old, "closed_at": old, "merged_at": old}

    def fake_get(path, params=None):
        if path == "/repos/Team/Project":
            return _metadata_response()
        if path.endswith("/commits"):
            assert params["sha"] == "develop"
            return _json([commit])
        if path.endswith("/pulls"):
            return _json([pull, old_pull])
        raise AssertionError(path)

    out = StringIO()
    with patch("apps.github_sync.management.commands.register_configured_repositories.GitHubClient") as client:
        client.return_value.get.side_effect = fake_get
        call_command("register_configured_repositories", stdout=out)

    saved = Commit.objects.get()
    assert (saved.sha, saved.author.login, saved.branch.name) == ("a" * 40, "dev", "develop")
    assert list(PullRequest.objects.values_list("number", flat=True)) == [7]
    assert "Imported 1 commits and 1 pull requests" in out.getvalue()


def test_history_failure_keeps_registration(configured):
    configured.GITHUB_BACKFILL_DAYS = 30

    def fake_get(path, params=None):
        if path == "/repos/Team/Project":
            return _metadata_response()
        raise requests.HTTPError("403 rate limit")

    err = StringIO()
    with patch("apps.github_sync.management.commands.register_configured_repositories.GitHubClient") as client:
        client.return_value.get.side_effect = fake_get
        call_command("register_configured_repositories", stdout=StringIO(), stderr=err)

    assert Repository.objects.count() == 1
    assert "Could not import history for Team/Project" in err.getvalue()
