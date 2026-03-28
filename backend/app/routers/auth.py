from fastapi import APIRouter

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.get("/status")
def auth_status() -> dict[str, str]:
    """Placeholder until Google OAuth is wired."""
    return {"status": "stub", "message": "OAuth not implemented yet"}
