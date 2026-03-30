# Bear With Me

Your AI coach for real-world skills.

![React](https://img.shields.io/badge/React-18-61dafb?logo=react&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688?logo=fastapi&logoColor=white)
![Gemini](https://img.shields.io/badge/Gemini-Live-8E75B2?logo=google&logoColor=white)
![Google Cloud](https://img.shields.io/badge/Google_Cloud-OAuth-4285F4?logo=googlecloud&logoColor=white)
![Python](https://img.shields.io/badge/Python-3.11+-3776AB?logo=python&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?logo=typescript&logoColor=white)

![Bear With Me hero](screenshots/hero-banner.png)

Bear With Me is a multimodal coaching app that helps learners practice real skills with live feedback, visual corrections, and persistent progression. Instead of acting like a generic chat assistant, it researches a skill, launches a live coaching session, and generates annotated feedback directly on the learner's own practice footage.

## Table of Contents
- [What It Does](#what-it-does)
- [The Problem](#the-problem)
- [Our Solution](#our-solution)
- [What Makes This Special](#what-makes-this-special)
- [Demo Flow](#demo-flow)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Quick Start](#quick-start)
- [Local Setup](#local-setup)
- [Configuration Reference](#configuration-reference)
- [Product Architecture](#product-architecture)
- [Deployment Notes](#deployment-notes)
- [Future Work](#future-work)

---

## What It Does

- **Research-first coaching**: Generate a Gemini research dossier for any skill before you start practicing
- **Live multimodal session**: Connect camera and microphone for real-time spoken coaching with Gemini Live
- **Visual form correction**: Capture annotated stills from your own practice footage showing proper technique
- **Google Cloud integration**: Auto-upload annotated images to Google Photos, export session summaries to Google Docs
- **Persistent progression**: Track skills, levels, streaks, practice time, and session history across your Google account

---

## The Problem

![The Problem](screenshots/problem-slide.png)

Learning real-world skills—cooking, movement, music, physical techniques—still has three major gaps:

- **YouTube tutorials** are broad, one-way, and not personalized to what you're doing wrong right now
- **Human coaches** are powerful but expensive, scarce, and not always available on demand
- **Current AI tutors** are usually chat-first products with weak connection to embodied practice

For physical skills, the hard part isn't access to information. The hard part is getting **timely, specific feedback while practicing**.

---

## Our Solution

![Our Solution](screenshots/solution-slide.png)

Bear With Me is a generalized coaching engine for skill-building.

The system first creates a structured knowledge base for the selected skill, then uses that context during a live Gemini session to coach the learner in real time. When words aren't enough, it captures a still from the learner's own video and generates visual corrections directly on top of the frame.

**The learning loop:**

1. Research the skill → structured dossier generation
2. Coach the learner live → multimodal Gemini Live session
3. Generate visual corrections → annotated stills from your practice footage
4. Save progress → session summaries, stats, and Google integration
5. Carry context forward → next session uses previous progression and coach notes

---

## What Makes This Special

### 1. Research-First Coaching

The app generates a structured skill dossier **before** coaching starts, giving the AI deep domain context instead of relying on a generic prompt.

**Research covers:**
- Skill overview and core concepts
- Skill decomposition into learnable components
- Progression milestones and practice design
- Common mistakes and safety notes

### 2. Live Multimodal Feedback

Gemini Live responds to **camera and microphone** in real-time with concise spoken guidance. The coach sees what you're doing and hears what you're asking.

### 3. Visual Corrections on Your Footage

When verbal feedback isn't enough, the app captures **your actual practice frame** and generates an annotated correction showing the proper form, grip, or posture.

![Live coaching with annotated correction](screenshots/live-annotated-session.png)

### 4. Persistent Google Integration

**OAuth-secured sessions** with encrypted credential storage:

- **Annotated stills auto-upload** to your Google Photos in a skill-specific album
- **Session summaries export** to your Google Docs with duration, progress delta, and coach notes
- **All scoped to your Google account** - your data, your cloud storage

### 5. Progression Memory

The backend persists:
- Skills and research dossiers
- Progress events (level-ups, photos, milestones)
- Session summaries with coach notes
- Stats: level, streak, total practice time, mastery percentage

This allows the AI to **remember your journey** and personalize future sessions.

---

## Demo Flow

### 1. Pick a focus area

The experience starts with a playful skill picker that makes the product feel like a guided journey.

![Skill picker](screenshots/skill-select-arena.png)

### 2. Create your skill

Enter a skill, concrete goal, and starting level. The backend generates a Gemini research dossier and persists the new skill.

![Create your skill](screenshots/onboarding-flow.png)

### 3. Review your journey

The dashboard shows your selected skill, current level, accumulated practice, streak, and progress toward the next level.

![Journey dashboard](screenshots/dashboard-journey.png)

### 4. Start a live coaching session

Start camera and microphone, connect to Gemini Live, and receive spoken realtime guidance. When verbal feedback is insufficient, the app captures a still and generates a marked-up correction image.

![Live coaching session](screenshots/live-annotated-session.png)

---

## Architecture

The system flows through authentication, skill creation, live coaching, and persistence. Parallel processes (voice coaching + visual corrections) run simultaneously during sessions.

```mermaid
flowchart TD
    A[User visits app] --> B[Google OAuth login]
    B --> C[Token exchange & encryption]
    C --> D[(Encrypted credentials stored)]

    D --> E[Create skill + goal]
    E --> F[Gemini generates research dossier]
    F --> G[(Skill + research in DB)]
    G --> H[Dashboard: level, stats, streak]

    H --> I[Start live session]
    I --> J[Backend mints ephemeral Live token]
    J --> K[Assemble system instruction from DB]
    K --> L[Connect: Gemini Live + camera + mic]

    L --> M[Voice coaching]
    L --> N{Need visual<br/>correction?}

    N -->|Yes| O[Capture video frame]
    O --> P[Gemini image model annotates]
    P --> Q[Display correction]
    Q --> R[Upload to Google Photos]

    M --> S[End session]
    R --> S
    S --> T[Gemini summarizes progress]

    T --> U[(Stats + progress events)]
    T --> V[(Session summary)]
    V --> W[Export to Google Docs]

    style A fill:#e3f2fd
    style B fill:#e3f2fd
    style C fill:#e3f2fd
    style D fill:#e3f2fd

    style E fill:#f3e5f5
    style F fill:#f3e5f5
    style G fill:#f3e5f5
    style H fill:#f3e5f5

    style I fill:#fff3e0
    style J fill:#fff3e0
    style K fill:#fff3e0
    style L fill:#fff3e0
    style M fill:#fff3e0
    style N fill:#fff3e0
    style O fill:#fff3e0
    style P fill:#fff3e0
    style Q fill:#fff3e0
    style R fill:#fff3e0
    style S fill:#fff3e0
    style T fill:#fff3e0

    style U fill:#e8f5e9
    style V fill:#e8f5e9
    style W fill:#e8f5e9
```

### Key Technical Decisions

- **Browser never sees long-lived Gemini API key** - backend mints ephemeral Live tokens per session
- **Skill-specific system instructions** - Live context assembled from stored research, stats, and recent summaries
- **OAuth tokens encrypted at rest** - Fernet (cryptography.io) with base64-encoded 32-byte keys
- **Form correction rate-limited** - 30-second cooldown prevents annotation spam
- **Google Photos album per skill** - annotated stills organized by skill title
- **Session-scoped auth cookies** - HTTP-only, SameSite=Lax, secure in production

---

## Tech Stack

### Frontend
- React + TypeScript
- Vite (dev server + build)
- React Router

### Backend
- FastAPI
- Uvicorn
- SQLModel / SQLAlchemy
- SQLite (dev) / Postgres (production)

### AI
- **Gemini Live API** - real-time multimodal coaching
- **Gemini image generation** - annotated form corrections
- **Gemini text generation** - skill research dossiers

### Google Cloud
- **OAuth 2.0** - user authentication and authorization
- **Photos Library API** - album creation and media uploads
- **Docs API** - session summary document export
- **Drive API** - file management and permissions

---

## Quick Start

**TL;DR:** OAuth setup → Backend + Frontend → Create skill → Start coaching

1. Get [Google OAuth credentials](https://console.cloud.google.com/apis/credentials) and [Gemini API key](https://ai.google.dev/)
2. Clone repo and configure `.env` files ([details](#local-setup))
3. Start backend: `uvicorn app.main:app --reload --port 3000`
4. Start frontend: `npm run dev`
5. Visit `http://localhost:5173` and sign in with Google
6. Create your first skill and start a coaching session

[Full setup instructions →](#local-setup)

---

## Local Setup

### Prerequisites

- Python 3.11+ (3.12 recommended)
- Node.js 20+ and npm
- Google Cloud project with OAuth 2.0 credentials
- Gemini API key

### 1. Backend setup

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

Create `backend/.env` (or copy from `../.env.example`):

```bash
# Gemini API (required)
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_LIVE_MODEL=gemini-3.1-flash-live-preview
GEMINI_IMAGE_MODEL=gemini-3.1-flash-image-preview
GEMINI_RESEARCH_MODEL=gemini-3-flash-preview

# Google OAuth (required)
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your_client_secret
GOOGLE_REDIRECT_URI=http://localhost:5173/auth/callback

# Session security (required)
JWT_SECRET=your_random_jwt_secret_here
GOOGLE_TOKEN_ENCRYPTION_KEY=your_base64_fernet_key_here

# Database (optional, defaults to SQLite)
DATABASE_URL=sqlite:///./skillquest.db

# CORS (required)
FRONTEND_ORIGIN=http://localhost:5173
CORS_ORIGINS=http://localhost:5173

# Optional: Google Docs export via service account
GOOGLE_DOCS_SERVICE_ACCOUNT_JSON=
GOOGLE_DOCS_EXPORT_FOLDER_ID=

# Cookie security (set true behind HTTPS in production)
COOKIE_SECURE=false
```

**Generate encryption key:**

```python
# In Python shell
from cryptography.fernet import Fernet
print(Fernet.generate_key().decode())
# Use output for GOOGLE_TOKEN_ENCRYPTION_KEY
```

**Start the API:**

```bash
uvicorn app.main:app --reload --host 127.0.0.1 --port 3000
```

**Check health:**

```bash
curl -s http://127.0.0.1:3000/api/health
```

**API docs:** http://127.0.0.1:3000/docs

### 2. Frontend setup

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the Vite URL shown in the terminal (usually http://localhost:5173)

### 3. Google Cloud Console setup

1. Create a new OAuth 2.0 Client (Web application)
2. Add authorized redirect URI: `http://localhost:5173/auth/callback`
3. Set User Type to "External" (or add test users if Internal)
4. Required scopes:
   - openid, email, profile
   - `https://www.googleapis.com/auth/photoslibrary.appendonly`
   - `https://www.googleapis.com/auth/photoslibrary.readonly.appcreateddata`
   - `https://www.googleapis.com/auth/drive.file`
   - `https://www.googleapis.com/auth/calendar.events`
   - `https://www.googleapis.com/auth/documents`

---

## Configuration Reference

| Variable | Location | Purpose |
|----------|----------|---------|
| `GEMINI_API_KEY` | `backend/.env` | Server-side Gemini key (keep secret) |
| `GEMINI_LIVE_MODEL` | `backend/.env` | Live model ID for coaching sessions |
| `GEMINI_IMAGE_MODEL` | `backend/.env` | Image model for annotated stills |
| `GEMINI_RESEARCH_MODEL` | `backend/.env` | Text model for research dossiers |
| `GOOGLE_CLIENT_ID` | `backend/.env` | OAuth 2.0 client ID |
| `GOOGLE_CLIENT_SECRET` | `backend/.env` | OAuth 2.0 client secret |
| `GOOGLE_REDIRECT_URI` | `backend/.env` | OAuth callback URL |
| `JWT_SECRET` | `backend/.env` | Session token signing key |
| `GOOGLE_TOKEN_ENCRYPTION_KEY` | `backend/.env` | Fernet key for encrypting stored OAuth tokens |
| `DATABASE_URL` | `backend/.env` | Database connection string (defaults to SQLite) |
| `CORS_ORIGINS` | `backend/.env` | Allowed browser origins |
| `COOKIE_SECURE` | `backend/.env` | Set `true` behind HTTPS in production |
| `VITE_API_URL` | `frontend/.env` | Optional: API base for non-dev deployments |

Full placeholder list: [`.env.example`](.env.example)

---

## Product Architecture

### Research Layer

Skill creation triggers a Gemini-generated markdown dossier covering:

- Skill overview and core concepts
- Skill decomposition into learnable components
- Progression milestones and practice design
- Common mistakes and safety notes (when relevant)

This research row becomes part of the live coaching context.

### Live Coaching Layer

The session experience combines:

- Browser camera + mic capture
- Gemini Live realtime WebSocket connection
- Dynamic system-instruction assembly from persisted skill memory
- Short spoken coaching responses optimized for practice flow

### Visual Correction Layer

Annotated stills are generated from the learner's own camera frame. The image model is prompted to **show the corrected posture** or tool position, not just overlay arrows on top of a mistake.

Rate-limited to 30-second cooldown to prevent spam.

### Persistence Layer

The backend stores:

- **Skills** - title, goal, starting level, user ownership
- **Research entries** - Gemini-generated skill dossiers
- **Progress events** - level-ups, photos, milestones, practice sessions
- **Session summaries** - duration, coach notes, progress delta, Gemini-estimated learning outcomes

This allows the app to keep a **memory of practice over time** and personalize future sessions.

### Google Integration Layer

**Photos:** Annotated stills are uploaded to a skill-specific album in the user's Google Photos. The album is created if it doesn't exist. Returns `album_id`, `media_item_id`, and `product_url`.

**Docs:** Session summaries are appended to a Google Doc titled `"Skill Quest — {email} — {skill_title} Session Summaries"`. The document is created if it doesn't exist. Exports include session number, duration, coach notes, progress delta, and summary text.

**Drive:** (Scoped for future expansion) User-authorized file storage for practice videos, skill resources, and coach-curated materials.

**Calendar:** (Scoped for future expansion) Scheduled practice reminders and session booking.

---

## Deployment Notes

### Backend

- Set `DATABASE_URL` to Postgres connection string for production
- Set `COOKIE_SECURE=true` when behind HTTPS
- Set `CORS_ORIGINS` to your deployed frontend origin
- Never expose `GEMINI_API_KEY` or `JWT_SECRET` in client-side code

### Frontend

Set `VITE_API_URL` before `npm run build`:

```bash
VITE_API_URL=https://your-backend.onrender.com npm run build
```

Then deploy the `frontend/dist` folder to your static host.

### Database

SQLite is fine for demos and local development. For production with multiple users:

```bash
DATABASE_URL=postgresql+psycopg2://user:pass@host:5432/dbname?sslmode=require
```

Migrations are handled automatically via SQLModel on startup.

---

## Repo Structure

```
backend/        FastAPI API, DB models, routers, Gemini services
frontend/       React app, routes, live session UI, client-side API hooks
screenshots/    README and demo assets
.cursor/        Planning artifacts
```

---

## Future Work

### 🎯 Core Features
- **Grounded research** - Integrate YouTube and Google Search APIs for skill-specific video and article sourcing
- **Richer learner model** - Multi-session personalization with explicit intervention-tier orchestration
- **Cross-domain proof** - Demonstrate stronger coverage beyond the current cooking/knife-skills focus

### 🔌 Integrations
- **Calendar integration** - Scheduled practice reminders and streak notifications
- **Video recording** - Full session playback with timestamped annotations and coach callouts

### 🌐 Community
- **Skill sharing** - Export and import skill dossiers between users

---

## Credits

Built with Gemini Live API, Google Cloud Platform, FastAPI, and React.

Designed for learners who want to bridge the gap between knowing and doing.
