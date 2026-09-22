import time

import requests
from django.conf import settings


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
        if remaining == 0:
            reset_at = int(response.headers.get("X-RateLimit-Reset", "0"))
            time.sleep(max(0, reset_at - int(time.time())))
        response.raise_for_status()
        return response

    def handshake(self):
        response = self.get("/user")
        scopes = {scope.strip() for scope in response.headers.get("X-OAuth-Scopes", "").split(",") if scope.strip()}
        return response.json(), scopes
