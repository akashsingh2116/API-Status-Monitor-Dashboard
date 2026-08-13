# API Status Monitor Dashboard

A multi-tenant dashboard for monitoring the health of your own APIs. Sign up, register
an API, get a unique API key, drop a small snippet into your own backend, and its
traffic (status codes, response times, uptime) shows up on your dashboard.

## Stack

- **Backend**: Node.js, Express 5, MongoDB (Mongoose), JWT auth — `backend/`
- **Frontend**: React 18, Vite, Tailwind CSS — `frontend/`

## How it works

1. Sign up / log in on the dashboard.
2. Go to **My APIs** → add an API by name → you get a generated `apiKey` and an
   install snippet.
3. Paste the snippet into your own Express app (or POST to the same contract from any
   language — see below). Every request your app handles gets reported to this
   dashboard.
4. View uptime, error rate, response times, and per-request logs, scoped to that API.

### Ingest contract

Any client can report an event by POSTing to `POST {BACKEND_URL}/api/ingest`:

```
Headers: x-api-key: <the API's key>
Body (JSON):
{
  "method": "GET",
  "endpoint": "/users/42",
  "status": 200,
  "responseTimeMs": 87,
  "timestamp": "2026-08-13T10:00:00Z"   // optional, defaults to now
}
```

This is what the snippet shown in **My APIs** does under the hood — it's plain HTTP,
so it works from any backend language, not just Node.

## Environment variables

### `backend/.env`

| Variable        | Required | Description                                              |
|-----------------|----------|------------------------------------------------------------|
| `PORT`          | no       | Port the API server listens on (default `5000`)          |
| `MONGO_URI`     | yes      | MongoDB connection string                                 |
| `JWT_SECRET`    | yes      | Long random string used to sign auth tokens                |
| `FRONTEND_URL`  | yes      | Comma-separated list of allowed browser origins for CORS  |

### `frontend/.env`

| Variable              | Required | Description                                  |
|-----------------------|----------|-----------------------------------------------|
| `VITE_API_BASE_URL`   | yes      | Base URL of the deployed backend, e.g. `https://api.yourdomain.com` |

`VITE_API_BASE_URL` is baked in at **build time** (it's a Vite env var), so it must be
set before running `npm run build`, not just at server runtime.

## Local development

```bash
# backend
cd backend
npm install
npm run dev        # nodemon, http://localhost:5000

# frontend (separate terminal)
cd frontend
npm install
npm run dev         # http://localhost:5173
```

Set `backend/.env` → `FRONTEND_URL=http://localhost:5173` so the dashboard can call
the API in dev.

## Docker

```bash
docker compose up --build
```

This builds and runs both services (frontend on `:8080`, backend on `:5000`) using
`backend/.env` for backend config. For a production build, pass the real backend URL
as a build arg:

```bash
docker build --build-arg VITE_API_BASE_URL=https://api.yourdomain.com -t dashboard-frontend ./frontend
docker build -t dashboard-backend ./backend
```

## Deploying to your own domain

1. Deploy the backend somewhere that can reach your MongoDB instance (a VM, Render,
   Railway, etc.), set its env vars, and point a subdomain at it (e.g.
   `api.yourdomain.com`).
2. Build the frontend with `VITE_API_BASE_URL` set to that backend URL, and serve the
   static `dist/` output (e.g. via the provided Dockerfile+nginx, Vercel, Netlify, or
   any static host) on your main domain.
3. Set `FRONTEND_URL` on the backend to your deployed frontend's origin so CORS allows
   it.
4. Rotate any secrets that were ever committed to git before this repo is exposed to
   anyone beyond people who already had access.
