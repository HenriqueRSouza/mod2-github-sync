import requests
from django.conf import settings
from django.core.management import call_command
from django.core.management.base import BaseCommand

from apps.github_sync.services.github import GitHubClient


class Command(BaseCommand):
    help = "Register the repositories listed in GITHUB_REPOSITORIES using GITHUB_WEBHOOK_SECRET"

    def handle(self, *args, **options):
        if not settings.GITHUB_REPOSITORIES or not settings.GITHUB_WEBHOOK_SECRET:
            self.stdout.write("GITHUB_REPOSITORIES or GITHUB_WEBHOOK_SECRET not set; skipping.")
            return
        client = GitHubClient(token=settings.GITHUB_TOKEN or None)
        for full_name in settings.GITHUB_REPOSITORIES:
            owner, _, name = full_name.partition("/")
            if not owner or not name:
                self.stderr.write(f"Invalid repository {full_name!r}; expected owner/name.")
                continue
            try:
                metadata = client.get(f"/repos/{owner}/{name}").json()
            except requests.RequestException as exc:
                # Nao derruba a inicializacao do container por falha de rede ou repositorio inexistente
                self.stderr.write(f"Could not fetch {full_name} from GitHub: {exc}")
                continue
            call_command(
                "register_repository",
                github_id=metadata["id"],
                owner=metadata["owner"]["login"],
                name=metadata["name"],
                default_branch=metadata["default_branch"],
                webhook_secret=settings.GITHUB_WEBHOOK_SECRET,
                stdout=self.stdout,
            )
