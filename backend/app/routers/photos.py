import math

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field
from sqlmodel import Session

from app.database import get_session
from app.db_models import SkillProgressEvent
from app.deps import require_user
from app.routers.skills import _get_skill_owned
from app.services.form_annotation import decode_base64_image
from app.services.google_oauth import get_valid_access_token
from app.services.google_photos import upload_photo_to_skill_album

router = APIRouter(prefix="/api/photos", tags=["photos"])


class UploadPhotoBody(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    skill_id: str = Field(alias="skillId", min_length=1)
    image_base64: str = Field(alias="imageBase64", min_length=1)
    mime_type: str = Field(default="image/png", alias="mimeType")
    label: str | None = Field(default=None, max_length=200)
    kind: str = Field(default="annotation", max_length=64)
    description: str | None = Field(default=None, max_length=2000)


@router.post("/upload")
def upload_photo(
    body: UploadPhotoBody,
    user: dict = Depends(require_user),
    session: Session = Depends(get_session),
) -> dict[str, str | None]:
    user_sub = str(user["id"])
    skill = _get_skill_owned(session, body.skill_id, user_sub)

    access_token = get_valid_access_token(session, user_sub)
    if not access_token:
        raise HTTPException(
            status_code=409,
            detail=(
                "Google Photos is not connected for this account. "
                "Sign out and sign back in with Google to grant Photos access."
            ),
        )

    raw = body.image_base64.strip()
    if len(raw) > 14_000_000:
        raise HTTPException(status_code=413, detail="Image payload too large")

    try:
        image_bytes = decode_base64_image(raw)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    if len(image_bytes) > 10_000_000:
        raise HTTPException(status_code=413, detail="Decoded image too large")

    try:
        uploaded = upload_photo_to_skill_album(
            access_token,
            skill_title=skill.title,
            image_bytes=image_bytes,
            mime_type=body.mime_type,
            label=body.label,
            description=body.description,
        )
    except httpx.HTTPStatusError as exc:
        detail = exc.response.text
        status = exc.response.status_code
        if status == 401:
            raise HTTPException(
                status_code=409,
                detail=(
                    "Google Photos authorization expired or was revoked. "
                    "Sign out and sign back in with Google."
                ),
            ) from exc
        if status == 429:
            raise HTTPException(status_code=429, detail="Google Photos rate limit hit.") from exc
        raise HTTPException(
            status_code=502,
            detail=f"Google Photos upload failed: {detail}",
        ) from exc
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"Google Photos upload failed: {exc}") from exc

    event = SkillProgressEvent(
        skill_id=skill.id,
        user_sub=user_sub,
        kind="photo_upload",
        label=body.label or f"{body.kind} upload",
        detail={
            "album_id": uploaded.get("albumId"),
            "album_title": uploaded.get("albumTitle"),
            "media_item_id": uploaded.get("mediaItemId"),
            "product_url": uploaded.get("productUrl"),
            "kind": body.kind,
            "mime_type": body.mime_type,
            "size_bytes": len(image_bytes),
        },
        metric_value=float(math.ceil(len(image_bytes) / 1024)),
    )
    session.add(event)
    session.commit()

    return {
        "albumId": str(uploaded.get("albumId") or ""),
        "albumTitle": str(uploaded.get("albumTitle") or skill.title),
        "mediaItemId": str(uploaded.get("mediaItemId") or ""),
        "productUrl": str(uploaded.get("productUrl") or ""),
    }
