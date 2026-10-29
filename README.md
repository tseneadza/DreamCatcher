# 🌙 DreamCatcher

A full-stack personal wellness platform for dream journaling, goal tracking, idea capture, and sleep analysis — with AI-powered insights and a React Native mobile app.

## What It Does

DreamCatcher helps you capture the inner life your brain produces at night and connect it to the goals and ideas you're building during the day. Every entry is enriched by an AI layer (OpenAI) that interprets dreams, identifies patterns, brainstorms on ideas, and surfaces cross-module insights.

### Core Modules

- **Dream Journal** — Log dreams with title, narrative, mood (1–5), vividness, lucidity level, and dream type (normal / nightmare / lucid / daydream). AI auto-tags emotions, characters, and locations, and detects recurring themes.
- **Goal Tracker** — Track personal, career, health, learning, and financial goals with milestones, progress %, priority, and target dates. AI generates actionable suggestions and surfaces related dreams.
- **Idea Capture** — Brainstorm mode lets the AI riff on any idea you dump in, expanding it with suggestions and lateral connections.
- **Sleep Log** — Record sleep quality alongside dreams so you can correlate rest patterns with dream vividness over time.
- **AI Insights Dashboard** — Cross-module analysis: dream pattern reports, recurring symbols, goal vs dream alignment, and a daily insight digest.
- **Saved Filters** — Save and replay complex search/filter combinations across any module.
- **Research Mode** — Optional anonymized dream data contribution with explicit consent tracking (`ResearchConsent`, `DreamResearchEvent`, `DreamResearchAggregate` models).

## Architecture

```
DreamCatcher/
├── backend/               FastAPI + SQLAlchemy (Python)
│   ├── main.py            App entrypoint, CORS config, DB lifespan
│   ├── config.py          Pydantic settings (DB URL, JWT secret, OpenAI key)
│   ├── database.py        SQLite engine + declarative Base
│   ├── models/            SQLAlchemy ORM models
│   │   ├── user.py
│   │   ├── dream.py       Rich dream schema (mood, lucidity, emotions[], tags[])
│   │   ├── goal.py        Goal with status enum, milestones[], ai_suggestions
│   │   ├── idea.py
│   │   ├── sleep_log.py   1:1 linked to a Dream
│   │   ├── saved_filter.py
│   │   ├── research_consent.py
│   │   ├── dream_research_event.py
│   │   └── dream_research_aggregate.py
│   ├── routers/           Route handlers
│   │   ├── auth.py        JWT register / login / me
│   │   ├── dreams.py
│   │   ├── goals.py
│   │   ├── ideas.py
│   │   ├── sleep.py
│   │   ├── ai.py          Insights · brainstorm · auto-tag · pattern analysis
│   │   ├── research.py
│   │   └── filters.py
│   └── services/          Business logic + OpenAI wrapper
├── frontend/              React 18 + TypeScript + Tailwind CSS (Vite)
│   └── src/
├── mobile/                React Native (Expo) + NativeWind
│   └── app/
│       ├── (auth)/        Login / register screens
│       └── (tabs)/        Dreams · Goals · Ideas · Sleep · Profile
├── start.sh               Starts backend (:5111) + frontend (:5120)
├── requirements.txt
└── app.json               Codehome Hub discovery manifest (id: dreamcatcher)
```

## Tech Stack

| Layer | Technology |
|---|---|
| Backend API | FastAPI, SQLAlchemy, Pydantic v2, Python 3.11+ |
| Database | SQLite — `dreamcatcher.db` (auto-created on first run) |
| Auth | JWT — 7-day tokens via `python-jose` |
| AI | OpenAI GPT (via `openai` SDK) |
| Web Frontend | React 18, TypeScript, Tailwind CSS v4, Vite |
| Mobile | React Native (Expo), NativeWind, TypeScript |

## Quick Start

### 1. Configure environment

```bash
cd DreamCatcher
cp .env.example .env
# Fill in OPENAI_API_KEY — required for AI features only
```

`.env` keys:
```
DATABASE_URL=sqlite:///./dreamcatcher.db
SECRET_KEY=change-me-in-production
OPENAI_API_KEY=sk-...
```

### 2. Backend

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

cd backend
uvicorn main:app --host 0.0.0.0 --port 5111 --reload
```

Interactive API docs: http://localhost:5111/docs

### 3. Web frontend

```bash
cd frontend
npm install
npm run dev     # http://localhost:5120
```

### 4. Mobile (Expo)

```bash
cd mobile
npm install
npx expo start
```

Press `i` for iOS simulator, `a` for Android, or scan the QR code with Expo Go on a physical device.

### One-command start (web)

```bash
./start.sh
```

Launches FastAPI on `:5111` and Vite on `:5120` in parallel. `Ctrl+C` to stop both.

### From Codehome Hub

DreamCatcher is registered as app id `dreamcatcher`, port `5120`. Start it directly from the Hub card at http://localhost:8085.

## API Reference

All routes require a `Bearer <token>` header after login (except `/auth/register` and `/auth/login`). Full interactive docs at http://localhost:5111/docs.

| Router | Key Endpoints |
|---|---|
| `/auth` | `POST /register`, `POST /login`, `GET /me` |
| `/dreams` | Full CRUD + `GET /{id}/analysis` |
| `/goals` | Full CRUD + milestone updates, progress % |
| `/ideas` | Full CRUD |
| `/sleep` | Full CRUD — linked 1:1 to a dream entry |
| `/ai` | `GET /insights`, `POST /brainstorm`, `POST /auto-tag`, `GET /patterns` |
| `/filters` | Save & replay named filter sets |
| `/research` | Consent management + anonymized event log |

## Data Model Highlights

**Dream** fields: `title`, `content`, `mood` (1–5), `vividness` (1–5), `lucidity_level` (0–5), `dream_type` (normal/nightmare/lucid/daydream), `emotions[]`, `characters[]`, `locations[]`, `is_recurring`, `recurring_theme`, `ai_interpretation`, linked `goal_id`.

**Goal** fields: `title`, `category` (personal/career/health/learning/financial/other), `status` (not_started/in_progress/completed/paused/cancelled), `progress` (0–100), `milestones[]`, `priority`, `target_date`, `ai_suggestions`.

## Development Notes

- The SQLite database is auto-created via `Base.metadata.create_all()` on startup — no migration step needed in development.
- All features except AI insights/brainstorm/auto-tag work without an OpenAI key.
- `SECRET_KEY` defaults to a dev placeholder — always override in any shared or production deployment.
- CORS is pre-configured for Vite dev (`:5173`, `:5120`), Expo web (`:8081`, `:19006`), and LAN addresses for Expo Go on physical devices.

## Roadmap

See `TODO.md` for the active task list. Planned next steps:

- Auth UI (web + mobile login / register flows)
- Kanban view for goal milestones
- AI daily digest with push notification (mobile)
- Dream / goal export to Markdown and CSV
- PostgreSQL migration path for multi-user deployments
