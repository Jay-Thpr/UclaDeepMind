from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

import httpx

GOOGLE_PHOTOS_API_BASE = "https://photoslibrary.googleapis.com/v1"


def _auth_headers(access_token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {access_token}"}


def build_skill_album_title(skill_title: str) -> str:
    title = " ".join(skill_title.strip().split())
    return title[:500] if title else "Skill coaching"


def _iter_albums(access_token: str) -> list[dict[str, Any]]:
    albums: list[dict[str, Any]] = []
    page_token: str | None = None
    with httpx.Client(timeout=30.0) as client:
        while True:
            params: dict[str, Any] = {"pageSize": 50}
            if page_token:
                params["pageToken"] = page_token
            res = client.get(
                f"{GOOGLE_PHOTOS_API_BASE}/albums",
                params=params,
                headers=_auth_headers(access_token),
            )
            res.raise_for_status()
            payload = res.json()
            items = payload.get("albums")
            if isinstance(items, list):
                albums.extend(item for item in items if isinstance(item, dict))
            page_token = payload.get("nextPageToken")
            if not isinstance(page_token, str) or not page_token:
                break
    return albums


def ensure_album(access_token: str, title: str) -> dict[str, Any]:
    normalized = build_skill_album_title(title)
    for album in _iter_albums(access_token):
        if album.get("title") == normalized:
            return album

    with httpx.Client(timeout=30.0) as client:
        res = client.post(
            f"{GOOGLE_PHOTOS_API_BASE}/albums",
            json={"album": {"title": normalized}},
            headers={
                **_auth_headers(access_token),
                "Content-Type": "application/json",
            },
        )
        res.raise_for_status()
        payload = res.json()
    album = payload.get("album")
    if not isinstance(album, dict):
        raise RuntimeError("Google Photos did not return an album")
    return album


def upload_bytes(access_token: str, image_bytes: bytes, filename: str) -> str:
    with httpx.Client(timeout=60.0) as client:
        res = client.post(
            f"{GOOGLE_PHOTOS_API_BASE}/uploads",
            content=image_bytes,
            headers={
                **_auth_headers(access_token),
                "Content-Type": "application/octet-stream",
                "X-Goog-Upload-Protocol": "raw",
                "X-Goog-Upload-File-Name": filename,
            },
        )
        res.raise_for_status()
        upload_token = res.text.strip()
    if not upload_token:
        raise RuntimeError("Google Photos upload token was empty")
    return upload_token


def create_media_item(
    access_token: str,
    *,
    upload_token: str,
    album_id: str | None,
    description: str | None,
) -> dict[str, Any]:
    body: dict[str, Any] = {
        "newMediaItems": [
            {
                "description": description or "",
                "simpleMediaItem": {"uploadToken": upload_token},
            }
        ]
    }
    if album_id:
        body["albumId"] = album_id

    with httpx.Client(timeout=60.0) as client:
        res = client.post(
            f"{GOOGLE_PHOTOS_API_BASE}/mediaItems:batchCreate",
            json=body,
            headers={
                **_auth_headers(access_token),
                "Content-Type": "application/json",
            },
        )
        res.raise_for_status()
        payload = res.json()

    results = payload.get("newMediaItemResults")
    if not isinstance(results, list) or not results:
        raise RuntimeError("Google Photos did not return a media item result")
    first = results[0] if isinstance(results[0], dict) else None
    if first is None:
        raise RuntimeError("Google Photos media item result was invalid")
    status = first.get("status")
    if isinstance(status, dict) and status.get("message"):
        raise RuntimeError(str(status["message"]))
    media_item = first.get("mediaItem")
    if not isinstance(media_item, dict):
        raise RuntimeError("Google Photos media item was missing")
    return media_item


def upload_photo_to_skill_album(
    access_token: str,
    *,
    skill_title: str,
    image_bytes: bytes,
    mime_type: str,
    label: str | None = None,
    description: str | None = None,
) -> dict[str, Any]:
    album = ensure_album(access_token, skill_title)
    album_id = album.get("id")
    if not isinstance(album_id, str) or not album_id:
        raise RuntimeError("Google Photos album id was missing")

    ext = "jpg"
    lower_mime = mime_type.lower()
    if "png" in lower_mime:
        ext = "png"
    elif "webp" in lower_mime:
        ext = "webp"
    filename_label = "-".join((label or "coaching-still").strip().lower().split()) or "coaching-still"
    filename = f"{filename_label}-{datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S')}.{ext}"

    upload_token = upload_bytes(access_token, image_bytes, filename)
    media_item = create_media_item(
        access_token,
        upload_token=upload_token,
        album_id=album_id,
        description=description,
    )
    return {
        "albumId": album_id,
        "albumTitle": album.get("title") or build_skill_album_title(skill_title),
        "mediaItemId": media_item.get("id"),
        "productUrl": media_item.get("productUrl"),
        "baseUrl": media_item.get("baseUrl"),
        "filename": media_item.get("filename") or filename,
    }
