import logging
import random
from fnmatch import fnmatch

import requests
from celery import shared_task
from django.conf import settings
from django.db import InterfaceError, OperationalError, transaction
from django.utils import timezone
from django.utils.dateparse import parse_datetime

from .models import Branch, Commit, CommitFile, Contributor, ContributorEmail, PullRequest, WebhookDelivery
from .observability import correlation_context, redact_text

logger = logging.getLogger(__name__)


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
        commit, _ = Commit.objects.update_or_create(
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
        if any(change_type in item for change_type in CommitFile.ChangeType.values):
            commit.files.all().delete()
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


def _is_transient(exc: Exception) -> bool:
    return isinstance(exc, (OperationalError, InterfaceError, requests.Timeout, requests.ConnectionError))


def _retry_countdown(retries: int) -> float:
    # Jitter não participa de nenhuma decisão criptográfica; apenas dispersa retries.
    return min(60.0, (2**retries) + random.uniform(0, 1))  # nosec B311


@shared_task(bind=True, max_retries=3)
def process_webhook(self, delivery_pk):
    delivery = WebhookDelivery.objects.select_related("repository").get(pk=delivery_pk)
    with correlation_context(str(delivery.delivery_id)):
        return _process_webhook_delivery(self, delivery_pk)


def _process_webhook_delivery(task, delivery_pk):
    with transaction.atomic():
        delivery = WebhookDelivery.objects.select_for_update().select_related("repository").get(pk=delivery_pk)
        if delivery.status == WebhookDelivery.Status.PROCESSED:
            logger.info("webhook_delivery_already_processed", extra={"delivery_id": str(delivery.delivery_id)})
            return "already_processed"
        delivery.status = WebhookDelivery.Status.PROCESSING
        delivery.attempts += 1
        delivery.save(update_fields=("status", "attempts"))

    logger.info(
        "webhook_delivery_processing",
        extra={
            "delivery_id": str(delivery.delivery_id),
            "repository_id": delivery.repository_id,
            "event": delivery.event,
            "attempt": delivery.attempts,
        },
    )
    try:
        with transaction.atomic():
            delivery = WebhookDelivery.objects.select_for_update().select_related("repository").get(pk=delivery_pk)
            if delivery.event == "push":
                _process_push(delivery)
            elif delivery.event == "pull_request":
                _process_pull_request(delivery)
            delivery.status = WebhookDelivery.Status.PROCESSED
            delivery.processed_at = timezone.now()
            delivery.error = ""
            delivery.save(update_fields=("status", "processed_at", "error"))
        logger.info("webhook_delivery_processed", extra={"delivery_id": str(delivery.delivery_id)})
        return "processed"
    except Exception as exc:
        safe_error = redact_text(f"{type(exc).__name__}: {exc}")[:2000]
        WebhookDelivery.objects.filter(pk=delivery_pk).update(
            status=WebhookDelivery.Status.FAILED,
            error=safe_error,
            processed_at=None,
        )
        logger.exception(
            "webhook_delivery_failed",
            extra={
                "delivery_id": str(delivery.delivery_id),
                "repository_id": delivery.repository_id,
                "attempt": delivery.attempts,
                "transient": _is_transient(exc),
            },
        )
        if _is_transient(exc) and task.request.retries < task.max_retries:
            countdown = _retry_countdown(task.request.retries)
            logger.warning(
                "webhook_delivery_retry_scheduled",
                extra={"delivery_id": str(delivery.delivery_id), "countdown_seconds": round(countdown, 3)},
            )
            raise task.retry(exc=exc, countdown=countdown) from exc
        raise
