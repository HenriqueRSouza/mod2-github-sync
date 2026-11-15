from django.db import transaction
from django.utils import timezone

from ..models import CredentialAuditEvent, Repository
from .crypto import encrypt_secret


@transaction.atomic
def store_repository_credential(
    repo_data: dict,
    raw_secret: str,
    expires_at,
    actor: str,
    *,
    project_id=None,
    platform_user_id=None,
) -> tuple[Repository, bool]:
    repository = Repository.objects.select_for_update().filter(github_id=repo_data["id"]).first()
    created = repository is None
    if created:
        repository = Repository(github_id=repo_data["id"], webhook_secret_version=1)
        action = CredentialAuditEvent.Action.CREATED
    else:
        if platform_user_id and repository.platform_user_id and repository.platform_user_id != platform_user_id:
            raise PermissionError("repository belongs to another platform user")
        if project_id and repository.project_id and repository.project_id != project_id:
            raise PermissionError("repository belongs to another platform project")
        repository.webhook_secret_version += 1
        action = CredentialAuditEvent.Action.ROTATED

    repository.owner = repo_data["owner"]["login"]
    repository.name = repo_data["name"]
    repository.default_branch = repo_data.get("default_branch", "main")
    repository.webhook_secret = encrypt_secret(raw_secret)
    repository.webhook_secret_rotated_at = timezone.now()
    repository.webhook_secret_expires_at = expires_at
    repository.active = True
    if project_id:
        repository.project_id = project_id
    if platform_user_id:
        repository.platform_user_id = platform_user_id
    repository.save()

    CredentialAuditEvent.objects.create(
        repository=repository,
        action=action,
        version=repository.webhook_secret_version,
        actor=actor[:255],
        metadata={"credential": "webhook_secret", "expires": expires_at.isoformat() if expires_at else None},
    )
    return repository, created
