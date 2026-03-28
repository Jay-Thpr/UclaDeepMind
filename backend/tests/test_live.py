from __future__ import annotations

from datetime import datetime, timezone

from app.deps import SESSION_COOKIE
from app.db_models import Skill
from app.security import create_session_token


def _session_cookie_for(sub: str) -> str:
    return create_session_token(
        subject=sub,
        email=f"{sub}@example.com",
        name="Learner",
        picture=None,
        secret="dev-only-change-jwt-secret",
    )


def test_live_ephemeral_token_without_skill_uses_generic_context(client, monkeypatch) -> None:
    from app.routers import live as live_router

    monkeypatch.setattr(live_router, "create_live_ephemeral_token", lambda: "ephemeral-token")

    res = client.post("/api/live/ephemeral-token", json={})
    assert res.status_code == 200
    body = res.json()
    assert body["accessToken"] == "ephemeral-token"
    assert body["liveContextVersion"] == "v1"
    assert body["systemInstruction"]
    assert "No persisted app context" in body["systemInstruction"]
    assert body["sourceResearchId"] is None
    assert body["sourceProgressEventIds"] == []
    assert body["truncated"] is False


def test_live_ephemeral_token_with_skill_includes_live_context(
    client,
    db_session,
    monkeypatch,
) -> None:
    from app.routers import live as live_router

    user_sub = "live-user-1"
    skill = Skill(
        user_sub=user_sub,
        title="Bread Baking",
        notes="Bake better sourdough",
        context={"goal": "Bake better sourdough", "level": "Beginner", "category": "cooking"},
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    db_session.add(skill)
    db_session.commit()

    monkeypatch.setattr(live_router, "create_live_ephemeral_token", lambda: "ephemeral-token")
    client.cookies.set(SESSION_COOKIE, _session_cookie_for(user_sub))

    res = client.post("/api/live/ephemeral-token", json={"skill_id": skill.id})
    assert res.status_code == 200
    body = res.json()
    assert body["accessToken"] == "ephemeral-token"
    assert body["liveContextVersion"] == "v1"
    assert body["sourceResearchId"] is None
    assert body["sourceProgressEventIds"] == []
    assert "Bread Baking" in body["systemInstruction"]


def test_redundant_live_system_instruction_route_is_removed(
    client,
    db_session,
) -> None:
    user_sub = "live-user-2"
    skill = Skill(
        user_sub=user_sub,
        title="Sketching",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    db_session.add(skill)
    db_session.commit()
    client.cookies.set(SESSION_COOKIE, _session_cookie_for(user_sub))

    res = client.get(f"/api/skills/{skill.id}/live-system-instruction")
    assert res.status_code == 404


def test_redundant_live_coach_context_route_is_removed(
    client,
    db_session,
) -> None:
    user_sub = "live-user-3"
    skill = Skill(
        user_sub=user_sub,
        title="Pottery",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    db_session.add(skill)
    db_session.commit()
    client.cookies.set(SESSION_COOKIE, _session_cookie_for(user_sub))

    res = client.get(f"/api/skills/{skill.id}/live-coach-context")
    assert res.status_code == 404
