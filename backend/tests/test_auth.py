from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest
from sqlmodel import select

from app.deps import SESSION_COOKIE
from app.db_models import GoogleOAuthCredential, Skill
from app.security import create_session_token
from app.services.google_oauth import get_valid_access_token
from app.services.secret_crypto import decrypt_secret, encrypt_secret


def _session_cookie_for(sub: str, email: str = "learner@example.com") -> str:
    return create_session_token(
        subject=sub,
        email=email,
        name="Learner",
        picture=None,
        secret="dev-only-change-jwt-secret",
    )


def test_auth_me_returns_unauthenticated_without_cookie(client) -> None:
    res = client.get("/api/auth/me")
    assert res.status_code == 200
    assert res.json() == {"authenticated": False}


def test_auth_me_includes_google_integration(client, db_session) -> None:
    user_sub = "google-user-1"
    db_session.add(
        GoogleOAuthCredential(
            user_sub=user_sub,
            provider="google",
            access_token=encrypt_secret("access-token"),
            refresh_token=encrypt_secret("refresh-token"),
            scope=(
                "openid email profile "
                "https://www.googleapis.com/auth/photoslibrary.appendonly "
                "https://www.googleapis.com/auth/photoslibrary.readonly.appcreateddata"
            ),
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=30),
        ),
    )
    db_session.commit()
    client.cookies.set(SESSION_COOKIE, _session_cookie_for(user_sub))

    res = client.get("/api/auth/me")
    assert res.status_code == 200
    body = res.json()
    assert body["authenticated"] is True
    assert body["user"]["id"] == user_sub
    assert body["googleIntegration"]["connected"] is True
    assert body["googleIntegration"]["hasRefreshToken"] is True
    assert body["googleIntegration"]["photosAppendOnlyGranted"] is True
    assert body["googleIntegration"]["photosAppReadGranted"] is True


def test_google_disconnect_removes_stored_credential_only(client, db_session) -> None:
    user_sub = "google-user-2"
    db_session.add(
        Skill(
            user_sub=user_sub,
            title="Keep me",
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        ),
    )
    db_session.add(
        GoogleOAuthCredential(
            user_sub=user_sub,
            provider="google",
            access_token=encrypt_secret("access-token"),
            refresh_token=encrypt_secret("refresh-token"),
            scope="openid email profile",
        ),
    )
    db_session.commit()
    client.cookies.set(SESSION_COOKIE, _session_cookie_for(user_sub))

    res = client.post("/api/auth/google/disconnect")
    assert res.status_code == 200
    assert res.json() == {"ok": True}
    db_session.expire_all()
    assert db_session.get(GoogleOAuthCredential, user_sub) is None
    assert db_session.exec(select(Skill).where(Skill.user_sub == user_sub)).first() is not None

    me = client.get("/api/auth/me")
    assert me.status_code == 200
    body = me.json()
    assert body["authenticated"] is True
    assert body["googleIntegration"]["connected"] is False
    assert body["googleIntegration"]["hasRefreshToken"] is False


def test_google_exchange_encrypts_tokens_at_rest(client, db_session, monkeypatch) -> None:
    from app.routers import auth as auth_router

    async def fake_exchange_authorization_code(**_kwargs):
        return {
            "access_token": "new-access-token",
            "refresh_token": "new-refresh-token",
            "token_type": "Bearer",
            "scope": "openid email profile",
            "expires_in": 3600,
        }

    async def fake_fetch_google_userinfo(_access_token: str) -> dict[str, str]:
        return {
            "id": "google-user-3",
            "email": "user3@example.com",
            "name": "User Three",
            "picture": "https://example.com/u3.png",
        }

    monkeypatch.setattr(auth_router, "exchange_authorization_code", fake_exchange_authorization_code)
    monkeypatch.setattr(auth_router, "fetch_google_userinfo", fake_fetch_google_userinfo)
    client.cookies.set("oauth_state", "state-123")

    res = client.post(
        "/api/auth/google/exchange",
        json={"code": "auth-code", "state": "state-123"},
    )
    assert res.status_code == 200
    assert res.json() == {"ok": True}

    cred = db_session.get(GoogleOAuthCredential, "google-user-3")
    assert cred is not None
    assert cred.access_token.startswith("fernet:")
    assert cred.refresh_token is not None and cred.refresh_token.startswith("fernet:")
    assert decrypt_secret(cred.access_token) == "new-access-token"
    assert decrypt_secret(cred.refresh_token) == "new-refresh-token"


def test_plaintext_google_credentials_still_refresh_and_reencrypt(
    db_session,
    monkeypatch,
) -> None:
    from app.services import google_oauth

    user_sub = "google-user-legacy"
    db_session.add(
        GoogleOAuthCredential(
            user_sub=user_sub,
            provider="google",
            access_token="stale-access-token",
            refresh_token="legacy-refresh-token",
            expires_at=datetime.now(timezone.utc) - timedelta(minutes=5),
        ),
    )
    db_session.commit()

    def fake_refresh_access_token(**_kwargs):
        return {
            "access_token": "refreshed-access-token",
            "refresh_token": "refreshed-refresh-token",
            "scope": "openid email profile",
            "token_type": "Bearer",
            "expires_in": 3600,
        }

    monkeypatch.setattr(google_oauth, "refresh_access_token", fake_refresh_access_token)

    token = get_valid_access_token(db_session, user_sub)
    assert token == "refreshed-access-token"

    cred = db_session.get(GoogleOAuthCredential, user_sub)
    assert cred is not None
    assert cred.access_token.startswith("fernet:")
    assert cred.refresh_token is not None and cred.refresh_token.startswith("fernet:")
    assert decrypt_secret(cred.access_token) == "refreshed-access-token"
    assert decrypt_secret(cred.refresh_token) == "refreshed-refresh-token"
