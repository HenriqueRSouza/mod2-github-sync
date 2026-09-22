import base64
import os

import pytest

from apps.github_sync.services.crypto import decrypt_secret, encrypt_secret


@pytest.fixture(autouse=True)
def master_key(monkeypatch):
    monkeypatch.setenv("CREDENTIAL_MASTER_KEY", base64.urlsafe_b64encode(os.urandom(32)).decode())


def test_encrypts_and_decrypts_secret():
    encrypted = encrypt_secret("top-secret")

    assert b"top-secret" not in encrypted
    assert decrypt_secret(encrypted) == "top-secret"


def test_encryption_uses_random_nonce():
    assert encrypt_secret("same-value") != encrypt_secret("same-value")
