# Personalized Learning Assistant

## Run locally

Start the FastAPI backend from `backend/`:

```powershell
python -m pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000
```

In a second terminal, start the Vite frontend from `frontend/`:

```powershell
npm ci
npm run dev
```

Vite proxies the API routes to the local FastAPI server. To target a separate API
host, set `VITE_API_URL` at frontend build time.

## Deploy as one Render service

The root `render.yaml` Blueprint installs the backend requirements, builds the
frontend, and starts FastAPI to serve both the API and the generated frontend.
To create or update the service, import this repository as a Render Blueprint.
The service runs on the free web-service plan and checks `/health` after deploy.

Set `CORS_ORIGINS` to a comma-separated list of frontend origins only when the
frontend is hosted on a different domain. The single-service deployment uses
same-origin requests.
