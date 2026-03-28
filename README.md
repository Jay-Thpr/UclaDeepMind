# Skill Quest (AI Skill Learner)

Hackathon scaffold: **FastAPI** backend + **Vite React** web app for an AI coaching flow (research → live session → summaries). The UI is a game-style shell; Google/Gemini/Nano Banana wiring comes next.

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

Optional: copy env defaults (CORS, future API keys):

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

### 3. Production build (frontend only)

```bash
cd frontend
npm run build
npm run preview   # optional: serve dist locally
```

If the app is not served from Vite’s dev server, set `VITE_API_URL` to your API base (see [.env.example](.env.example)) so the browser can reach FastAPI directly.

## Configuration

| Variable | Where | Purpose |
|----------|--------|---------|
| `CORS_ORIGINS` | `backend/.env` | Comma-separated allowed browser origins (default: `http://localhost:5173`) |
| `VITE_API_URL` | `frontend/.env` | Optional; leave empty in dev to use Vite’s `/api` proxy |

Full list of placeholders (Google, Gemini, Nano Banana): [.env.example](.env.example).

## Project layout

| Path | Role |
|------|------|
| [backend/](backend/) | FastAPI app, routers under `app/routers/`, stubs for auth, skills, sessions, research, live |
| [frontend/](frontend/) | React routes: home, onboarding, dashboard, live session placeholder |
| [.cursor/plans/](.cursor/plans/) | Product / implementation plan |

## License

Add a license if you open-source the repo.
