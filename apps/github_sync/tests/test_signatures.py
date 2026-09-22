import hashlib
import hmac

from apps.github_sync.services.signatures import is_valid_github_signature


def test_accepts_valid_signature():
    body = b'{"event":"push"}'
    signature = "sha256=" + hmac.new(b"secret", body, hashlib.sha256).hexdigest()

    assert is_valid_github_signature(body, signature, "secret")


def test_rejects_invalid_signature():
    assert not is_valid_github_signature(b"payload", "sha256=invalid", "secret")
