from fastapi import APIRouter

router = APIRouter(prefix="/api/live", tags=["live"])


@router.get("/status")
def live_status_stub() -> dict[str, str]:
    """Placeholder for Gemini Live session bridge."""
    return {"status": "disconnected"}
