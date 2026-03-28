"""API shapes for skills, research, and progress (decoupled from ORM rows)."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Lesson plan (checkpoint-based coaching structure)
# ---------------------------------------------------------------------------


class Checkpoint(BaseModel):
    id: int
    goal: str
    confirm_strategy: str


class LessonPlan(BaseModel):
    coaching_mode: str  # "hands-on" | "observational" | "repetition" | "conceptual"
    sensory_cues: list[str] = Field(default_factory=list)
    safety_flags: list[str] = Field(default_factory=list)
    checkpoints: list[Checkpoint]
    common_mistakes: list[str] = Field(default_factory=list)
    tone: str = "encouraging, patient"


class LessonPlanOut(BaseModel):
    skill_id: str
    lesson_plan: LessonPlan
    source_research_id: Optional[str] = None


# ---------------------------------------------------------------------------
# Skills
# ---------------------------------------------------------------------------


class SkillCreate(BaseModel):
    title: str = Field(min_length=1, max_length=500)
    notes: Optional[str] = Field(default=None, max_length=20000)


class SkillCreateWithResearch(BaseModel):
    title: str = Field(min_length=1, max_length=500)
    goal: str = Field(min_length=1, max_length=20000)
    level: str = Field(min_length=1, max_length=64, description="e.g. Beginner")
    category: Optional[str] = Field(
        default=None,
        max_length=64,
        description="Preset from skill select, e.g. cooking, music",
    )


class SkillUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=500)
    notes: Optional[str] = Field(default=None, max_length=20000)


class SkillOut(BaseModel):
    id: str
    title: str
    notes: Optional[str]
    context: Optional[dict[str, Any]] = None
    stats_sessions: int = 0
    stats_practice_seconds: int = 0
    stats_level: int = 1
    stats_progress_percent: float = 0.0
    stats_mastered: int = 0
    stats_day_streak: int = 0
    last_practice_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime


class SessionCompleteBody(BaseModel):
    duration_seconds: int = Field(ge=0, le=86400)
    session_notes: Optional[str] = Field(default=None, max_length=8000)


class SkillSessionSummaryOut(BaseModel):
    id: str
    skill_id: str
    session_number: int
    duration_seconds: int
    summary_text: str
    coach_note: Optional[str]
    progress_delta: float
    level_ups: int
    mastered_delta: int
    input_notes: Optional[str]
    extra: Optional[dict[str, Any]] = None
    created_at: datetime


class SessionCompleteResponse(BaseModel):
    skill: SkillOut
    coach_note: str
    progress_delta: float
    level_ups: int
    mastered_delta: int
    session_summary: SkillSessionSummaryOut
    docs_export_url: Optional[str] = None


class ResearchCreate(BaseModel):
    title: Optional[str] = Field(default=None, max_length=500)
    content: str = Field(min_length=1)
    extra: Optional[dict[str, Any]] = None


class ResearchOut(BaseModel):
    id: str
    skill_id: str
    title: Optional[str]
    content: str
    extra: Optional[dict[str, Any]]
    created_at: datetime


class ProgressCreate(BaseModel):
    kind: str = Field(min_length=1, max_length=64)
    label: Optional[str] = Field(default=None, max_length=500)
    detail: Optional[dict[str, Any]] = None
    metric_value: Optional[float] = None


class ProgressOut(BaseModel):
    id: str
    skill_id: str
    kind: str
    label: Optional[str]
    detail: Optional[dict[str, Any]]
    metric_value: Optional[float]
    created_at: datetime


class SkillWithResearchResponse(BaseModel):
    skill: SkillOut
    research: ResearchOut


class LiveCoachContextOut(BaseModel):
    """Skill + latest research + recent progress for Gemini Live system instructions."""

    skill: SkillOut
    research: Optional[ResearchOut] = None
    progress_events: list[ProgressOut] = Field(default_factory=list)


class LiveSystemInstructionOut(BaseModel):
    system_instruction: str
    live_context_version: str
    skill_id: str
    source_research_id: Optional[str] = None
    source_progress_event_ids: list[str] = Field(default_factory=list)
    truncated: bool = False
