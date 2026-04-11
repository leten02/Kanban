"""Simple symmetric encryption for storing Google refresh tokens."""
import base64
import os

from cryptography.fernet import Fernet

from app.core.config import settings


def _get_fernet() -> Fernet:
    # Derive a 32-byte key from SECRET_KEY (url-safe base64 encoded)
    raw = settings.secret_key.encode()
    # Pad or truncate to 32 bytes, then base64-encode
    key = base64.urlsafe_b64encode(raw[:32].ljust(32, b"\x00"))
    return Fernet(key)


def encrypt(plaintext: str) -> str:
    return _get_fernet().encrypt(plaintext.encode()).decode()


def decrypt(ciphertext: str) -> str:
    return _get_fernet().decrypt(ciphertext.encode()).decode()
