from unittest.mock import Mock, patch

import pytest
import requests

from apps.github_sync.services.platform import PlatformServiceError, _request


def test_platform_request_uses_split_connect_and_read_timeout(settings):
    settings.MODULE1_HTTP_TIMEOUT = (5, 45)
    response = Mock(status_code=200)
    response.json.return_value = {"ok": True}

    with patch("apps.github_sync.services.platform.requests.request", return_value=response) as request:
        result = _request("GET", "https://module-1.example/projects", token="token-value")

    assert result == {"ok": True}
    request.assert_called_once_with(
        "GET",
        "https://module-1.example/projects",
        headers={"Authorization": "Bearer token-value"},
        timeout=(5, 45),
    )


def test_platform_request_preserves_upstream_status_and_detail(settings):
    settings.MODULE1_HTTP_TIMEOUT = (5, 45)
    response = Mock(status_code=403)
    response.json.return_value = {"detail": "forbidden"}

    with (
        patch("apps.github_sync.services.platform.requests.request", return_value=response),
        pytest.raises(PlatformServiceError) as error,
    ):
        _request("GET", "https://module-1.example/projects")

    assert error.value.status_code == 403
    assert error.value.detail == {"detail": "forbidden"}


def test_platform_request_maps_network_failure_to_service_unavailable(settings):
    settings.MODULE1_HTTP_TIMEOUT = (5, 45)

    with (
        patch(
            "apps.github_sync.services.platform.requests.request",
            side_effect=requests.ConnectTimeout("offline"),
        ),
        pytest.raises(PlatformServiceError) as error,
    ):
        _request("GET", "https://module-1.example/projects")

    assert error.value.status_code == 503
    assert error.value.detail == {"detail": "O Módulo 1 está temporariamente indisponível."}
