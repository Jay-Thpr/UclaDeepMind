from fastapi import APIRouter

router = APIRouter(prefix="/api/sessions", tags=["sessions"])


@router.get("/")
def list_sessions_stub() -> dict[str, list]:
    """Placeholder session history."""
    return {"sessions": []}
