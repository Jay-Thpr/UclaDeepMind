import asyncio
import json as _json
import math
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlmodel import Session, select

from app.database import get_engine, get_session
from app.db_models import GeneratedCharacter, LessonPlan as LessonPlanDB
from app.db_models import Skill, SkillProgressEvent, SkillResearch, SkillSessionSummary
from app.deps import require_user
from app.schemas.skills import (
    CharacterCreate,
    CharacterOut,
    LessonPlan,
    LessonPlanOut,
    ProgressCreate,
    ProgressOut,
    ResearchCreate,
    ResearchOut,
    SessionCompleteBody,
    SessionCompleteResponse,
    SkillCreate,
    SkillCreateWithResearch,
    SkillSessionSummaryOut,
    SkillOut,
    SkillUpdate,
    SkillWithResearchResponse,
)
from app.services.lesson_plan_gemini import generate_lesson_plan
from app.services.session_summary_docs import export_session_summary_to_docs
from app.services.session_progress_gemini import estimate_session_progress_delta
from app.services.session_summary_gemini import generate_session_summary_text
from app.services.skill_research_gemini import generate_skill_research_dossier

router = APIRouter(prefix="/api/skills", tags=["skills"])


def _sse(event_type: str, data: dict) -> str:
    """Format a single SSE data frame (self-describing type field inside JSON)."""
    payload = {"type": event_type, **data}
    return f"data: {_json.dumps(payload)}\n\n"


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _get_skill_owned(
    session: Session,
    skill_id: str,
    user_sub: str,
) -> Skill:
    skill = session.get(Skill, skill_id)
    if skill is None or skill.user_sub != user_sub:
        raise HTTPException(status_code=404, detail="Skill not found")
    return skill


def _initial_stats_level(ctx: dict | None) -> int:
    if not ctx:
        return 1
    lev = ctx.get("level")
    if not isinstance(lev, str):
        return 1
    s = lev.lower()
    if "advanced" in s:
        return 3
    if "intermediate" in s:
        return 2
    return 1


def _skill_out(s: Skill) -> SkillOut:
    return SkillOut(
        id=s.id,
        title=s.title,
        notes=s.notes,
        context=s.context,
        stats_sessions=int(s.stats_sessions or 0),
        stats_practice_seconds=int(s.stats_practice_seconds or 0),
        stats_level=int(s.stats_level or 1),
        stats_progress_percent=float(s.stats_progress_percent or 0.0),
        stats_mastered=int(s.stats_mastered or 0),
        stats_day_streak=int(s.stats_day_streak or 0),
        last_practice_at=s.last_practice_at,
        created_at=s.created_at,
        updated_at=s.updated_at,
    )


def _summary_out(summary: SkillSessionSummary) -> SkillSessionSummaryOut:
    return SkillSessionSummaryOut(
        id=summary.id,
        skill_id=summary.skill_id,
        session_number=summary.session_number,
        duration_seconds=summary.duration_seconds,
        summary_text=summary.summary_text,
        coach_note=summary.coach_note,
        progress_delta=summary.progress_delta,
        level_ups=summary.level_ups,
        mastered_delta=summary.mastered_delta,
        input_notes=summary.input_notes,
        extra=summary.extra,
        created_at=summary.created_at,
    )


def _lesson_plan_out(plan_db: LessonPlanDB) -> LessonPlanOut:
    """Convert LessonPlan database row to API schema."""
    from app.schemas.skills import Checkpoint

    # Extract checkpoints from JSON
    checkpoints_data = plan_db.checkpoints if isinstance(plan_db.checkpoints, list) else []
    checkpoints = [Checkpoint.model_validate(cp) for cp in checkpoints_data]

    # Extract other list fields
    sensory_cues = plan_db.sensory_cues if isinstance(plan_db.sensory_cues, list) else []
    safety_flags = plan_db.safety_flags if isinstance(plan_db.safety_flags, list) else []
    common_mistakes = plan_db.common_mistakes if isinstance(plan_db.common_mistakes, list) else []

    lesson_plan = LessonPlan(
        coaching_mode=plan_db.coaching_mode,
        sensory_cues=sensory_cues,
        safety_flags=safety_flags,
        checkpoints=checkpoints,
        common_mistakes=common_mistakes,
        tone=plan_db.tone,
    )

    return LessonPlanOut(
        id=plan_db.id,
        skill_id=plan_db.skill_id,
        lesson_plan=lesson_plan,
        source_research_id=plan_db.source_research_id,
        created_at=plan_db.created_at,
        updated_at=plan_db.updated_at,
    )


