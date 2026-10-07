# AI-Assisted Personalized Learning Assistant

An AI-assisted Personalized Learning Assistant with a three-tier architecture
using React, FastAPI, SQLite, and Gemini AI. The core learning-management
application works independently of Gemini; AI tutoring and guidance are
available only when learners explicitly request them.

## 1. Project overview

The application creates a local learning roadmap from a learner's name, goal,
skill level, and available study time. The Python knowledge base and
prerequisite logic drive topic selection and ordering. Topic completion and quiz
outcomes are stored in SQLite.

Existing features remain available: the local keyword-based Learning
Assistant, rule-based legacy roadmap endpoint, quizzes, analytics, Gemini
study recommendations, quiz explanations, and the AI Learning Tutor.

## 2. System architecture

```text
┌──────────────────────────────────┐
│ Presentation Layer               │
│ React + TypeScript + Vite        │
│ Input · Roadmap · Quiz · Progress│
└────────────────┬─────────────────┘
                 │ REST / JSON + PDF
                 ▼
┌──────────────────────────────────┐
│ Application Layer                │
│ FastAPI · Pydantic · Business    │──── explicit AI requests ────► Gemini
│ logic · API · PDF generation     │
└────────────────┬─────────────────┘
                 │ SQL
                 ▼
┌──────────────────────────────────┐
│ Data Layer                       │
│ SQLite: backend/data/            │
│ learning_assistant.db            │
└──────────────────────────────────┘
```

This is a simple three-tier web application:

1. **Presentation Layer:** the existing React interface collects preferences,
   displays roadmaps and progress, runs practice quizzes, and downloads files.
2. **Application Layer:** FastAPI validates requests, applies local knowledge
   base, prerequisite, quiz, and progress logic, reads/writes SQLite, and
   creates PDFs.
3. **Data Layer:** SQLite stores learner profiles, roadmaps, topics, completion
   status, and quiz results. `backend/knowledge/python.json` supplies the
   curated Python learning content.

Gemini is an optional service used only by explicit AI features. Normal
learning-path generation, progress, quizzes, and PDF downloads do not call
Gemini or depend on its availability. The API key stays on the backend.

## 3. Main features

- Local roadmap generation from the existing Python knowledge base, filtered
  by skill level and goal, with prerequisite-aware topic ordering.
- Topic descriptions, estimates, and practice questions supplied by the local
  knowledge base.
- Topic completion and quiz-result persistence in SQLite.
- Progress dashboard and learner-specific saved roadmap restoration.
- Existing local keyword assistant and Gemini tutor, recommendation, and quiz
  explanation features.
- Downloadable PDF report containing learner preferences, ordered topics,
  practice questions, progress, and generation date.
- Existing static frontend and Render deployment configuration are retained.

## 4. Project structure

```text
personalized-learning-assistant/
├── backend/
│   ├── main.py                 # FastAPI routes, validation, and AI integration
│   ├── database.py             # SQLite connection and schema initialization
│   ├── pdf_service.py          # Local PDF report generation
│   ├── chatbot.py              # Existing local knowledge-base assistant
│   ├── knowledge/python.json   # Curated topics, answers, and prerequisites
│   ├── data/                   # Created automatically; local database ignored by Git
│   └── requirements.txt
├── frontend/
│   ├── src/App.tsx             # Existing React learning interface
│   ├── src/App.css
│   ├── src/index.css
│   └── vite.config.ts          # Local proxy for FastAPI routes
├── render.yaml
└── README.md
```

The backend is kept in its existing single FastAPI entry point; database and PDF
responsibilities are separate small modules rather than duplicate router trees.

## 5. SQLite data model

The database is created automatically when FastAPI starts for the first time.
The file is `backend/data/learning_assistant.db`; no database server or manual
schema setup is required.

| Table | Main columns |
| --- | --- |
| `learners` | `id`, `name`, `skill_level`, `learning_goal`, `study_time`, `created_at` |
| `roadmaps` | `id`, `learner_id`, `title`, `description`, `roadmap_data`, `created_at` |
| `topics` | `id`, `roadmap_id`, `knowledge_topic_id`, `title`, `description`, `practice_question`, `estimated_minutes`, `order_index`, `completed` |
| `quiz_results` | `id`, `learner_id`, `topic`, `knowledge_topic_id`, `score`, `total_questions`, `created_at` |

Roadmaps and quiz results reference learners; topics reference roadmaps. SQLite
foreign-key enforcement is enabled for each connection. Generated local
database files are excluded by `.gitignore`.

## 6. AI integration

FastAPI calls Gemini using the existing Google `google-genai` SDK only when an
AI-specific endpoint is explicitly requested. These features are the AI tutor,
study recommendation, and incorrect-quiz-answer explanation. Roadmap generation
uses only the local knowledge base and prerequisite logic.

`GEMINI_API_KEY` is optional for core learning features. Configure it as a
backend environment variable to use AI assistance. Never put the key in React
code or a `VITE_` variable. If Gemini is unavailable, only the requested AI
feature returns an AI-specific error.

