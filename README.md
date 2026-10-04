# AI-Powered Personalized Learning Assistant

## Project Links

- **Live application:** https://personalized-learning-assistant-v8hc.onrender.com
- **GitHub repository:** https://github.com/ravulapavan95e-ship-it/MINI-PROJECT

## 1. Project Overview

The AI-Powered Personalized Learning Assistant is a Python-learning web
application that combines rule-based learning paths and quizzes with two
learning-support options: a local keyword-based assistant and an AI Learning
Tutor. Learners can request an ordered roadmap based on their learning goal,
skill level, available study time, completed topics, and topic prerequisites.

The Gemini-powered tutor provides natural-language explanations and study
guidance tailored to the learner context available in the application. Existing
roadmap generation, knowledge-base assistance, quizzes, and browser-based
progress tracking remain available.

## 2. Objectives

- Generate an ordered Python learning roadmap based on a learner's goal and
  current skill level.
- Estimate study duration using the learner's available daily study time.
- Sequence roadmap topics using prerequisite information in the local
  knowledge base.
- Offer both keyword-based learning assistance and personalized AI tutoring.
- Provide topic quizzes, scores, and recommendations to review or continue.
- Track completed topics and quiz scores in the browser.

## 3. Key Features

- **Personalized learning paths:** Uses the learning goal, skill level, study
  time, and completed topics to generate a roadmap.
- **Prerequisite-based sequencing:** Uses topic-level and prerequisite
  information from the local Python knowledge base.
- **Learning Assistant:** Matches questions to knowledge-base keywords and
  returns a topic explanation, practice question, answer, and match score.
- **AI Learning Tutor:** Uses the Google Gemini API to provide a natural
  language explanation, example, common mistake, practice question, hint, and
  suggested next topic, adapted to the learner's level and available progress
  context.
- **AI Study Recommendation:** Combines quiz scores and weak topics with
  prerequisite-checked roadmap order to suggest whether to review or continue,
  a study duration, and practice activities.
- **AI quiz explanation:** After an incorrect answer, explains the tested
  concept, the expected answer, and a short practice prompt.
- **Topic quizzes:** Checks submitted answers and provides a score, feedback,
  the correct answer when applicable, and an adaptive recommendation.
- **Progress tracking:** Allows learners to mark topics complete and saves
  completed topics and quiz scores in browser `localStorage`.
- **Learning analytics:** Displays roadmap progress, completed topics, quiz
  attempts, average quiz score, topics for review, and a recommendation.
- **Daily AI usage limit:** Applies the server-side `AI_DAILY_LIMIT` setting
  across Gemini-powered features; it defaults to 100 requests per UTC day.

## 4. Technology Stack

### Frontend

- React
- TypeScript
- Vite
- HTML and CSS

### Backend

- Python
- FastAPI
- Pydantic
- Uvicorn

### AI/Logic

- Google Gemini API through Google's official `google-genai` Python SDK
- Gemini `gemini-3.8-flash` model for AI tutoring
- Rule-based roadmap selection and prerequisite ordering
- Keyword matching against the local Python knowledge base for the existing
  assistant
- Normalized text comparison for quiz answers
- Local JSON knowledge base at `backend/knowledge/python.json`

### Build/Deployment

- npm and Vite for frontend development and production builds
- Render web service configured by `render.yaml`

## 5. System Architecture

```text
                           User
                            │
                            ▼
                  React + TypeScript
                     (Vite frontend)
                            │
                        HTTP / JSON
                            │
                            ▼
                       FastAPI
                  ┌─────────┴──────────┐
                  │                    │
                  ▼                    ▼
       Roadmap, prerequisite,     AI Learning Tutor
        and quiz logic                 │
                  │                    ▼
                  │               Gemini API
                  │                    │
                  └─────────┬──────────┘
                            ▼
              Personalized learning response
                            ▲
                            │
              Local Python knowledge base
```

The browser sends learning requests to FastAPI. Rule-based roadmap, chat, and
quiz operations use the backend and local knowledge base. The AI Tutor sends
its request and relevant learning context from FastAPI to Gemini; the Gemini
API key is kept on the server and is not sent to the frontend.

