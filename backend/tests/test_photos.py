from __future__ import annotations

from datetime import datetime, timezone
from sqlmodel import select

from app.deps import SESSION_COOKIE
from app.db_models import GoogleOAuthCredential, Skill, SkillProgressEvent
from app.security import create_session_token
from app.services.secret_crypto import encrypt_secret


def _session_cookie_for(sub: str) -> str:
    return create_session_token(
        subject=sub,
        email=f"{sub}@example.com",
        name="Learner",
        picture=None,
        secret="dev-only-change-jwt-secret",
    )


def test_upload_photo_fails_when_google_credentials_missing(client, db_session) -> None:
    user_sub = "photos-user-1"
    skill = Skill(
        user_sub=user_sub,
        title="Watercolor",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    db_session.add(skill)
    db_session.commit()
    client.cookies.set(SESSION_COOKIE, _session_cookie_for(user_sub))

    res = client.post(
        "/api/photos/upload",
        json={
            "skillId": skill.id,
            "imageBase64": "YWJj",
            "mimeType": "image/png",
            "label": "test",
            "kind": "annotation",
        },
    )
    assert res.status_code == 409
    assert "Google Photos is not connected" in res.json()["detail"]


def test_upload_photo_succeeds_with_mocked_photos_api(
    client,
    db_session,
    monkeypatch,
) -> None:
    from app.routers import photos as photos_router

    user_sub = "photos-user-2"
    skill = Skill(
        user_sub=user_sub,
        title="Clay Sculpture",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    db_session.add(skill)
    db_session.add(
        GoogleOAuthCredential(
            user_sub=user_sub,
            provider="google",
            access_token=encrypt_secret("stored-access-token"),
            refresh_token=encrypt_secret("stored-refresh-token"),
            scope="openid email profile https://www.googleapis.com/auth/photoslibrary.appendonly",
        ),
    )
    db_session.commit()
    client.cookies.set(SESSION_COOKIE, _session_cookie_for(user_sub))

    captured: dict[str, object] = {}

    def fake_get_valid_access_token(session, user_sub_arg):
        captured["user_sub"] = user_sub_arg
        return "access-token"

    def fake_upload_photo_to_skill_album(
        access_token,
        *,
        skill_title,
        image_bytes,
        mime_type,
        label=None,
        description=None,
    ):
        captured["access_token"] = access_token
        captured["skill_title"] = skill_title
        captured["image_bytes"] = image_bytes
        captured["mime_type"] = mime_type
        captured["label"] = label
        captured["description"] = description
        return {
            "albumId": "album-1",
            "albumTitle": skill_title,
            "mediaItemId": "media-1",
            "productUrl": "https://example.com/media-1",
        }

    monkeypatch.setattr(photos_router, "get_valid_access_token", fake_get_valid_access_token)
    monkeypatch.setattr(photos_router, "upload_photo_to_skill_album", fake_upload_photo_to_skill_album)

    res = client.post(
        "/api/photos/upload",
        json={
            "skillId": skill.id,
            "imageBase64": "YWJj",
            "mimeType": "image/png",
            "label": "practice still",
            "kind": "annotation",
            "description": "Test note",
        },
    )
    assert res.status_code == 200
    body = res.json()
    assert body["albumTitle"] == "Clay Sculpture"
    assert captured["skill_title"] == "Clay Sculpture"
    assert captured["access_token"] == "access-token"
    assert captured["mime_type"] == "image/png"
    assert captured["label"] == "practice still"
    assert captured["description"] == "Test note"

    event = db_session.exec(
        select(SkillProgressEvent).where(
            SkillProgressEvent.skill_id == skill.id,
            SkillProgressEvent.kind == "photo_upload",
        )
    ).first()
    assert event is not None
    assert event.detail["album_title"] == "Clay Sculpture"
