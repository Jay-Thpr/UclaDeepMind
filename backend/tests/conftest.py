from __future__ import annotations

from pathlib import Path

import pytest
from cryptography.fernet import Fernet
from fastapi.testclient import TestClient
from sqlmodel import Session

from app.config import settings
from app.database import get_engine
from app.main import app


@pytest.fixture
def test_settings(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> str:
    db_path = tmp_path / "test.db"
    encryption_key = Fernet.generate_key().decode("utf-8")
    monkeypatch.setattr(settings, "database_url", f"sqlite:///{db_path}")
    monkeypatch.setattr(settings, "google_token_encryption_key", encryption_key)
    monkeypatch.setattr(settings, "google_client_id", "client-id")
    monkeypatch.setattr(settings, "google_client_secret", "client-secret")
    monkeypatch.setattr(settings, "google_redirect_uri", "http://testserver/auth/callback")
    monkeypatch.setattr(settings, "gemini_api_key", "test-gemini-key")
    monkeypatch.setattr(settings, "cookie_secure", False)
    monkeypatch.setattr(settings, "google_docs_service_account_json", "")
    monkeypatch.setattr(settings, "google_docs_export_folder_id", "")
    return encryption_key


@pytest.fixture
def client(test_settings: str, monkeypatch: pytest.MonkeyPatch) -> TestClient:
    import app.database as database_module

    monkeypatch.setattr(database_module, "_engine", None, raising=False)
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def db_session(client: TestClient) -> Session:
    with Session(get_engine()) as session:
        yield session
