"""Optional Google Docs export for persisted session summaries.

Best-effort only. Runtime coaching must not depend on this.
Now uses user's OAuth credentials instead of service account.
"""

from __future__ import annotations

import httpx
from datetime import timezone
from sqlmodel import Session

from app.db_models import Skill, SkillSessionSummary
from app.services.google_oauth import get_valid_access_token


def export_session_summary_to_docs(
    *,
    summary: SkillSessionSummary,
    skill: Skill,
    user_email: str | None,
    session: Session,
) -> dict[str, str] | None:
    """Export session summary to Google Docs using user's OAuth credentials."""
    access_token = get_valid_access_token(session, summary.user_sub)
    if not access_token:
        return None

    docs_base = "https://docs.googleapis.com/v1"
    drive_base = "https://www.googleapis.com/drive/v3"
    headers = {"Authorization": f"Bearer {access_token}"}

    owner = user_email or summary.user_sub
    title = f"Skill Quest — {owner} — {skill.title} Session Summaries"

    with httpx.Client(timeout=30.0) as client:
        document_id = _find_doc_id(client=client, headers=headers, drive_base=drive_base, title=title)
        if not document_id:
            document_id = _create_doc(client=client, headers=headers, docs_base=docs_base, title=title)

        block = _format_summary_block(summary=summary, skill=skill)

        # Get current document to find end index
        doc_res = client.get(f"{docs_base}/documents/{document_id}", headers=headers)
        doc_res.raise_for_status()
        doc = doc_res.json()
        end_index = max(1, (doc.get("body", {}).get("content", [{}])[-1].get("endIndex", 1) or 1) - 1)

        # Insert text at end
        update_res = client.post(
            f"{docs_base}/documents/{document_id}:batchUpdate",
            headers=headers,
            json={
                "requests": [
                    {
                        "insertText": {
                            "location": {"index": end_index},
                            "text": block,
                        }
                    }
                ]
            },
        )
        update_res.raise_for_status()

    return {
        "document_id": document_id,
        "document_url": f"https://docs.google.com/document/d/{document_id}/edit",
    }


def _find_doc_id(*, client: httpx.Client, headers: dict, drive_base: str, title: str) -> str | None:
    """Search for existing Google Doc by title."""
    safe_title = title.replace("'", "\\'")
    query = f"mimeType='application/vnd.google-apps.document' and trashed=false and name='{safe_title}'"

    res = client.get(
        f"{drive_base}/files",
        headers=headers,
        params={"q": query, "fields": "files(id)", "pageSize": 1},
    )
    res.raise_for_status()
    files = res.json().get("files") or []
    if not files:
        return None
    return files[0].get("id")


def _create_doc(*, client: httpx.Client, headers: dict, docs_base: str, title: str) -> str:
    """Create a new Google Doc."""
    res = client.post(
        f"{docs_base}/documents",
        headers=headers,
        json={"title": title},
    )
    res.raise_for_status()
    created = res.json()
    return created["documentId"]


def _format_summary_block(*, summary: SkillSessionSummary, skill: Skill) -> str:
    created = summary.created_at.astimezone(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    lines = [
        "\n\n=====================================",
        f"SESSION {summary.session_number} - {created}",
        "=====================================",
        f"Skill: {skill.title}",
        f"Duration: {summary.duration_seconds} seconds",
        f"Coach note: {summary.coach_note or 'n/a'}",
        f"Progress delta: {summary.progress_delta:.1f}",
        f"Level ups: {summary.level_ups}",
        f"Mastered delta: {summary.mastered_delta}",
        "",
        "Summary",
        summary.summary_text,
    ]
    if summary.input_notes:
        lines.extend(["", "Learner / coach notes", summary.input_notes])
    return "\n".join(lines)
