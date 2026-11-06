from typing import Any

import requests
from django.conf import settings


class PlatformServiceError(RuntimeError):
    def __init__(self, status_code: int, detail: Any):
        super().__init__("Module 1 request failed")
        self.status_code = status_code
        self.detail = detail


def _response_data(response: requests.Response):
    try:
        return response.json()
    except ValueError:
        return {"detail": "O Módulo 1 retornou uma resposta inválida."}


def _request(method: str, url: str, *, token: str | None = None, **kwargs):
    headers = dict(kwargs.pop("headers", {}))
    if token:
        headers["Authorization"] = f"Bearer {token}"
    try:
        response = requests.request(
            method,
            url,
            headers=headers,
            timeout=settings.MODULE1_HTTP_TIMEOUT,
            **kwargs,
        )
    except requests.RequestException as exc:
        raise PlatformServiceError(503, {"detail": "O Módulo 1 está temporariamente indisponível."}) from exc
    data = _response_data(response)
    if response.status_code >= 400:
        raise PlatformServiceError(response.status_code, data)
    return data


def register_user(payload: dict):
    return _request("POST", f"{settings.MODULE1_AUTH_BASE_URL}/auth/register", json=payload)


def issue_token(username: str, password: str):
    return _request(
        "POST",
        f"{settings.MODULE1_AUTH_BASE_URL}/auth/token",
        data={"username": username, "password": password},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )


def current_user(token: str):
    return _request("GET", f"{settings.MODULE1_AUTH_BASE_URL}/auth/me", token=token)


def list_projects(token: str):
    return _request("GET", f"{settings.MODULE1_PROJECTS_BASE_URL}/projects", token=token)


def create_project(token: str, payload: dict):
    return _request("POST", f"{settings.MODULE1_PROJECTS_BASE_URL}/projects", token=token, json=payload)


def get_project(token: str, project_id):
    return _request("GET", f"{settings.MODULE1_PROJECTS_BASE_URL}/projects/{project_id}", token=token)
