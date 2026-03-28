"""Form-correction stills via Gemini image model (Nano Banana 2)."""

from __future__ import annotations

import base64

from google import genai
from google.genai import types

from app.config import settings

MARKUP_STYLE = """Visual style for the edited image:
- Draw clear coaching markup: arrows, circles, and short text labels (large, readable).
- Use high-contrast colors (yellow/white arrows; optional green for "correct" direction, red/orange for "adjust").
- Keep the original subject and background recognizable; do not replace the whole scene with an unrelated image."""

# When the Live coach sends text — image model must follow it, not improvise.
PROMPT_WITH_COACH_TEXT = """The LIVE COACH (real-time voice model) provided the corrections below. Your job is to VISUALIZE ONLY these suggestions on the attached photo.

Rules:
- Treat the block between the --- lines as authoritative. Do not add different problems or contradict the coach.
- Arrows, circles, and labels must match the coach's intent (body part, direction of movement, alignment).
- If the frame does not show something the coach mentioned, state that briefly in your text note and draw only what is visible.

--- COACH CORRECTIONS ---
{coach_text}
---
{extra_focus}{markup_style}

Output ONE edited image with that markup. Also a brief text note (one or two sentences) restating the same corrections in plain language."""

# No coach text — infer from the frame only.
PROMPT_NO_COACH_TEXT = """You are a movement and technique coach. The user attached a single photo of their form (sports, cooking, music posture, etc.).

Task: output ONE edited image based on this photo.
- Draw clear coaching markup on top of the scene: arrows, circles, and short text labels (large, readable).
- Show what to change (e.g. wrong angle) and the suggested correction direction.
- If the activity is unclear, give generic posture / alignment cues.

{markup_style}

Also include a brief text note (one or two sentences) describing the main correction."""


def _build_user_prompt(
    *,
    focus: str | None,
    coaching_hint: str | None,
) -> str:
    coach = (coaching_hint or "").strip()
    extra_focus = ""
    if focus and focus.strip():
        extra_focus = (
            f"Priority area to emphasize when it overlaps the corrections above: "
            f"{focus.strip()}\n\n"
        )

    if coach:
        return PROMPT_WITH_COACH_TEXT.format(
            coach_text=coach,
            extra_focus=extra_focus,
            markup_style=MARKUP_STYLE,
        )
    return PROMPT_NO_COACH_TEXT.format(markup_style=MARKUP_STYLE)


def annotate_form_photo(
    image_bytes: bytes,
    mime_type: str,
    *,
    focus: str | None = None,
    coaching_hint: str | None = None,
) -> tuple[bytes, str, str]:
    """
    Returns (output_image_bytes, output_mime_type, combined_text_notes).
    """
    if not settings.gemini_api_key.strip():
        raise RuntimeError("GEMINI_API_KEY is not configured")

    client = genai.Client(api_key=settings.gemini_api_key)

    prompt = _build_user_prompt(focus=focus, coaching_hint=coaching_hint)

    parts: list[types.Part] = [
        types.Part.from_bytes(data=image_bytes, mime_type=mime_type or "image/jpeg"),
        types.Part.from_text(text=prompt),
    ]

    # Stay closer to the coach's wording when we have explicit suggestions.
    temperature = 0.35 if (coaching_hint or "").strip() else 0.8

    response = client.models.generate_content(
        model=settings.gemini_image_model,
        contents=[types.Content(role="user", parts=parts)],
        config=types.GenerateContentConfig(
            response_modalities=[types.Modality.TEXT, types.Modality.IMAGE],
            temperature=temperature,
        ),
    )

    notes_parts: list[str] = []
    image_out: bytes | None = None
    out_mime = "image/png"

    cands = response.candidates
    if not cands:
        raise RuntimeError("No candidates in image model response")

    content = cands[0].content
    if not content or not content.parts:
        raise RuntimeError("Empty content from image model")

    for part in content.parts:
        if part.text:
            notes_parts.append(part.text)
        if part.inline_data and part.inline_data.data:
            image_out = part.inline_data.data
            if part.inline_data.mime_type:
                out_mime = part.inline_data.mime_type

    if image_out is None:
        raise RuntimeError(
            "Model returned no image. Try a clearer frame or a different GEMINI_IMAGE_MODEL.",
        )

    return image_out, out_mime, "\n".join(notes_parts).strip()


def decode_base64_image(data: str) -> bytes:
    try:
        return base64.b64decode(data, validate=True)
    except Exception as exc:  # noqa: BLE001
        raise ValueError("Invalid base64 image payload") from exc
