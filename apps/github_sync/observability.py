import json
import logging
import re
import uuid
from contextlib import contextmanager
from contextvars import ContextVar
from datetime import UTC, datetime

correlation_id_var: ContextVar[str] = ContextVar("correlation_id", default="")

_SENSITIVE_KEYS = {
    "authorization",
    "cookie",
    "password",
    "secret",
    "signature",
    "token",
    "webhook_secret",
}
_STANDARD_LOG_RECORD_KEYS = set(logging.makeLogRecord({}).__dict__)
_BEARER_PATTERN = re.compile(r"(?i)(bearer\s+)[^\s,;]+")
_CREDENTIAL_PATTERN = re.compile(
    r"(?i)((?:token|secret|password|authorization|signature)\s*[=:]\s*)(?!bearer\b)[^\s,;]+"
)


def redact_text(value: str) -> str:
    def replace(match: re.Match) -> str:
        prefix = match.group(1) or ""
        return f"{prefix}<redacted>"

    return _CREDENTIAL_PATTERN.sub(replace, _BEARER_PATTERN.sub(replace, value))


def sanitize(value, key: str | None = None):
    if key and key.lower() in _SENSITIVE_KEYS:
        return "<redacted>"
    if isinstance(value, dict):
        return {str(item_key): sanitize(item_value, str(item_key)) for item_key, item_value in value.items()}
    if isinstance(value, (list, tuple, set)):
        return [sanitize(item) for item in value]
    if isinstance(value, str):
        return redact_text(value)
    if value is None or isinstance(value, (bool, int, float)):
        return value
    return redact_text(str(value))


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload = {
            "timestamp": datetime.fromtimestamp(record.created, tz=UTC).isoformat(),
            "level": record.levelname.lower(),
            "logger": record.name,
            "message": redact_text(record.getMessage()),
            "correlation_id": correlation_id_var.get() or None,
        }
        extras = {
            key: value
            for key, value in record.__dict__.items()
            if key not in _STANDARD_LOG_RECORD_KEYS and not key.startswith("_")
        }
        payload.update(sanitize(extras))
        if record.exc_info:
            payload["exception"] = redact_text(self.formatException(record.exc_info))
        return json.dumps(payload, ensure_ascii=False, default=str)


class CorrelationIdMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        requested_id = request.headers.get("X-Request-ID", "")
        correlation_id = requested_id if re.fullmatch(r"[A-Za-z0-9._-]{1,128}", requested_id) else str(uuid.uuid4())
        token = correlation_id_var.set(correlation_id)
        try:
            response = self.get_response(request)
            response["X-Request-ID"] = correlation_id
            return response
        finally:
            correlation_id_var.reset(token)


@contextmanager
def correlation_context(correlation_id: str):
    token = correlation_id_var.set(correlation_id)
    try:
        yield
    finally:
        correlation_id_var.reset(token)
