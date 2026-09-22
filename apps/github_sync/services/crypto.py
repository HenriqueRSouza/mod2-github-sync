import base64
import os

from cryptography.hazmat.primitives.ciphers.aead import AESGCM


def _master_key() -> bytes:
    encoded = os.environ.get("CREDENTIAL_MASTER_KEY")
    if not encoded:
        raise RuntimeError("CREDENTIAL_MASTER_KEY must be supplied by the runtime secret manager")
    key = base64.urlsafe_b64decode(encoded)
    if len(key) != 32:
        raise RuntimeError("CREDENTIAL_MASTER_KEY must decode to exactly 32 bytes")
    return key


def encrypt_secret(value: str) -> bytes:
    nonce = os.urandom(12)
    ciphertext = AESGCM(_master_key()).encrypt(nonce, value.encode(), None)
    return nonce + ciphertext


def decrypt_secret(value: bytes) -> str:
    raw = bytes(value)
    return AESGCM(_master_key()).decrypt(raw[:12], raw[12:], None).decode()
