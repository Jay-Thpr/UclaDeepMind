"""Persistent tables: skills, research artifacts, and progress timeline."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Optional

from sqlalchemy import JSON, Column
from sqlmodel import Field, SQLModel


def _uuid() -> str:
    return str(uuid.uuid4())


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Skill(SQLModel, table=True):
    __tablename__ = "skill"

    id: str = Field(default_factory=_uuid, primary_key=True)
    user_sub: str = Field(index=True, max_length=128)
    title: str = Field(max_length=500)
    notes: Optional[str] = Field(default=None, max_length=20000)
    # Goal, level, category preset, etc. (from onboarding)
    context: Optional[dict[str, Any]] = Field(default=None, sa_column=Column(JSON))
    # Journey stats (updated on session complete)
    stats_sessions: int = Field(default=0)
    stats_practice_seconds: int = Field(default=0)
    stats_level: int = Field(default=1, description="Numeric learner level for dashboard")
    stats_progress_percent: float = Field(
        default=0.0,
        description="0–100 progress toward stats_level + 1",
    )
    stats_mastered: int = Field(default=0, description="Sub-skills / milestones mastered")
    stats_day_streak: int = Field(default=0)
    last_practice_at: Optional[datetime] = Field(default=None)
    created_at: datetime = Field(default_factory=_utcnow)
    updated_at: datetime = Field(default_factory=_utcnow)


class SkillResearch(SQLModel, table=True):
    """Versioned research write-ups for a skill (newest-first when listing by created_at)."""

    __tablename__ = "skill_research"

    id: str = Field(default_factory=_uuid, primary_key=True)
    skill_id: str = Field(foreign_key="skill.id", index=True, max_length=36)
    user_sub: str = Field(index=True, max_length=128)
    title: Optional[str] = Field(default=None, max_length=500)
    content: str = Field(default="")
    extra: Optional[dict[str, Any]] = Field(default=None, sa_column=Column(JSON))
    created_at: datetime = Field(default_factory=_utcnow)


class SkillProgressEvent(SQLModel, table=True):
    """Append-only timeline: sessions, milestones, levels, notes, etc."""

    __tablename__ = "skill_progress_event"

    id: str = Field(default_factory=_uuid, primary_key=True)
    skill_id: str = Field(foreign_key="skill.id", index=True, max_length=36)
    user_sub: str = Field(index=True, max_length=128)
    kind: str = Field(max_length=64, description="e.g. session, level_up, note, milestone")
    label: Optional[str] = Field(default=None, max_length=500)
    detail: Optional[dict[str, Any]] = Field(default=None, sa_column=Column(JSON))
    metric_value: Optional[float] = Field(default=None)
    created_at: datetime = Field(default_factory=_utcnow)


class SkillSessionSummary(SQLModel, table=True):
    """Structured post-session summary persisted independently from progress events."""

    __tablename__ = "skill_session_summary"

    id: str = Field(default_factory=_uuid, primary_key=True)
    skill_id: str = Field(foreign_key="skill.id", index=True, max_length=36)
    user_sub: str = Field(index=True, max_length=128)
    session_number: int = Field(default=1)
    duration_seconds: int = Field(default=0)
    summary_text: str = Field(default="", max_length=12000)
    coach_note: Optional[str] = Field(default=None, max_length=2000)
    progress_delta: float = Field(default=0.0)
    level_ups: int = Field(default=0)
    mastered_delta: int = Field(default=0)
    input_notes: Optional[str] = Field(default=None, max_length=8000)
    extra: Optional[dict[str, Any]] = Field(default=None, sa_column=Column(JSON))
    created_at: datetime = Field(default_factory=_utcnow)


class LessonPlan(SQLModel, table=True):
    """Structured coaching plan with checkpoints derived from research dossier."""

    __tablename__ = "lesson_plan"

    id: str = Field(default_factory=_uuid, primary_key=True)
    skill_id: str = Field(foreign_key="skill.id", index=True, unique=True, max_length=36)
    user_sub: str = Field(index=True, max_length=128)
    source_research_id: Optional[str] = Field(default=None, max_length=36)
    coaching_mode: str = Field(max_length=32, description="hands-on, observational, repetition, conceptual")
    tone: str = Field(max_length=200, description="e.g. patient and hands-on")
    # Store checkpoints as JSON array: [{"id": 1, "goal": "...", "confirm_strategy": "..."}]
    checkpoints: dict[str, Any] = Field(sa_column=Column(JSON))
    sensory_cues: Optional[dict[str, Any]] = Field(default=None, sa_column=Column(JSON))
    safety_flags: Optional[dict[str, Any]] = Field(default=None, sa_column=Column(JSON))
    common_mistakes: Optional[dict[str, Any]] = Field(default=None, sa_column=Column(JSON))
    created_at: datetime = Field(default_factory=_utcnow)
    updated_at: datetime = Field(default_factory=_utcnow)


class GoogleOAuthCredential(SQLModel, table=True):
    """Stored Google OAuth tokens for user-authorized Google API calls."""

    __tablename__ = "google_oauth_credential"

    user_sub: str = Field(primary_key=True, max_length=128)
    provider: str = Field(default="google", max_length=32)
    access_token: str = Field(default="", max_length=4096)
    refresh_token: Optional[str] = Field(default=None, max_length=4096)
    token_type: Optional[str] = Field(default=None, max_length=64)
    scope: Optional[str] = Field(default=None, max_length=4000)
    expires_at: Optional[datetime] = Field(default=None)
    created_at: datetime = Field(default_factory=_utcnow)
    updated_at: datetime = Field(default_factory=_utcnow)


class GeneratedCharacter(SQLModel, table=True):
    """Character profile generated by Gemini for a skill's coaching sessions."""

    __tablename__ = "generated_character"

    id: str = Field(default_factory=_uuid, primary_key=True)
    skill_id: str = Field(foreign_key="skill.id", index=True, unique=True, max_length=36)
    user_sub: str = Field(index=True, max_length=128)
    name: str = Field(max_length=200)
    personality: str = Field(max_length=2000)
    coaching_style: str = Field(max_length=2000)
    appearance_description: Optional[str] = Field(default=None, max_length=4000)
    image_url: Optional[str] = Field(default=None, max_length=2000, description="Google Photos URL")
    created_at: datetime = Field(default_factory=_utcnow)
    updated_at: datetime = Field(default_factory=_utcnow)
