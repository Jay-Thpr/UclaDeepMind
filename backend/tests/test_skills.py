from __future__ import annotations

from datetime import datetime, timezone
from sqlmodel import select

from app.deps import SESSION_COOKIE
from app.db_models import Skill, SkillProgressEvent, SkillSessionSummary
from app.security import create_session_token


def _session_cookie_for(sub: str) -> str:
    return create_session_token(
        subject=sub,
        email=f"{sub}@example.com",
        name="Learner",
        picture=None,
        secret="dev-only-change-jwt-secret",
    )


def test_complete_session_persists_summary_and_session_event(
    client,
    db_session,
    monkeypatch,
) -> None:
    from app.routers import skills as skills_router

    user_sub = "skills-user-1"
    skill = Skill(
        user_sub=user_sub,
        title="Guitar Practice",
        notes="Practice chord changes",
        context={"goal": "Practice chord changes", "level": "Beginner"},
        stats_sessions=0,
        stats_practice_seconds=0,
        stats_level=1,
        stats_progress_percent=0.0,
        stats_mastered=0,
        stats_day_streak=0,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    db_session.add(skill)
    db_session.commit()
    client.cookies.set(SESSION_COOKIE, _session_cookie_for(user_sub))

    monkeypatch.setattr(
        skills_router,
        "estimate_session_progress_delta",
        lambda **_kwargs: {
            "progress_delta": 12.5,
            "mastered_delta": 1,
            "coach_note": "Good control.",
        },
    )
    monkeypatch.setattr(
        skills_router,
        "generate_session_summary_text",
        lambda **_kwargs: "Session summary text.",
    )

    def fail_docs_export(**_kwargs):
        raise RuntimeError("docs unavailable")

    monkeypatch.setattr(skills_router, "export_session_summary_to_docs", fail_docs_export)

    res = client.post(
        f"/api/skills/{skill.id}/complete-session",
        json={"duration_seconds": 300, "session_notes": "Focus on transitions."},
    )
    assert res.status_code == 200
    body = res.json()
    assert body["progress_delta"] == 12.5
    assert body["level_ups"] == 0
    assert body["mastered_delta"] == 1
    assert body["docs_export_url"] is None
    assert body["session_summary"]["summary_text"] == "Session summary text."
    assert body["session_summary"]["extra"]["docs_export"]["status"] == "error"

    db_session.expire_all()
    updated_skill = db_session.get(Skill, skill.id)
    assert updated_skill is not None
    assert updated_skill.stats_sessions == 1
    assert updated_skill.stats_practice_seconds == 300
    assert updated_skill.stats_progress_percent == 12.5
    assert updated_skill.stats_mastered == 1

    session_event = db_session.exec(
        select(SkillProgressEvent).where(
            SkillProgressEvent.skill_id == skill.id,
            SkillProgressEvent.kind == "session",
        )
    ).first()
    assert session_event is not None
    summary_row = db_session.exec(
        select(SkillSessionSummary).where(SkillSessionSummary.skill_id == skill.id)
    ).first()
    assert summary_row is not None
    assert summary_row.coach_note == "Good control."
    assert summary_row.extra["docs_export"]["status"] == "error"
