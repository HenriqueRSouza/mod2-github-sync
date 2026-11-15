import base64

from apps.github_sync.services.health import crypto_check, readiness_report


def test_crypto_check_never_exposes_key(monkeypatch):
    monkeypatch.setenv("CREDENTIAL_MASTER_KEY", "invalid-secret-value")

    result = crypto_check()

    assert result == {"status": "down", "detail": "credential master key is missing or invalid"}
    assert "invalid-secret-value" not in str(result)


def test_eager_readiness_does_not_require_broker(monkeypatch, settings, db):
    settings.CELERY_TASK_ALWAYS_EAGER = True
    monkeypatch.setenv("CREDENTIAL_MASTER_KEY", base64.urlsafe_b64encode(b"0" * 32).decode())

    report = readiness_report()

    assert report["status"] == "ready"
    assert report["checks"]["schema"]["status"] == "up"
    assert report["checks"]["redis"]["status"] == "not_required"
    assert report["checks"]["worker"]["status"] == "not_required"
