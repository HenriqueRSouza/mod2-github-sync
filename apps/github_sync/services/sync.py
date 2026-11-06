from django.conf import settings
from django.db import transaction
from django.utils import timezone
from django.utils.dateparse import parse_datetime

from apps.github_sync.models import Branch, Commit, CommitFile, Contributor, ContributorEmail, PullRequest, Repository
from apps.github_sync.services.github import GitHubClient


def _contributor(data: dict) -> Contributor:
    github_id = data.get("id")
    login = data.get("login") or data.get("name") or data.get("email") or "unknown"
    display_name = data.get("name") or login
    defaults = {"login": login, "display_name": display_name, "is_bot": login.endswith("[bot]")}
    if github_id:
        contributor = Contributor.objects.filter(github_id=github_id).first()
        if contributor is None:
            contributor = Contributor.objects.filter(login=login, github_id__isnull=True).first()
        if contributor is None:
            contributor = Contributor.objects.create(github_id=github_id, **defaults)
        else:
            contributor.github_id = github_id
            contributor.login = login
            contributor.display_name = display_name
            contributor.is_bot = defaults["is_bot"]
            contributor.save(update_fields=("github_id", "login", "display_name", "is_bot"))
    else:
        contributor, _ = Contributor.objects.get_or_create(login=login, defaults=defaults)
    email = data.get("email")
    if email:
        ContributorEmail.objects.get_or_create(email=email, defaults={"contributor": contributor})
    return contributor


def _commit_files(detail: dict) -> list[tuple[str, str]]:
    status_map = {
        "added": CommitFile.ChangeType.ADDED,
        "removed": CommitFile.ChangeType.REMOVED,
    }
    return [
        (item["filename"], status_map.get(item.get("status"), CommitFile.ChangeType.MODIFIED))
        for item in detail.get("files") or []
        if item.get("filename")
    ]


def sync_repository_from_github(repository: Repository, token: str = None) -> int:
    """Sincroniza metadados e commits reais de um repositório via API oficial do GitHub (M2-111 / M2-114)."""
    client = GitHubClient(token=token)
    repo_data = client.get_repository(repository.owner, repository.name)

    default_branch_name = repo_data.get("default_branch") or repository.default_branch or "main"
    fields_to_update = []
    if repository.default_branch != default_branch_name:
        repository.default_branch = default_branch_name
        fields_to_update.append("default_branch")
    if "id" in repo_data and repository.github_id != repo_data["id"]:
        repository.github_id = repo_data["id"]
        fields_to_update.append("github_id")

    if fields_to_update:
        repository.save(update_fields=fields_to_update)

    latest_authored_at = (
        Commit.objects.filter(repository=repository)
        .order_by("-authored_at")
        .values_list("authored_at", flat=True)
        .first()
    )
    since = latest_authored_at.isoformat() if latest_authored_at else None
    branches_data = client.get_branches(repository.owner, repository.name, per_page=100)
    pull_requests_data = client.get_pull_requests(repository.owner, repository.name, per_page=100)
    commits_data = client.get_commits(repository.owner, repository.name, since=since, per_page=100)
    detail_limit = max(0, getattr(settings, "GITHUB_COMMIT_DETAILS_LIMIT", 50))
    commit_details = {
        item["sha"]: client.get_commit(repository.owner, repository.name, item["sha"])
        for item in commits_data[:detail_limit]
        if item.get("sha")
    }
    synced_count = 0

    with transaction.atomic():
        active_branch_names = {item.get("name") for item in branches_data if item.get("name")}
        active_branch_names.add(default_branch_name)
        existing_branches = {
            branch.name: branch for branch in Branch.objects.filter(repository=repository)
        }
        for branch_name in active_branch_names:
            branch = existing_branches.get(branch_name)
            if branch:
                if branch.deleted_at is not None:
                    branch.deleted_at = None
                    branch.save(update_fields=("deleted_at",))
            else:
                existing_branches[branch_name] = Branch.objects.create(repository=repository, name=branch_name)
        # A listagem é limitada a 200 itens. Só marcamos ausentes como removidos
        # quando a resposta prova que a enumeração foi exaustiva.
        if len(branches_data) < 200:
            Branch.objects.filter(repository=repository, deleted_at__isnull=True).exclude(
                name__in=active_branch_names
            ).update(deleted_at=timezone.now())
        default_branch = existing_branches[default_branch_name]

        for item in commits_data:
            commit_info = item.get("commit") or {}
            author_info = commit_info.get("author") or {}
            gh_author = item.get("author") or {}
            contributor = _contributor({**author_info, **gh_author})

            authored_at = parse_datetime(author_info.get("date") or "")
            sha = item.get("sha")
            if not sha or not authored_at:
                continue

            url = item.get("html_url") or f"https://github.com/{repository.owner}/{repository.name}/commit/{sha}"

            commit, _ = Commit.objects.update_or_create(
                repository=repository,
                sha=sha,
                defaults={
                    "branch": default_branch,
                    "author": contributor,
                    "message": commit_info.get("message", ""),
                    "authored_at": authored_at,
                    "url": url,
                    "forced_push": False,
                },
            )
            if sha in commit_details:
                commit.files.all().delete()
                CommitFile.objects.bulk_create(
                    [
                        CommitFile(commit=commit, path=path, change_type=change_type)
                        for path, change_type in _commit_files(commit_details[sha])
                    ]
                )
            synced_count += 1

        for item in pull_requests_data:
            number = item.get("number")
            opened_at = parse_datetime(item.get("created_at") or "")
            updated_at = parse_datetime(item.get("updated_at") or "")
            if not number or not opened_at or not updated_at:
                continue
            author = _contributor(item.get("user") or {})
            PullRequest.objects.update_or_create(
                repository=repository,
                number=number,
                defaults={
                    "author": author,
                    "title": item.get("title", ""),
                    "state": item.get("state", "open"),
                    "opened_at": opened_at,
                    "closed_at": parse_datetime(item.get("closed_at") or ""),
                    "merged_at": parse_datetime(item.get("merged_at") or ""),
                    "updated_at": updated_at,
                },
            )

    return synced_count
