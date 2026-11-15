import json
import logging

import pytest

from apps.github_sync.observability import JsonFormatter, correlation_id_var, redact_text, sanitize

pytestmark = pytest.mark.django_db


def test_json_formatter_adds_correlation_and_redacts_credentials():
    formatter = JsonFormatter()
    record = logging.LogRecord(
        "github_sync",
        logging.INFO,
        __file__,
        1,
        "request token=plain-secret",
        (),
        None,
    )
    record.authorization = "Bearer secret-token"
    record.payload = {"webhook_secret": "hook-secret", "repository_id": 42}
    token = correlation_id_var.set("request-123")
    try:
        payload = json.loads(formatter.format(record))
    finally:
        correlation_id_var.reset(token)

    serialized = json.dumps(payload)
    assert payload["correlation_id"] == "request-123"
    assert payload["payload"]["repository_id"] == 42
    assert "plain-secret" not in serialized
    assert "secret-token" not in serialized
    assert "hook-secret" not in serialized


def test_redaction_handles_nested_values_and_bearer_tokens():
    assert redact_text("Authorization: Bearer abc123") == "Authorization: Bearer <redacted>"
    assert sanitize({"token": "abc", "nested": [{"password": "xyz"}]}) == {
        "token": "<redacted>",
        "nested": [{"password": "<redacted>"}],
    }


def test_correlation_middleware_returns_request_id(client):
    response = client.get("/api/v1/health", HTTP_X_REQUEST_ID="trace-123")

    assert response.status_code == 200
    assert response.headers["X-Request-ID"] == "trace-123"