@router.get("", response_model=dict)
@router.get("/", response_model=dict, include_in_schema=False)
def list_skills(
    user: dict = Depends(require_user),
    session: Session = Depends(get_session),
    limit: int = Query(100, ge=1, le=200),
    offset: int = Query(0, ge=0),
) -> dict:
    user_sub = str(user["id"])
    stmt = (
        select(Skill)
        .where(Skill.user_sub == user_sub)
        .order_by(Skill.updated_at.desc())
        .offset(offset)
        .limit(limit)
    )
    rows = session.exec(stmt).all()
    return {"skills": [_skill_out(s) for s in rows]}


@router.post("", response_model=SkillOut)
@router.post("/", response_model=SkillOut, include_in_schema=False)
def create_skill(
    body: SkillCreate,
    user: dict = Depends(require_user),
    session: Session = Depends(get_session),
) -> SkillOut:
    user_sub = str(user["id"])
    now = _utcnow()
    skill = Skill(
        user_sub=user_sub,
        title=body.title.strip(),
        notes=body.notes.strip() if body.notes else None,
        created_at=now,
        updated_at=now,
    )
    session.add(skill)
    session.commit()
    session.refresh(skill)
    return _skill_out(skill)


@router.post("/create-with-research", response_model=SkillWithResearchResponse)
def create_skill_with_research(
    body: SkillCreateWithResearch,
    user: dict = Depends(require_user),
    session: Session = Depends(get_session),
) -> SkillWithResearchResponse:
    """
    Run Gemini research (thinking-enabled when the model supports it), then persist
    the skill, research row, and a milestone progress event.
    """
    user_sub = str(user["id"])
    try:
        dossier, meta = generate_skill_research_dossier(
            title=body.title,
            goal=body.goal,
            level=body.level,
            category=body.category,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Research generation failed: {exc}",
        ) from exc

    # Generate lesson plan (checkpoint structure) alongside the dossier
    lesson_plan_data: dict | None = None
    try:
        lesson_plan_data = generate_lesson_plan(
            title=body.title,
            goal=body.goal,
            level=body.level,
            category=body.category,
            dossier=dossier,
        )
        meta["lesson_plan"] = lesson_plan_data
    except Exception as exc:  # noqa: BLE001 — lesson plan is non-blocking
        meta["lesson_plan"] = None
        meta["lesson_plan_error"] = str(exc)

    now = _utcnow()
    cat_raw = body.category.strip() if body.category else None
    ctx = {
        "goal": body.goal.strip(),
        "level": body.level.strip(),
        # Lowercase so preset rings (cooking, music, …) match after reload/API round-trips.
        "category": (cat_raw.lower() if cat_raw else None),
    }
    skill = Skill(
        user_sub=user_sub,
        title=body.title.strip(),
        notes=f"Goal: {body.goal.strip()[:2000]}",
        context=ctx,
        stats_level=_initial_stats_level(ctx),
        created_at=now,
        updated_at=now,
    )
    session.add(skill)
    session.flush()

    research_row = SkillResearch(
        skill_id=skill.id,
        user_sub=user_sub,
        title=f"Research dossier: {body.title.strip()}",
        content=dossier,
        extra=meta,
    )
    session.add(research_row)

    ev = SkillProgressEvent(
        skill_id=skill.id,
        user_sub=user_sub,
        kind="milestone",
        label="Research dossier generated",
        detail={"source": "gemini", "model": meta.get("model")},
    )
    session.add(ev)

    # Save lesson plan to dedicated table if successfully generated
    if lesson_plan_data:
        plan_row = LessonPlanDB(
            skill_id=skill.id,
            user_sub=user_sub,
            source_research_id=research_row.id,
            coaching_mode=lesson_plan_data.get("coaching_mode", "hands-on"),
            tone=lesson_plan_data.get("tone", "encouraging, patient"),
            checkpoints=lesson_plan_data.get("checkpoints", []),
            sensory_cues=lesson_plan_data.get("sensory_cues", []),
            safety_flags=lesson_plan_data.get("safety_flags", []),
            common_mistakes=lesson_plan_data.get("common_mistakes", []),
            created_at=now,
            updated_at=now,
        )
        session.add(plan_row)

    session.commit()
    session.refresh(skill)
    session.refresh(research_row)

    return SkillWithResearchResponse(
        skill=_skill_out(skill),
        research=ResearchOut(
            id=research_row.id,
            skill_id=research_row.skill_id,
            title=research_row.title,
            content=research_row.content,
            extra=research_row.extra,
            created_at=research_row.created_at,
        ),
    )


