"""Encrypt and decrypt sensitive short secrets stored in the database."""

from __future__ import annotations

from cryptography.fernet import Fernet, InvalidToken

from app.config import settings

_PREFIX = "fernet:"


def _load_fernet() -> Fernet:
    key = settings.google_token_encryption_key.strip()
    if not key:
        raise RuntimeError(
            "GOOGLE_TOKEN_ENCRYPTION_KEY is required to store or refresh Google OAuth credentials.",
        )
    return Fernet(key.encode("utf-8"))


def encrypt_secret(plaintext: str) -> str:
    if not plaintext:
        return plaintext
    if plaintext.startswith(_PREFIX):
        return plaintext
    token = _load_fernet().encrypt(plaintext.encode("utf-8")).decode("utf-8")
    return f"{_PREFIX}{token}"


def decrypt_secret(ciphertext: str | None) -> str | None:
    if ciphertext is None:
        return None
    if not ciphertext.startswith(_PREFIX):
        return ciphertext
    token = ciphertext[len(_PREFIX) :]
    try:
        return _load_fernet().decrypt(token.encode("utf-8")).decode("utf-8")
    except InvalidToken as exc:
        raise RuntimeError(
            "Stored Google OAuth credentials could not be decrypted. "
            "Check GOOGLE_TOKEN_ENCRYPTION_KEY and re-consent if needed.",
        ) from exc
