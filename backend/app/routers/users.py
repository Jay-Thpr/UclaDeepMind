from fastapi import APIRouter

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("/me")
def me_stub() -> dict[str, str]:
    """Placeholder user profile."""
    return {"id": "stub", "display_name": "Player One"}
