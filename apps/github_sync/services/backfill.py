from datetime import timedelta

from django.utils import timezone
from django.utils.dateparse import parse_datetime

from ..models import Branch, Commit
from ..tasks import _contributor, save_pull_request

MAX_PAGES = 3


def _pages(client, path, params):
    for page in range(1, MAX_PAGES + 1):
        items = client.get(path, params={**params, "per_page": 100, "page": page}).json()
        yield from items
        if len(items) < 100:
            return


def backfill_repository(client, repository, days):
    """Importa da API do GitHub os commits da branch padrao e os PRs dos ultimos `days` dias."""
    since = timezone.now() - timedelta(days=days)
    base = f"/repos/{repository.owner}/{repository.name}"
    branch, _ = Branch.objects.get_or_create(repository=repository, name=repository.default_branch)

    commits = 0
    for item in _pages(client, f"{base}/commits", {"sha": repository.default_branch, "since": since.isoformat()}):
        git_author = item["commit"].get("author") or {}
        author = _contributor({**git_author, "username": (item.get("author") or {}).get("login")})
        Commit.objects.update_or_create(
            repository=repository,
            sha=item["sha"],
            defaults={
                "branch": branch,
                "author": author,
                "message": item["commit"].get("message", ""),
                "authored_at": parse_datetime(git_author["date"]),
                "url": item.get("html_url", ""),
            },
        )
        commits += 1

    pulls = 0
    params = {"state": "all", "sort": "updated", "direction": "desc"}
    for item in _pages(client, f"{base}/pulls", params):
        if parse_datetime(item["updated_at"]) < since:
            break
        save_pull_request(repository, item)
        pulls += 1
    return commits, pulls