## 7. API endpoints

### SQLite-backed API

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/api/learners` | Create a validated learner profile. |
| `POST` | `/api/roadmap/generate` | Generate a local prerequisite-aware roadmap and store it with its topics. |
| `GET` | `/api/roadmap/{roadmap_id}` | Retrieve a saved roadmap, topics, and completion status. |
| `GET` | `/api/roadmaps?learner_id={id}` | List saved roadmaps, optionally filtered by learner. |
| `PATCH` | `/api/topics/{topic_id}/complete` | Persist a topic's completion state. |
| `POST` | `/api/quiz/submit` | Evaluate and store one quiz result. |
| `GET` | `/api/progress/{learner_id}` | Return completion and quiz progress for a learner. |
| `POST` | `/api/progress/{learner_id}/reset` | Clear saved completions and quiz results after the learner confirms reset. |
| `POST` | `/api/chat` | Return a contextual Gemini tutor response when explicitly requested. |
| `GET` | `/api/download/roadmap/{roadmap_id}` | Download a generated PDF report. |

The existing frontend uses its existing `/learning-path` route with a learner
name to create the learner and roadmap as one guided workflow. The standalone
`/api/learners` and `/api/roadmap/generate` endpoints are also available for
clients that want to make those two requests separately.

### Existing endpoints retained

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/` | Serve the production frontend when built. |
| `GET` | `/health` | Deployment health check. |
| `GET` | `/topics` | Return the existing local knowledge base. |
| `POST` | `/chat` | Existing keyword-based learning assistant. |
| `POST` | `/learning-path` | Generate a local prerequisite-aware path; optionally save it with the learner when a name is supplied. |
| `POST` | `/quiz` | Existing quiz endpoint for legacy clients. |
| `POST` | `/ai-tutor` | Existing Gemini tutor endpoint. |
| `POST` | `/ai-recommendation` | Gemini study recommendation. |
| `POST` | `/ai-quiz-explanation` | Gemini explanation for an incorrect answer. |

Interactive API documentation is available at `/docs` when the backend is
running.

## 8. Environment variables

| Variable | Purpose | Default |
| --- | --- | --- |
| `GEMINI_API_KEY` | Server-side Gemini API key. Required for AI features. | Not set |
| `GEMINI_MODEL` | Gemini model used by backend AI features. | `gemini-3.8-flash` |
| `AI_DAILY_LIMIT` | Maximum Gemini requests allowed per UTC day by the backend process. | `100` |
| `CORS_ORIGINS` | Comma-separated extra allowed browser origins. | Local Vite origins |

An optional `.env.example` is provided as a template; copy it to `.env` only if
your local setup loads environment files. Otherwise set the variables in the
terminal or your deployment's environment settings.

## 9. Local setup

Prerequisites: Python 3.10 or newer and Node.js/npm. A Gemini API key is
optional and is needed only for AI-backed functionality.

### Start FastAPI

From the repository root in PowerShell:

```powershell
cd backend
python -m pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000
```

FastAPI creates its SQLite database and tables on startup. Browse
`http://127.0.0.1:8000/docs` to explore the API.
Set `GEMINI_API_KEY` only if you want to use the optional AI features.

### Start React + Vite

In a second terminal, from the repository root:

```powershell
cd frontend
npm ci
npm run dev
```

Open the local URL shown by Vite (usually `http://localhost:5173`). The Vite
development proxy forwards API requests to FastAPI on port `8000`.

### Production frontend build

```powershell
cd frontend
npm ci
npm run build
```

The existing FastAPI root route serves `frontend/dist` when it exists.

## 10. Generate a roadmap

1. Enter your name, learning goal, skill level, and minutes available per day.
2. Select **Generate Learning Path**.
3. The browser sends the data to FastAPI. FastAPI saves the learner, selects
   prerequisite-ordered topics from `python.json`, and saves the roadmap and
   topics in SQLite. This action does not call Gemini.
4. The saved roadmap and local practice prompts appear in the interface.

## 11. Track progress and quizzes

Mark a roadmap topic complete or submit its practice answer. The frontend sends
the completion or quiz outcome to FastAPI, which stores it in SQLite. The
progress dashboard updates and the saved learner's latest roadmap and progress
are restored on a later visit in the same browser.

## 12. Download the roadmap

Select **Download Roadmap PDF** on the roadmap. FastAPI loads the learner,
roadmap, topics, and completion state from SQLite, creates the PDF locally using
ReportLab, and returns it as a file download. No external PDF service is used.

## 13. Deployment

The existing `render.yaml` remains the Render deployment configuration. It
installs `backend/requirements.txt`, builds the Vite frontend, starts Uvicorn,
and uses `/health` as the health check. Set `GEMINI_API_KEY` in the Render
service's secret environment variables; do not commit it.

SQLite is a local file. On hosting plans where the filesystem is ephemeral,
database contents may not survive instance replacement or restart. For durable
deployment, attach a persistent disk at `backend/data` where the platform and
plan support it. This does not affect local development.
