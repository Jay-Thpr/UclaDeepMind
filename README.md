# Skill Quest (AI Skill Learner)

FastAPI + Vite app for AI-guided skill practice. The current flow is:

1. sign in with Google
2. create a skill and generate research
3. start a Gemini Live coaching session
4. capture annotated stills when needed
5. save post-session progress + summaries
6. optionally export summaries to Google Docs
7. optionally auto-save annotated stills to Google Photos albums

## Prerequisites

- **Python** 3.11+ (3.12 recommended)
- **Node.js** 20+ (LTS) and npm

## Quickstart

### 1. Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

Optional: copy env defaults:

```bash
cp ../.env.example .env
```

Start the API (default: [http://127.0.0.1:8000](http://127.0.0.1:8000)):

```bash
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Check health:

```bash
curl -s http://127.0.0.1:8000/api/health
# {"status":"ok"}
```

API docs: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

### 2. Frontend

In a **second** terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the URL Vite prints (usually [http://localhost:5173](http://localhost:5173)). The home page calls `/api/health` through the dev proxy, so the **API: connected** pill only turns green when the backend is running.

### 3. Production build

```bash
cd frontend
npm run build
npm run preview   # optional: serve dist locally
```

Backend sanity check:

```bash
cd backend
python3 -m compileall app
```

If the app is not served from Vite’s dev server, set `VITE_API_URL` to your API base (see [.env.example](.env.example)) so the browser can reach FastAPI directly.

## Configuration

| Variable | Where | Purpose |
| --- | --- | --- |
| `CORS_ORIGINS` | `backend/.env` | Comma-separated allowed browser origins (default: `http://localhost:5173`) |
| `GEMINI_API_KEY` | `backend/.env` | Server-only Gemini key for Live tokens, research, summaries, and image annotation |
| `GEMINI_LIVE_MODEL` | `backend/.env` | Live model id (default: `gemini-3.1-flash-live-preview`) |
| `GEMINI_IMAGE_MODEL` | `backend/.env` | Image model for annotated stills (`POST /api/annotations/form-correction`) |
| `GEMINI_RESEARCH_MODEL` | `backend/.env` | Text model for research dossiers |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | `backend/.env` | Google OAuth web client credentials |
| `GOOGLE_REDIRECT_URI` | `backend/.env` | Must match an authorized redirect URI on the OAuth client |
| `GOOGLE_DOCS_SERVICE_ACCOUNT_JSON` | `backend/.env` | Optional service-account JSON string for best-effort Google Docs summary export |
| `GOOGLE_DOCS_EXPORT_FOLDER_ID` | `backend/.env` | Optional Drive folder for exported Docs summaries |
| `JWT_SECRET` | `backend/.env` | Secret for signing session cookies |
| `COOKIE_SECURE` | `backend/.env` | `true` when serving the API over HTTPS |
| `DATABASE_URL` | `backend/.env` | Optional; default is SQLite at `backend/data/app.db` |
| `VITE_API_URL` | `frontend/.env` | Optional; leave empty in dev to use Vite’s `/api` proxy |

Full list of placeholders (Google, Gemini, Nano Banana): [.env.example](.env.example).

### Google sign-in and API access

1. In Google Cloud Console, create an **OAuth 2.0 Client ID** of type **Web application**.
2. Under **Authorized redirect URIs**, add exactly: `http://localhost:5173/auth/callback` (add your production URL when you deploy).
3. Put the client ID and secret in `backend/.env` as `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`, and set `GOOGLE_REDIRECT_URI` to the same URI you registered.
4. Enable the Google Photos Library API if you want annotated stills uploaded to Google Photos.
5. Restart the API and open the app; use **Sign in with Google** in the header. The app completes the callback at `/auth/callback`, stores an HTTP-only session cookie (`sk_session`), and also stores Google OAuth credentials server-side for backend Google API calls.

Notes:
- Existing sessions created before the broader Photos scopes were added need to sign out and sign back in once.
- `POST /api/auth/google/disconnect` removes stored Google API credentials without deleting the app account/session model.

### Live coaching architecture

- The browser never sees the long-lived Gemini key.
- The frontend calls `POST /api/live/ephemeral-token`.
- The backend returns:
  - a short-lived Gemini Live token
  - the backend-owned `systemInstruction`
  - prompt metadata such as `liveContextVersion`
- The browser opens Gemini Live with the short-lived token only.

Runtime live context comes from the app database, not Google Docs.

### Google Photos behavior

- Successful annotated stills can be uploaded to Google Photos via `POST /api/photos/upload`.
- Uploads are user-authorized, using the stored Google OAuth credentials.
- Photos are grouped into a Google Photos album whose title matches the skill title.
- Upload failures do not block live coaching or annotation.

### Skill persistence (SQLite)

The API stores app-owned state in SQLite (`backend/data/app.db` by default). Tables are created on startup.

Current persisted entities include:
- skills
- research dossiers
- progress events
- session summaries
- Google OAuth credentials

All routes below require an authenticated session unless noted otherwise.

| Method | Path | Purpose |
| ------ | ---- | ------- |
| `GET` / `POST` | `/api/skills` | List or create a skill (`title`, optional `notes`) |
| `GET` / `PATCH` / `DELETE` | `/api/skills/{skill_id}` | Read, rename/notes, or delete (cascades research + progress) |
| `GET` / `POST` | `/api/skills/{skill_id}/research` | List research entries (newest first) or append one (`content`, optional `title`, `extra` JSON) |
| `GET` | `/api/skills/{skill_id}/research/latest` | Latest research row (404 if none) |
| `GET` / `POST` | `/api/skills/{skill_id}/progress` | List or append progress events (`kind`, optional `label`, `detail` JSON, `metric_value`) |
| `GET` | `/api/skills/{skill_id}/session-summaries` | List structured post-session summaries |
| `POST` | `/api/skills/{skill_id}/complete-session` | Save one finished session, update stats, and generate a summary |
| `GET` | `/api/skills/{skill_id}/lesson-plan` | Return the stored/generated lesson plan for a skill |
| `POST` | `/api/skills/{skill_id}/lesson-plan/regenerate` | Regenerate the lesson plan from current skill research |
| `POST` | `/api/skills/create-with-research` | Create a skill, generate a Gemini research dossier, and attach a lesson plan |
| `GET` | `/api/skills/{skill_id}/live-system-instruction` | Debug route for the backend-owned Live prompt |
| `GET` | `/api/sessions` | Recent events with `kind === "session"` across all skills (convention for coaching runs) |
| `POST` | `/api/photos/upload` | Upload one annotated still to Google Photos for a specific skill |

Use [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs) to try authenticated calls (use **Authorize** with a session cookie, or sign in via the browser and copy the cookie into Swagger).

### List models for your API key

From the repo root (loads `backend/.env` then `.env`):

```bash
python3 scripts/check_gemini_key.py
python3 scripts/check_gemini_key.py --gemini-only
```

Each line shows the model id to use in config (no `models/` prefix) and `supportedGenerationMethods` (look for Live / bidirectional entries when picking `GEMINI_LIVE_MODEL`).

## Project layout

| Path | Role |
| --- | --- |
| [backend/](backend/) | FastAPI app: auth, skills, live coaching, annotations, Google Photos, optional Docs export |
| [frontend/](frontend/) | Vite/React client: dashboard, onboarding, live session UI, auth callback |
| [backend/app/services/live_context.py](backend/app/services/live_context.py) | Backend-owned Gemini Live prompt assembly |
| [backend/app/services/google_photos.py](backend/app/services/google_photos.py) | Google Photos upload + skill album handling |
| [backend/app/services/session_summary_docs.py](backend/app/services/session_summary_docs.py) | Optional Google Docs summary export |
| [GOOGLE_AUTH_AND_PHOTOS_PLAN.md](GOOGLE_AUTH_AND_PHOTOS_PLAN.md) | Notes for the Google auth / Photos integration direction |

## What Is Left

The biggest remaining gaps are:

1. tests for the new backend and frontend flows
2. encryption at rest for stored Google OAuth credentials
3. a clearer in-app settings/status surface for Google integration health
4. cleanup of transitional/debug-only routes if they are no longer needed

## License

Add a license if you open-source the repo.
