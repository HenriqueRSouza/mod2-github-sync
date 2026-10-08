from datetime import timedelta

from django.conf import settings
from django.db.models import Max, Q
from django.utils import timezone

from .models import Commit, PullRequest, Repository, WebhookDelivery


def dashboard_summary(repository, days=7):
    now = timezone.now()
    since = now - timedelta(days=days)
    deadline = timedelta(hours=getattr(settings, "DELIVERY_SLA_HOURS", 72))
    commits = Commit.objects.filter(repository=repository, authored_at__gte=since, authored_at__lte=now)
    pushes = WebhookDelivery.objects.filter(
        repository=repository,
        event="push",
        status=WebhookDelivery.Status.PROCESSED,
        received_at__gte=since,
        received_at__lte=now,
    )
    opened = PullRequest.objects.filter(repository=repository, opened_at__gte=since, opened_at__lte=now)
    merged = PullRequest.objects.filter(repository=repository, merged_at__gte=since, merged_at__lte=now)
    open_prs = PullRequest.objects.filter(repository=repository, state="open")

    # PRs merged during the window form the SLA cohort, even if opened earlier.
    durations = [(pr.merged_at - pr.opened_at) for pr in merged.only("opened_at", "merged_at")]
    on_time = sum(duration <= deadline for duration in durations)
    overdue_open = open_prs.filter(opened_at__lt=now - deadline).count()
    sorted_hours = sorted(duration.total_seconds() / 3600 for duration in durations)
    middle = len(sorted_hours) // 2
    median_hours = None
    if sorted_hours:
        median_hours = round(
            sorted_hours[middle] if len(sorted_hours) % 2 else (sorted_hours[middle - 1] + sorted_hours[middle]) / 2,
            1,
        )

    deliveries = WebhookDelivery.objects.filter(repository=repository)
    recent = []
    for commit in commits.select_related("author").order_by("-authored_at")[:8]:
        recent.append(
            {
                "kind": "Commit",
                "title": commit.message.splitlines()[0][:100] if commit.message else commit.sha[:7],
                "detail": commit.author.login if commit.author else "Autor desconhecido",
                "at": commit.authored_at,
                "url": commit.url,
            }
        )
    for push in pushes.order_by("-received_at")[:8]:
        ref = push.payload.get("ref", "").removeprefix("refs/heads/") or "branch desconhecida"
        recent.append(
            {
                "kind": "Push",
                "title": f"Push em {ref}",
                "detail": f"{len(push.payload.get('commits') or [])} commits no evento",
                "at": push.received_at,
                "url": push.payload.get("compare", ""),
            }
        )
    for pr in PullRequest.objects.filter(repository=repository).filter(
        Q(opened_at__gte=since, opened_at__lte=now) | Q(updated_at__gte=since, updated_at__lte=now)
    ).order_by("-updated_at")[:8]:
        recent.append(
            {
                "kind": "PR",
                "title": f"#{pr.number} {pr.title}",
                "detail": "Mergeado" if pr.merged_at else "Aberto" if pr.state == "open" else "Fechado",
                "at": pr.updated_at,
                "url": f"https://github.com/{repository.owner}/{repository.name}/pull/{pr.number}",
            }
        )
    recent.sort(key=lambda item: item["at"], reverse=True)

    last_processed = deliveries.filter(status=WebhookDelivery.Status.PROCESSED).aggregate(
        last=Max("processed_at")
    )["last"]
    completed = deliveries.filter(
        received_at__gte=since,
        received_at__lte=now,
        event__in=("push", "pull_request"),
        status=WebhookDelivery.Status.PROCESSED,
    ).only("received_at", "processed_at")
    processing_times = [d.processed_at - d.received_at for d in completed if d.processed_at]

    return {
        "repository": {"id": repository.id, "name": str(repository)},
        "period_days": days,
        "since": since,
        "until": now,
        "total_commits": commits.count(),
        "total_pushes": pushes.count(),
        "prs_opened": opened.count(),
        "prs_merged": len(durations),
        "prs_open": open_prs.count(),
        "prs_overdue": overdue_open,
        "sla_hours": deadline.total_seconds() // 3600,
        "sla_on_time": on_time,
        "sla_percent": round(on_time / len(durations) * 100) if durations else None,
        "median_merge_hours": median_hours,
        "last_processed_at": last_processed,
        "processing_within_2m_percent": (
            round(sum(duration <= timedelta(minutes=2) for duration in processing_times) / len(processing_times) * 100)
            if processing_times
            else None
        ),
        "failed_deliveries": deliveries.filter(received_at__gte=since, status=WebhookDelivery.Status.FAILED).count(),
        "recent": recent[:10],
    }


def dashboard_repository(repository_id):
    repositories = Repository.objects.filter(active=True).order_by("owner", "name")
    if repository_id is None:
        preferred = getattr(settings, "DASHBOARD_DEFAULT_REPOSITORY", "")
        if "/" in preferred:
            owner, name = preferred.split("/", 1)
            selected = repositories.filter(owner=owner, name=name).first()
            if selected:
                return selected, repositories
        return repositories.first(), repositories
    return repositories.get(pk=repository_id), repositories
