from celery import current_app
from django.conf import settings
from django.db import connection
from redis import Redis

from .crypto import validate_master_key


def _result(status: str, detail: str | None = None) -> dict:
    value = {"status": status}
    if detail:
        value["detail"] = detail
    return value


def database_check() -> dict:
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            cursor.fetchone()
    except Exception:
        return _result("down", "database query failed")
    return _result("up")


def schema_check() -> dict:
    """Confirma as colunas usadas pelo escopo de projeto antes de declarar prontidão."""
    try:
        table = "github_sync_repository"
        if table not in connection.introspection.table_names():
            return _result("down", "repository schema migration is pending")
        with connection.cursor() as cursor:
            columns = {column.name for column in connection.introspection.get_table_description(cursor, table)}
    except Exception:
        return _result("down", "database schema inspection failed")

    required = {"project_id", "platform_user_id"}
    if not required.issubset(columns):
        return _result("down", "repository schema migration is pending")
    return _result("up")


def redis_check() -> dict:
    if settings.CELERY_TASK_ALWAYS_EAGER:
        return _result("not_required", "tasks run eagerly in this environment")
    try:
        Redis.from_url(settings.REDIS_URL, socket_connect_timeout=1, socket_timeout=1).ping()
    except Exception:
        return _result("down", "redis ping failed")
    return _result("up")


def worker_check() -> dict:
    if settings.CELERY_TASK_ALWAYS_EAGER:
        return _result("not_required", "tasks run eagerly in this environment")
    try:
        replies = current_app.control.inspect(timeout=1).ping() or {}
    except Exception:
        return _result("down", "worker inspection failed")
    if not replies:
        return _result("down", "no Celery worker replied")
    return _result("up", f"{len(replies)} worker(s) replied")


def crypto_check() -> dict:
    try:
        validate_master_key()
    except RuntimeError:
        return _result("down", "credential master key is missing or invalid")
    return _result("up")


def readiness_report() -> dict:
    checks = {
        "database": database_check(),
        "schema": schema_check(),
        "redis": redis_check(),
        "worker": worker_check(),
        "crypto": crypto_check(),
    }
    ready = all(check["status"] in {"up", "not_required"} for check in checks.values())
    return {"status": "ready" if ready else "not_ready", "checks": checks}
