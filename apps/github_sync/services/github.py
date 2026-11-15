import time
from urllib.parse import quote

import requests
from django.conf import settings


class GitHubRateLimitError(requests.HTTPError):
    def __init__(self, response, retry_after: int):
        super().__init__(f"GitHub rate limit exceeded; retry after {retry_after}s", response=response)
        self.retry_after = retry_after


class GitHubClient:
    def __init__(self, token=None):
        self.session = requests.Session()
        self.session.headers.update({"Accept": "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28"})
        if token:
            self.session.headers["Authorization"] = f"Bearer {token}"

    def get(self, path, params=None):
        response = self.session.get(
            f"{settings.GITHUB_API_URL.rstrip('/')}/{path.lstrip('/')}",
            params=params,
            timeout=settings.GITHUB_HTTP_TIMEOUT,
            verify=settings.GITHUB_CA_BUNDLE,
        )
        remaining = int(response.headers.get("X-RateLimit-Remaining", "1"))
        try:
            response_message = str(response.json().get("message", "")).lower()
        except (ValueError, AttributeError):
            response_message = ""
        is_rate_limited = response.status_code == 429 or (
            response.status_code == 403 and (remaining == 0 or "rate limit" in response_message)
        )
        if is_rate_limited:
            reset_at = int(response.headers.get("X-RateLimit-Reset", "0") or 0)
            retry_after = int(response.headers.get("Retry-After", "0") or 0)
            if not retry_after and reset_at:
                retry_after = max(0, reset_at - int(time.time()))
            retry_after = max(0, min(retry_after, settings.GITHUB_MAX_RETRY_AFTER))
            raise GitHubRateLimitError(response, retry_after)
        response.raise_for_status()
        return response

    def handshake(self):
        response = self.get("/user")
        scopes = {scope.strip() for scope in response.headers.get("X-OAuth-Scopes", "").split(",") if scope.strip()}
        return response.json(), scopes

    def get_repository(self, owner: str, name: str) -> dict:
        return self.get(f"/repos/{owner}/{name}").json()

    def get_paginated(self, path: str, params: dict | None = None, per_page: int = 100, limit: int = 200) -> list:
        items_found = []
        page = 1
        while True:
            page_params = {**(params or {}), "per_page": per_page, "page": page}
            response = self.get(path, params=page_params)
            items = response.json()
            if not items or not isinstance(items, list):
                break
            items_found.extend(items)
            if len(items) < per_page or len(items_found) >= limit:
                break
            page += 1
        return items_found[:limit]

    def get_commits(self, owner: str, name: str, since: str = None, per_page: int = 100) -> list:
        params = {}
        if since:
            params["since"] = since
        return self.get_paginated(f"/repos/{owner}/{name}/commits", params=params, per_page=per_page)

    def get_branches(self, owner: str, name: str, per_page: int = 100) -> list:
        return self.get_paginated(f"/repos/{owner}/{name}/branches", per_page=per_page)

    def get_pull_requests(self, owner: str, name: str, per_page: int = 100) -> list:
        return self.get_paginated(
            f"/repos/{owner}/{name}/pulls",
            params={"state": "all", "sort": "updated", "direction": "desc"},
            per_page=per_page,
        )

    def get_commit(self, owner: str, name: str, sha: str) -> dict:
        return self.get(f"/repos/{owner}/{name}/commits/{sha}").json()

    def get_content(self, owner: str, name: str, path: str, ref: str | None = None) -> dict:
        encoded_path = quote(path.strip("/"), safe="/")
        params = {"ref": ref} if ref else None
        return self.get(f"/repos/{owner}/{name}/contents/{encoded_path}", params=params).json()
