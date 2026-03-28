"""Remove image backgrounds: local `rembg` (default) or remove.bg API."""

from __future__ import annotations

import io

import httpx
from PIL import Image

from app.config import settings

REMOVE_BG_URL = "https://api.remove.bg/v1.0/removebg"


def _provider() -> str:
    return (settings.background_removal_provider or "rembg").strip().lower()


def remove_background_png(image_bytes: bytes, *, mime_type: str = "image/png") -> bytes:
    """
    Return PNG with alpha. Uses BACKGROUND_REMOVAL_PROVIDER:
    - rembg: local model (no API key; first run downloads weights)
    - remove_bg: cloud API (needs REMOVE_BG_API_KEY)
    """
    p = _provider()
    if p == "remove_bg":
        return _remove_via_remove_bg(image_bytes, mime_type=mime_type)
    if p in ("rembg", "local", ""):
        return _remove_via_rembg(image_bytes)
    raise RuntimeError(
        f"Unknown BACKGROUND_REMOVAL_PROVIDER={settings.background_removal_provider!r}; "
        "use rembg or remove_bg.",
    )


def _harden_rgba_png(png_bytes: bytes) -> bytes:
    """
    rembg often leaves semi-transparent fringe pixels — fine for photos, bad for pixel art.
    Snap alpha to fully opaque or fully transparent so colors don’t look “washed out” on white/UI.
    """
    threshold = int(settings.rembg_alpha_threshold)
    if threshold <= 0 or threshold > 255:
        return png_bytes

    im = Image.open(io.BytesIO(png_bytes)).convert("RGBA")
    r, g, b, a = im.split()
    a_hard = a.point(lambda p: 255 if p >= threshold else 0)
    out = Image.merge("RGBA", (r, g, b, a_hard))
    buf = io.BytesIO()
    out.save(buf, format="PNG", compress_level=6)
    return buf.getvalue()


def _remove_via_rembg(image_bytes: bytes) -> bytes:
    try:
        from rembg import remove
    except ImportError as exc:  # pragma: no cover
        raise RuntimeError(
            "rembg is not installed. Run: pip install 'rembg[cpu]'",
        ) from exc

    out = remove(
        image_bytes,
        post_process_mask=settings.rembg_post_process_mask,
        force_return_bytes=True,
    )
    if not out:
        raise RuntimeError("rembg returned empty output")
    if settings.rembg_alpha_threshold > 0:
        out = _harden_rgba_png(out)
    return out


def _remove_via_remove_bg(image_bytes: bytes, *, mime_type: str) -> bytes:
    key = settings.remove_bg_api_key.strip()
    if not key:
        raise RuntimeError(
            "REMOVE_BG_API_KEY is not configured (set BACKGROUND_REMOVAL_PROVIDER=rembg to use local removal)",
        )

    ext = "png" if "png" in mime_type.lower() else "jpg"
    filename = f"input.{ext}"

    files = {"image_file": (filename, image_bytes, mime_type or "image/png")}
    headers = {"X-Api-Key": key}

    with httpx.Client(timeout=120.0) as client:
        r = client.post(REMOVE_BG_URL, headers=headers, files=files)

    if r.status_code == 402:
        raise RuntimeError("remove.bg: payment required or credits exhausted")
    if r.status_code != 200:
        detail = r.text[:500] if r.text else r.reason_phrase
        raise RuntimeError(f"remove.bg error {r.status_code}: {detail}")

    out = r.content
    if not out:
        raise RuntimeError("remove.bg returned an empty body")

    if settings.rembg_alpha_threshold > 0:
        out = _harden_rgba_png(out)
    return out
