from fastapi import APIRouter

router = APIRouter(prefix="/api/research", tags=["research"])


@router.get("/status")
def research_status_stub() -> dict[str, str]:
    """Placeholder for async research jobs."""
    return {"status": "idle", "job_id": ""}
