import uuid
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.github_sync.models import (
    Branch,
    Commit,
    CommitFile,
    Contributor,
    ContributorEmail,
    PullRequest,
    Repository,
    WebhookDelivery,
)
from apps.github_sync.services.crypto import encrypt_secret


class Command(BaseCommand):
    help = "Popula dados de demonstracao do Modulo 2 para o MVP e gravacao de video"

    def handle(self, *args, **options):
        now = timezone.now()

        repo, _ = Repository.objects.update_or_create(
            github_id=10402800,
            defaults={
                "owner": "EduardoFdeM",
                "name": "ai-platform-github-service",
                "default_branch": "main",
                "webhook_secret": encrypt_secret("mackenzie-secret-2026"),
                "active": True,
            },
        )

        eduardo, _ = Contributor.objects.update_or_create(
            login="EduardoFdeM",
            defaults={"display_name": "Eduardo Ferreira de Mattos", "is_bot": False},
        )
        ContributorEmail.objects.get_or_create(email="eduardo@mackenzie.br", defaults={"contributor": eduardo})

        henrique, _ = Contributor.objects.update_or_create(
            login="HenriqueRSouza",
            defaults={"display_name": "Henrique Ribeiro", "is_bot": False},
        )
        ContributorEmail.objects.get_or_create(email="henrique@mackenzie.br", defaults={"contributor": henrique})

        pedro, _ = Contributor.objects.update_or_create(
            login="PedroCavalcante",
            defaults={"display_name": "Pedro Cavalcante", "is_bot": False},
        )
        ContributorEmail.objects.get_or_create(email="pedro@mackenzie.br", defaults={"contributor": pedro})

        main_branch, _ = Branch.objects.get_or_create(repository=repo, name="main")
        feat_branch, _ = Branch.objects.get_or_create(repository=repo, name="feat/dashboard-mvp")

        sample_commits = [
            (
                "d5cc548" + "0" * 33,
                henrique,
                main_branch,
                "feat(sync): absorver backend e infraestrutura do modulo 2",
                now - timedelta(hours=5),
                [("apps/github_sync/views.py", "added"), ("compose.yaml", "added")],
            ),
            (
                "31241f6" + "0" * 33,
                eduardo,
                main_branch,
                "docs(ap1): atualizar notas do orador, navegacao e perfis da apresentacao",
                now - timedelta(hours=3),
                [("output/speaker-notes.md", "modified")],
            ),
            (
                "7fde0cb" + "0" * 33,
                pedro,
                feat_branch,
                "feat(auth): configurar handshake e validacao de tokens PAT",
                now - timedelta(hours=1),
                [("apps/github_sync/services/github.py", "added")],
            ),
            (
                "a1b2c3d" + "0" * 33,
                eduardo,
                main_branch,
                "feat(ui): implementar dashboard interativo do MVP com tokens de design",
                now - timedelta(minutes=20),
                [("frontend/src/App.tsx", "added"), ("tokens.css", "added")],
            ),
        ]

        for sha, author, branch, msg, authored_at, files in sample_commits:
            commit, created = Commit.objects.update_or_create(
                repository=repo,
                sha=sha,
                defaults={
                    "author": author,
                    "branch": branch,
                    "message": msg,
                    "authored_at": authored_at,
                    "url": f"https://github.com/EduardoFdeM/ai-platform-github-service/commit/{sha[:7]}",
                },
            )
            if created:
                for path, change in files:
                    CommitFile.objects.get_or_create(commit=commit, path=path, defaults={"change_type": change})

        PullRequest.objects.update_or_create(
            repository=repo,
            number=1,
            defaults={
                "author": henrique,
                "title": "feat: bootstrap do microsservico de sincronizacao",
                "state": "closed",
                "opened_at": now - timedelta(days=2),
                "closed_at": now - timedelta(hours=12),
                "merged_at": now - timedelta(hours=12),
                "updated_at": now - timedelta(hours=12),
            },
        )

        PullRequest.objects.update_or_create(
            repository=repo,
            number=2,
            defaults={
                "author": eduardo,
                "title": "feat: dashboard do MVP com design system e simulador E2E",
                "state": "open",
                "opened_at": now - timedelta(hours=4),
                "updated_at": now - timedelta(minutes=15),
            },
        )

        WebhookDelivery.objects.get_or_create(
            delivery_id=uuid.UUID("11111111-2222-3333-4444-555555555555"),
            defaults={
                "repository": repo,
                "event": "push",
                "status": WebhookDelivery.Status.PROCESSED,
                "attempts": 1,
                "payload": {
                    "ref": "refs/heads/main",
                    "commits": [{"id": sample_commits[0][0], "message": sample_commits[0][3]}],
                },
                "processed_at": now - timedelta(hours=4, minutes=58),
            },
        )

        self.stdout.write(
            self.style.SUCCESS(
                f"Dados de demonstracao populados com sucesso para o repositorio {repo} "
                "(secret: mackenzie-secret-2026)."
            )
        )
