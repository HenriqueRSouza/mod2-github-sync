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
