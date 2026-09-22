from fnmatch import fnmatch

from celery import shared_task
from django.conf import settings
from django.db import transaction
from django.utils import timezone
from django.utils.dateparse import parse_datetime

from .models import Branch, Commit, CommitFile, Contributor, ContributorEmail, PullRequest, WebhookDelivery


def _contributor(data):
    email = data.get("email")
    login = data.get("username") or data.get("login") or email or "unknown"
    contributor, _ = Contributor.objects.get_or_create(
        login=login,
        defaults={"display_name": data.get("name", ""), "is_bot": login.endswith("[bot]")},
    )
    if email:
        ContributorEmail.objects.get_or_create(email=email, defaults={"contributor": contributor})
    return contributor


def _process_push(delivery):
    payload = delivery.payload
    branch_name = payload.get("ref", "").removeprefix("refs/heads/")
    if any(fnmatch(branch_name, pattern) for pattern in settings.IGNORE_BRANCHES):
        return
    branch, _ = Branch.objects.get_or_create(repository=delivery.repository, name=branch_name)
    for item in payload.get("commits", []):
        author = _contributor(item.get("author") or {})
        commit, created = Commit.objects.update_or_create(
            repository=delivery.repository,
            sha=item["id"],
            defaults={
                "branch": branch,
                "author": author,
                "message": item.get("message", ""),
                "authored_at": parse_datetime(item["timestamp"]),
                "url": item.get("url", ""),
                "forced_push": payload.get("forced", False),
            },
        )
        if created:
            for change_type in CommitFile.ChangeType.values:
                CommitFile.objects.bulk_create(
                    [
                        CommitFile(commit=commit, path=path, change_type=change_type)
                        for path in item.get(change_type, [])
                    ],
                    ignore_conflicts=True,
                )


def _process_pull_request(delivery):
    item = delivery.payload["pull_request"]
    author = _contributor(item.get("user") or {})
    PullRequest.objects.update_or_create(
        repository=delivery.repository,
        number=item["number"],
        defaults={
            "author": author,
            "title": item["title"],
            "state": item["state"],
            "opened_at": parse_datetime(item["created_at"]),
            "closed_at": parse_datetime(item.get("closed_at") or ""),
            "merged_at": parse_datetime(item.get("merged_at") or ""),
            "updated_at": parse_datetime(item["updated_at"]),
        },
    )


@shared_task(bind=True, autoretry_for=(Exception,), retry_backoff=True, max_retries=3)
def process_webhook(self, delivery_pk):
    with transaction.atomic():
        delivery = WebhookDelivery.objects.select_for_update().select_related("repository").get(pk=delivery_pk)
        if delivery.status == WebhookDelivery.Status.PROCESSED:
            return
        delivery.status = WebhookDelivery.Status.PROCESSING
        delivery.attempts += 1
        delivery.save(update_fields=("status", "attempts"))
        try:
            if delivery.event == "push":
                _process_push(delivery)
            elif delivery.event == "pull_request":
                _process_pull_request(delivery)
            delivery.status = WebhookDelivery.Status.PROCESSED
            delivery.processed_at = timezone.now()
            delivery.error = ""
            delivery.save(update_fields=("status", "processed_at", "error"))
        except Exception as exc:
            delivery.status = WebhookDelivery.Status.FAILED
            delivery.error = str(exc)[:2000]
            delivery.save(update_fields=("status", "error"))
            raise
