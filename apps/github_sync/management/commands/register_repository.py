from django.core.management.base import BaseCommand

from apps.github_sync.models import Repository
from apps.github_sync.services.crypto import encrypt_secret


class Command(BaseCommand):
    help = "Register or update a GitHub repository and its encrypted webhook secret"

    def add_arguments(self, parser):
        parser.add_argument("--github-id", type=int, required=True)
        parser.add_argument("--owner", required=True)
        parser.add_argument("--name", required=True)
        parser.add_argument("--webhook-secret", required=True)
        parser.add_argument("--default-branch", default="main")

    def handle(self, *args, **options):
        repository, created = Repository.objects.update_or_create(
            github_id=options["github_id"],
            defaults={
                "owner": options["owner"],
                "name": options["name"],
                "default_branch": options["default_branch"],
                "webhook_secret": encrypt_secret(options["webhook_secret"]),
                "active": True,
            },
        )
        action = "Registered" if created else "Updated"
        self.stdout.write(self.style.SUCCESS(f"{action} {repository}"))