@router.post("/create-with-research-stream")
async def create_skill_with_research_stream(
    body: SkillCreateWithResearch,
    user: dict = Depends(require_user),
) -> StreamingResponse:
    """
    SSE variant of create-with-research.  Events stream as:
      data: {"type":"status","phase":"research","message":"…","pct":N}
      data: {"type":"status","phase":"lesson_plan","message":"…","pct":N}
      data: {"type":"status","phase":"saving","message":"…","pct":N}
      data: {"type":"done","skill":{…},"research":{…}}
      data: {"type":"error","message":"…"}
    """
    user_sub = str(user["id"])

    async def _generate():
        yield _sse("status", {"phase": "research", "message": "Generating research dossier…", "pct": 5})

        research_task = asyncio.create_task(
            asyncio.to_thread(
                generate_skill_research_dossier,
                title=body.title,
                goal=body.goal,
                level=body.level,
                category=body.category,
            )
        )
        tick = 0
        while not research_task.done():
            await asyncio.sleep(2)
            tick += 1
            # Logarithmic growth: starts fast, slows as it approaches 55%
            # Formula: 5 + 50 * (1 - e^(-tick/8)) gives smoother perceived progress
            pct = min(55, int(5 + 50 * (1 - math.exp(-tick / 8))))
            elapsed_sec = tick * 2
            if not research_task.done():
                yield _sse("status", {
                    "phase": "research",
                    "message": f"Thinking deeply… ({elapsed_sec}s)",
                    "pct": pct
                })
        try:
            dossier, meta = research_task.result()
        except Exception as exc:
            yield _sse("error", {"message": f"Research failed: {exc}"})
            return

        yield _sse("status", {"phase": "lesson_plan", "message": "Building lesson plan…", "pct": 60})
        lesson_plan_data: dict | None = None
        try:
            lesson_plan_data = await asyncio.to_thread(
                generate_lesson_plan,
                title=body.title,
                goal=body.goal,
                level=body.level,
                category=body.category,
                dossier=dossier,
            )
            meta["lesson_plan"] = lesson_plan_data
            yield _sse("status", {"phase": "lesson_plan", "message": "Lesson plan ready", "pct": 75})
        except Exception as exc:  # noqa: BLE001
            meta["lesson_plan"] = None
            meta["lesson_plan_error"] = str(exc)
            # Warn user but continue — skill is still usable with generic checkpoints
            yield _sse("status", {
                "phase": "lesson_plan",
                "message": "⚠️ Lesson plan generation failed, will use defaults",
                "pct": 75
            })

        yield _sse("status", {"phase": "saving", "message": "Saving to your account…", "pct": 85})

        def _save() -> tuple:
            now = _utcnow()
            cat_raw = body.category.strip() if body.category else None
            ctx = {
                "goal": body.goal.strip(),
                "level": body.level.strip(),
                "category": (cat_raw.lower() if cat_raw else None),
            }
            with Session(get_engine()) as db:
                skill_row = Skill(
                    user_sub=user_sub,
                    title=body.title.strip(),
                    notes=f"Goal: {body.goal.strip()[:2000]}",
                    context=ctx,
                    stats_level=_initial_stats_level(ctx),
                    created_at=now,
                    updated_at=now,
                )
                db.add(skill_row)
                db.flush()
                research_row = SkillResearch(
                    skill_id=skill_row.id,
                    user_sub=user_sub,
                    title=f"Research dossier: {body.title.strip()}",
                    content=dossier,
                    extra=meta,
                )
                db.add(research_row)
                db.add(
                    SkillProgressEvent(
                        skill_id=skill_row.id,
                        user_sub=user_sub,
                        kind="milestone",
                        label="Research dossier generated",
                        detail={"source": "gemini", "model": meta.get("model")},
                    )
                )

                # Save lesson plan to dedicated table if successfully generated
                if lesson_plan_data:
                    plan_row = LessonPlanDB(
                        skill_id=skill_row.id,
                        user_sub=user_sub,
                        source_research_id=research_row.id,
                        coaching_mode=lesson_plan_data.get("coaching_mode", "hands-on"),
                        tone=lesson_plan_data.get("tone", "encouraging, patient"),
                        checkpoints=lesson_plan_data.get("checkpoints", []),
                        sensory_cues=lesson_plan_data.get("sensory_cues", []),
                        safety_flags=lesson_plan_data.get("safety_flags", []),
                        common_mistakes=lesson_plan_data.get("common_mistakes", []),
                        created_at=now,
                        updated_at=now,
                    )
                    db.add(plan_row)

                db.commit()
                db.refresh(skill_row)
                db.refresh(research_row)
                return skill_row, research_row

        try:
            skill_saved, research_saved = await asyncio.to_thread(_save)
        except Exception as exc:
            yield _sse("error", {"message": f"Failed to save: {exc}"})
            return

        yield _sse("done", {
            "skill": _skill_out(skill_saved).model_dump(mode="json"),
            "research": ResearchOut(
                id=research_saved.id,
                skill_id=research_saved.skill_id,
                title=research_saved.title,
                content=research_saved.content,
                extra=research_saved.extra,
                created_at=research_saved.created_at,
            ).model_dump(mode="json"),
        })

    return StreamingResponse(
        _generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/{skill_id}/complete-session", response_model=SessionCompleteResponse)
def complete_session(
    skill_id: str,
    body: SessionCompleteBody,
    user: dict = Depends(require_user),
    session: Session = Depends(get_session),
) -> SessionCompleteResponse:
    """
    Record a finished practice: add session count + duration, ask Gemini for progress
    delta toward the next level, update streak, persist milestone progress.
    """
    user_sub = str(user["id"])
    skill = _get_skill_owned(session, skill_id, user_sub)
    ctx = skill.context if isinstance(skill.context, dict) else {}
    goal = str(ctx.get("goal", skill.notes or skill.title))[:2000]
    level_label = str(ctx.get("level", "Beginner"))[:64]

    coach = estimate_session_progress_delta(
        skill_title=skill.title,
        goal=goal,
        learner_level_label=level_label,
        duration_seconds=body.duration_seconds,
        session_notes=body.session_notes,
        current_progress_percent=float(skill.stats_progress_percent or 0.0),
        sessions_before=int(skill.stats_sessions or 0),
    )
    delta = float(coach["progress_delta"])
    mastered_delta = int(coach["mastered_delta"])

    skill.stats_sessions = int(skill.stats_sessions or 0) + 1
    skill.stats_practice_seconds = int(skill.stats_practice_seconds or 0) + int(
        body.duration_seconds,
    )

    p = float(skill.stats_progress_percent or 0.0) + delta
    level_ups = 0
    while p >= 100.0:
        p -= 100.0
        level_ups += 1
    skill.stats_level = int(skill.stats_level or 1) + level_ups
    skill.stats_progress_percent = round(p, 2)
    skill.stats_mastered = int(skill.stats_mastered or 0) + mastered_delta

    now = _utcnow()
    today = now.date()
    last = skill.last_practice_at
    if last is None:
        streak = 1
    else:
        ld = last.date() if isinstance(last, datetime) else last
        if ld == today:
            streak = int(skill.stats_day_streak or 0) or 1
        elif ld == today - timedelta(days=1):
            streak = int(skill.stats_day_streak or 0) + 1
        else:
            streak = 1
    skill.stats_day_streak = streak
    skill.last_practice_at = now
    skill.updated_at = now

    summary_text = generate_session_summary_text(
        skill_title=skill.title,
        goal=goal,
        learner_level_label=level_label,
        duration_seconds=body.duration_seconds,
        session_notes=body.session_notes,
        coach_note=coach["coach_note"],
        progress_delta=delta,
        level_ups=level_ups,
        mastered_delta=mastered_delta,
    )

    ev = SkillProgressEvent(
        skill_id=skill.id,
        user_sub=user_sub,
        kind="session",
        label=f"Session {skill.stats_sessions}",
        detail={
            "duration_seconds": body.duration_seconds,
            "progress_delta": delta,
            "coach_note": coach["coach_note"],
            "level_ups": level_ups,
            "mastered_delta": mastered_delta,
        },
        metric_value=float(skill.stats_progress_percent),
    )
    summary = SkillSessionSummary(
        skill_id=skill.id,
        user_sub=user_sub,
        session_number=int(skill.stats_sessions or 0),
        duration_seconds=body.duration_seconds,
        summary_text=summary_text,
        coach_note=coach["coach_note"],
        progress_delta=delta,
        level_ups=level_ups,
        mastered_delta=mastered_delta,
        input_notes=body.session_notes,
        extra={"docs_export": {"status": "not_attempted"}},
    )
    session.add(skill)
    session.add(ev)
    session.add(summary)
    session.commit()
    session.refresh(skill)
    session.refresh(summary)

    docs_export_url: str | None = None
    try:
        export_result = export_session_summary_to_docs(
            summary=summary,
            skill=skill,
            user_email=user.get("email") if isinstance(user.get("email"), str) else None,
            session=session,
        )
        if export_result:
            docs_export_url = export_result["document_url"]
            extra = dict(summary.extra or {})
            extra["docs_export"] = {
                "status": "exported",
                "document_id": export_result["document_id"],
                "document_url": export_result["document_url"],
            }
            summary.extra = extra
            session.add(summary)
            session.commit()
            session.refresh(summary)
    except Exception as exc:  # noqa: BLE001 — summary persistence remains authoritative
        extra = dict(summary.extra or {})
        extra["docs_export"] = {
            "status": "error",
            "error": str(exc),
        }
        summary.extra = extra
        session.add(summary)
        session.commit()
        session.refresh(summary)

    return SessionCompleteResponse(
        skill=_skill_out(skill),
        coach_note=coach["coach_note"],
        progress_delta=delta,
        level_ups=level_ups,
        mastered_delta=mastered_delta,
        session_summary=_summary_out(summary),
        docs_export_url=docs_export_url,
    )


@router.get("/{skill_id}", response_model=SkillOut)
def get_skill(
    skill_id: str,
    user: dict = Depends(require_user),
    session: Session = Depends(get_session),
) -> SkillOut:
    user_sub = str(user["id"])
    s = _get_skill_owned(session, skill_id, user_sub)
    return _skill_out(s)


@router.patch("/{skill_id}", response_model=SkillOut)
def update_skill(
    skill_id: str,
    body: SkillUpdate,
    user: dict = Depends(require_user),
    session: Session = Depends(get_session),
) -> SkillOut:
    user_sub = str(user["id"])
    s = _get_skill_owned(session, skill_id, user_sub)
    if body.title is not None:
        s.title = body.title.strip()
    if body.notes is not None:
        s.notes = body.notes.strip() if body.notes else None
    s.updated_at = _utcnow()
    session.add(s)
    session.commit()
    session.refresh(s)
    return _skill_out(s)


@router.delete("/{skill_id}")
def delete_skill(
    skill_id: str,
    user: dict = Depends(require_user),
    session: Session = Depends(get_session),
) -> dict[str, bool]:
    user_sub = str(user["id"])
    s = _get_skill_owned(session, skill_id, user_sub)
    for row in session.exec(
        select(SkillResearch).where(SkillResearch.skill_id == skill_id),
    ).all():
        session.delete(row)
    for row in session.exec(
        select(SkillProgressEvent).where(SkillProgressEvent.skill_id == skill_id),
    ).all():
        session.delete(row)
    session.delete(s)
    session.commit()
    return {"ok": True}


# --- Lesson Plan ---


@router.get("/{skill_id}/lesson-plan", response_model=LessonPlanOut)
def get_lesson_plan(
    skill_id: str,
    user: dict = Depends(require_user),
    session: Session = Depends(get_session),
) -> LessonPlanOut:
    """Return the stored lesson plan from the LessonPlan table."""
    user_sub = str(user["id"])
    _get_skill_owned(session, skill_id, user_sub)

    # Query the LessonPlan table
    stmt = select(LessonPlanDB).where(LessonPlanDB.skill_id == skill_id)
    plan_db = session.exec(stmt).first()

    if plan_db is None:
        raise HTTPException(
            status_code=404,
            detail="No lesson plan found for this skill. Create one during onboarding or regenerate.",
        )

    return _lesson_plan_out(plan_db)


@router.post("/{skill_id}/lesson-plan/regenerate", response_model=LessonPlanOut)
def regenerate_lesson_plan(
    skill_id: str,
    user: dict = Depends(require_user),
    session: Session = Depends(get_session),
) -> LessonPlanOut:
    """Re-run lesson plan generation and save to LessonPlan table."""
    user_sub = str(user["id"])
    skill = _get_skill_owned(session, skill_id, user_sub)
    stmt = (
        select(SkillResearch)
        .where(SkillResearch.skill_id == skill_id)
        .order_by(SkillResearch.created_at.desc())
        .limit(1)
    )
    r = session.exec(stmt).first()
    if r is None:
        raise HTTPException(status_code=404, detail="No research found for this skill.")

    ctx = skill.context if isinstance(skill.context, dict) else {}
    try:
        lp_data = generate_lesson_plan(
            title=skill.title,
            goal=str(ctx.get("goal", skill.notes or skill.title)),
            level=str(ctx.get("level", "Beginner")),
            category=ctx.get("category"),
            dossier=r.content or "",
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Lesson plan generation failed: {exc}") from exc

    # Check if lesson plan already exists (unique constraint on skill_id)
    existing = session.exec(select(LessonPlanDB).where(LessonPlanDB.skill_id == skill_id)).first()

    now = _utcnow()
    if existing:
        # Update existing lesson plan
        existing.source_research_id = r.id
        existing.coaching_mode = lp_data.get("coaching_mode", "hands-on")
        existing.tone = lp_data.get("tone", "encouraging, patient")
        existing.checkpoints = lp_data.get("checkpoints", [])
        existing.sensory_cues = lp_data.get("sensory_cues", [])
        existing.safety_flags = lp_data.get("safety_flags", [])
        existing.common_mistakes = lp_data.get("common_mistakes", [])
        existing.updated_at = now
        session.add(existing)
        session.commit()
        session.refresh(existing)
        return _lesson_plan_out(existing)

    # Create new lesson plan
    plan_db = LessonPlanDB(
        skill_id=skill_id,
        user_sub=user_sub,
        source_research_id=r.id,
        coaching_mode=lp_data.get("coaching_mode", "hands-on"),
        tone=lp_data.get("tone", "encouraging, patient"),
        checkpoints=lp_data.get("checkpoints", []),
        sensory_cues=lp_data.get("sensory_cues", []),
        safety_flags=lp_data.get("safety_flags", []),
        common_mistakes=lp_data.get("common_mistakes", []),
        created_at=now,
        updated_at=now,
    )
    session.add(plan_db)
    session.commit()
    session.refresh(plan_db)

    return _lesson_plan_out(plan_db)


# --- Research ---


@router.get("/{skill_id}/research", response_model=dict)
def list_research(
    skill_id: str,
    user: dict = Depends(require_user),
    session: Session = Depends(get_session),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
) -> dict:
    user_sub = str(user["id"])
    _get_skill_owned(session, skill_id, user_sub)
    stmt = (
        select(SkillResearch)
        .where(SkillResearch.skill_id == skill_id)
        .order_by(SkillResearch.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    rows = session.exec(stmt).all()
    return {
        "items": [
            ResearchOut(
                id=r.id,
                skill_id=r.skill_id,
                title=r.title,
                content=r.content,
                extra=r.extra,
                created_at=r.created_at,
            )
            for r in rows
        ]
    }


@router.get("/{skill_id}/research/latest", response_model=ResearchOut)
def latest_research(
    skill_id: str,
    user: dict = Depends(require_user),
    session: Session = Depends(get_session),
) -> ResearchOut:
    user_sub = str(user["id"])
    _get_skill_owned(session, skill_id, user_sub)
    stmt = (
        select(SkillResearch)
        .where(SkillResearch.skill_id == skill_id)
        .order_by(SkillResearch.created_at.desc())
        .limit(1)
    )
    r = session.exec(stmt).first()
    if r is None:
        raise HTTPException(
            status_code=404,
            detail="No research entries yet for this skill.",
        )
    return ResearchOut(
        id=r.id,
        skill_id=r.skill_id,
        title=r.title,
        content=r.content,
        extra=r.extra,
        created_at=r.created_at,
    )


@router.post("/{skill_id}/research", response_model=ResearchOut)
def add_research(
    skill_id: str,
    body: ResearchCreate,
    user: dict = Depends(require_user),
    session: Session = Depends(get_session),
) -> ResearchOut:
    user_sub = str(user["id"])
    s = _get_skill_owned(session, skill_id, user_sub)
    row = SkillResearch(
        skill_id=s.id,
        user_sub=user_sub,
        title=body.title.strip() if body.title else None,
        content=body.content,
        extra=body.extra,
    )
    s.updated_at = _utcnow()
    session.add(row)
    session.add(s)
    session.commit()
    session.refresh(row)
    return ResearchOut(
        id=row.id,
        skill_id=row.skill_id,
        title=row.title,
        content=row.content,
        extra=row.extra,
        created_at=row.created_at,
    )


# --- Progress ---


@router.get("/{skill_id}/progress", response_model=dict)
def list_progress(
    skill_id: str,
    user: dict = Depends(require_user),
    session: Session = Depends(get_session),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
) -> dict:
    user_sub = str(user["id"])
    _get_skill_owned(session, skill_id, user_sub)
    stmt = (
        select(SkillProgressEvent)
        .where(SkillProgressEvent.skill_id == skill_id)
        .order_by(SkillProgressEvent.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    rows = session.exec(stmt).all()
    return {
        "events": [
            ProgressOut(
                id=e.id,
                skill_id=e.skill_id,
                kind=e.kind,
                label=e.label,
                detail=e.detail,
                metric_value=e.metric_value,
                created_at=e.created_at,
            )
            for e in rows
        ]
    }


@router.post("/{skill_id}/progress", response_model=ProgressOut)
def add_progress(
    skill_id: str,
    body: ProgressCreate,
    user: dict = Depends(require_user),
    session: Session = Depends(get_session),
) -> ProgressOut:
    user_sub = str(user["id"])
    s = _get_skill_owned(session, skill_id, user_sub)
    ev = SkillProgressEvent(
        skill_id=s.id,
        user_sub=user_sub,
        kind=body.kind.strip(),
        label=body.label.strip() if body.label else None,
        detail=body.detail,
        metric_value=body.metric_value,
    )
    s.updated_at = _utcnow()
    session.add(ev)
    session.add(s)
    session.commit()
    session.refresh(ev)
    return ProgressOut(
        id=ev.id,
        skill_id=ev.skill_id,
        kind=ev.kind,
        label=ev.label,
        detail=ev.detail,
        metric_value=ev.metric_value,
        created_at=ev.created_at,
    )


@router.get("/{skill_id}/session-summaries", response_model=dict)
def list_session_summaries(
    skill_id: str,
    user: dict = Depends(require_user),
    session: Session = Depends(get_session),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
) -> dict:
    user_sub = str(user["id"])
    _get_skill_owned(session, skill_id, user_sub)
    rows = session.exec(
        select(SkillSessionSummary)
        .where(SkillSessionSummary.skill_id == skill_id)
        .order_by(SkillSessionSummary.created_at.desc())
        .offset(offset)
        .limit(limit)
    ).all()
    return {"items": [_summary_out(row) for row in rows]}


# ---------------------------------------------------------------------------
# Character endpoints
# ---------------------------------------------------------------------------


@router.get("/{skill_id}/character", response_model=CharacterOut | None)
def get_character(
    skill_id: str,
    user: dict = Depends(require_user),
    session: Session = Depends(get_session),
) -> CharacterOut | None:
    """Get the generated character for a skill."""
    user_sub = str(user["id"])
    _get_skill_owned(session, skill_id, user_sub)
    character = session.exec(
        select(GeneratedCharacter).where(GeneratedCharacter.skill_id == skill_id)
    ).first()
    if not character:
        return None
    return CharacterOut(
        id=character.id,
        skill_id=character.skill_id,
        user_sub=character.user_sub,
        name=character.name,
        personality=character.personality,
        coaching_style=character.coaching_style,
        appearance_description=character.appearance_description,
        image_url=character.image_url,
        created_at=character.created_at,
        updated_at=character.updated_at,
    )


@router.post("/{skill_id}/character", response_model=CharacterOut)
def create_or_regenerate_character(
    skill_id: str,
    body: CharacterCreate,
    user: dict = Depends(require_user),
    session: Session = Depends(get_session),
) -> CharacterOut:
    """Create or regenerate the character for a skill."""
    user_sub = str(user["id"])
    _get_skill_owned(session, skill_id, user_sub)

    # Delete existing character if any
    existing = session.exec(
        select(GeneratedCharacter).where(GeneratedCharacter.skill_id == skill_id)
    ).first()
    if existing:
        session.delete(existing)
        session.commit()

    # Create new character
    character = GeneratedCharacter(
        skill_id=skill_id,
        user_sub=user_sub,
        name=body.name,
        personality=body.personality,
        coaching_style=body.coaching_style,
        appearance_description=body.appearance_description,
        image_url=body.image_url,
    )
    session.add(character)
    session.commit()
    session.refresh(character)

    return CharacterOut(
        id=character.id,
        skill_id=character.skill_id,
        user_sub=character.user_sub,
        name=character.name,
        personality=character.personality,
        coaching_style=character.coaching_style,
        appearance_description=character.appearance_description,
        image_url=character.image_url,
        created_at=character.created_at,
        updated_at=character.updated_at,
    )


@router.delete("/{skill_id}/character", status_code=204)
def delete_character(
    skill_id: str,
    user: dict = Depends(require_user),
    session: Session = Depends(get_session),
) -> None:
    """Delete the character for a skill."""
    user_sub = str(user["id"])
    _get_skill_owned(session, skill_id, user_sub)

    character = session.exec(
        select(GeneratedCharacter).where(GeneratedCharacter.skill_id == skill_id)
    ).first()
    if character:
        session.delete(character)
        session.commit()


# ---------------------------------------------------------------------------
# Dashboard / cross-skill endpoints
# ---------------------------------------------------------------------------


@router.get("/sessions/recent", response_model=dict)
def list_recent_sessions(
    user: dict = Depends(require_user),
    session: Session = Depends(get_session),
    limit: int = Query(10, ge=1, le=50),
) -> dict:
    """List recent session summaries across all skills for the user."""
    user_sub = str(user["id"])
    rows = session.exec(
        select(SkillSessionSummary)
        .where(SkillSessionSummary.user_sub == user_sub)
        .order_by(SkillSessionSummary.created_at.desc())
        .limit(limit)
    ).all()
    return {"items": [_summary_out(row) for row in rows]}
