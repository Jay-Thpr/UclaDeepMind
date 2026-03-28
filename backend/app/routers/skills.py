from fastapi import APIRouter

router = APIRouter(prefix="/api/skills", tags=["skills"])


@router.get("/")
def list_skills_stub() -> dict[str, list]:
    """Placeholder until skills are stored."""
    return {"skills": []}