## 6. Application Workflow

1. The learner enters a goal, skill level, and daily study time.
2. The frontend sends the learning details and completed-topic IDs to
   `POST /learning-path`.
3. FastAPI selects topics from the local knowledge base, orders prerequisites,
   estimates the study duration, and returns the roadmap.
4. The learner can use the existing Learning Assistant, submit topic answers
   to quizzes, and mark topics as complete.
5. For AI assistance, the learner submits a question to `POST /ai-tutor`. The
   frontend includes concise learner context, such as skill level, available
   study time, roadmap position, quiz scores, and weak topics.
6. After a quiz, the learner can request an AI Study Recommendation or ask for
   an explanation of an incorrect answer. FastAPI validates the quiz topic and
   uses prerequisite-aware roadmap order to choose a valid next topic.
7. FastAPI applies the daily usage limit to each Gemini request and returns
   personalized explanations or study guidance to the frontend.
8. The application updates its progress and analytics from the learner's
   completed topics and quiz scores.

## 7. Project Structure

```text
personalized-learning-assistant/
├── backend/
│   ├── main.py
│   ├── chatbot.py
│   ├── requirements.txt
│   └── knowledge/
│       └── python.json
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── App.css
│   │   ├── index.css
│   │   └── main.tsx
│   ├── index.html
│   ├── package.json
│   └── vite.config.ts
├── render.yaml
└── README.md
```

## 8. Installation and Local Setup

### Prerequisites

- Python and pip
- Node.js and npm
- A Gemini API key to use the AI Learning Tutor

### Configure the backend environment

Set `GEMINI_API_KEY` in the backend process environment. Do not put the key in
frontend settings, source files, or the repository. Optionally set
`AI_DAILY_LIMIT`; its default is `100`.

For example, in PowerShell, set the variables in the terminal before starting
the backend:

```powershell
$env:GEMINI_API_KEY = "<your Gemini API key>"
$env:AI_DAILY_LIMIT = "100"
```

### Start the backend

From a terminal at the repository root:

```bash
cd backend
python -m pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000
```

FastAPI's interactive API documentation is available at
`http://127.0.0.1:8000/docs`.

### Start the frontend

Open a second terminal at the repository root:

```bash
cd frontend
npm ci
npm run dev
```

Open the local URL printed by Vite, usually `http://localhost:5173`. Vite
proxies API requests to the local FastAPI server on port `8000`.

### Build the frontend

```bash
cd frontend
npm run build
```

## 9. API Endpoints

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/` | Serves the frontend when a production build is available; otherwise returns an API status message. |
| `GET` | `/health` | Returns the backend health status. |
| `GET` | `/topics` | Returns the subject and available knowledge-base topics. |
| `POST` | `/chat` | Matches a question to the local knowledge base. |
| `POST` | `/learning-path` | Generates a personalized roadmap. |
| `POST` | `/quiz` | Checks a topic answer and returns feedback. |
| `POST` | `/ai-tutor` | Returns a Gemini-powered response using the supplied learner context. |
| `POST` | `/ai-recommendation` | Returns a Gemini-assisted study recommendation while preserving prerequisite-based topic order. |
| `POST` | `/ai-quiz-explanation` | Explains an incorrect answer for a known quiz topic. |

## 10. Configuration and Usage Limit

| Environment variable | Purpose | Default |
| --- | --- | --- |
| `GEMINI_API_KEY` | Server-side credential used by FastAPI to access Gemini. | Not set |
| `AI_DAILY_LIMIT` | Maximum AI Tutor requests allowed per day by the running backend process. | `100` |

Set both variables in the Render service's environment settings for the
deployed AI Tutor. The API key is a secret: enter it as a server environment
variable and never commit it to GitHub or place it in a `VITE_` variable.

The daily request counter is held in memory and uses the UTC calendar day. It
is shared between requests handled by the same running process, but resets
when that process restarts. It is not a persistent cross-instance counter.
