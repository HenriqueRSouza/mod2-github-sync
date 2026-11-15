"""Outbound, opt-in notifications for the platform notification center.

The GitHub Sync module remains the source of Git facts.  Notifications are a
best-effort projection for Module 6, never part of a repository sync or webhook
transaction.  This keeps an unavailable notification center from degrading the
core integration.
"""

from __future__ import annotations

import logging
from typing import Any

import requests
from django.conf import settings

from apps.github_sync.models import Repository

logger = logging.getLogger(__name__)


def module6_notifications_enabled() -> bool:
    """Return whether the complete, explicitly enabled Module 6 contract exists."""
    return bool(
        settings.MODULE6_NOTIFICATIONS_ENABLED
        and settings.MODULE6_NOTIFICATIONS_URL
        and settings.MODULE6_INTEGRATION_KEY
    )


def module6_notification_payload(
    repository: Repository,
    *,
    event_id: str,
    notification_type: str,
    title: str,
    body: str,
    priority: str,
) -> dict[str, Any]:
    """Build the agreed Module 6 envelope without GitHub credentials or payloads."""
    project_id = str(repository.project_id) if repository.project_id else None
    return {
        "event_id": event_id,
        "scope": "project" if project_id else "global",
        "project_id": project_id,
        "source": "github",
        "type": notification_type,
        "title": title,
        "body": body,
        "priority": priority,
        "link": None,
    }


def post_module6_notification(payload: dict[str, Any]) -> bool:
    """Deliver an envelope to Module 6, returning False only when disabled.

    Request errors intentionally propagate to the Celery task, where transient
    failures can be retried without affecting M2's original operation.
    """
    if not module6_notifications_enabled():
        logger.debug("module6_notification_skipped", extra={"event_id": payload.get("event_id")})
        return False

    response = requests.post(
        settings.MODULE6_NOTIFICATIONS_URL,
        headers={
            "X-Integration-Key": settings.MODULE6_INTEGRATION_KEY,
            "Content-Type": "application/json",
        },
        json=payload,
        timeout=settings.MODULE6_NOTIFICATIONS_TIMEOUT,
    )
    response.raise_for_status()
    logger.info(
        "module6_notification_sent",
        extra={"event_id": payload["event_id"], "notification_type": payload["type"]},
    )
    return True
