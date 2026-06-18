# JobFlow — Distributed Job Execution Platform

A full-stack distributed job execution system built with Node.js (Express + TypeScript) backend and Next.js frontend.

---

## Quick Start

### Prerequisites
- Node.js 18+
- npm 9+

### 1. Clone & Install

```bash
git clone <your-repo-url>
cd jobflow

# Backend
cd backend && npm install && cd ..

# Frontend
cd frontend && npm install && cd ..
```

### 2. Environment Configuration

Backend (optional — defaults shown):
```bash
# backend/.env
PORT=4000
```

Frontend (optional):
```bash
# frontend/.env.local
NEXT_PUBLIC_API_URL=http://localhost:4000/api
```

### 3. Run Both Services

**Terminal 1 — Backend:**
```bash
cd backend
npm run dev
# API running at http://localhost:4000
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
# UI running at http://localhost:3000
```

Open [http://localhost:3000](http://localhost:3000)

---

## Running Tests

```bash
# Backend type checking
cd backend && npx tsc --noEmit

# Frontend type checking
cd frontend && npx tsc --noEmit
```

---

## API Reference

### Jobs

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/jobs` | List all jobs |
| GET | `/api/jobs/stats` | Get system stats |
| GET | `/api/jobs/history` | Get execution history |
| GET | `/api/jobs/:id` | Get job details |
| POST | `/api/jobs` | Submit a new job |
| POST | `/api/jobs/:id/cancel` | Cancel a job |
| POST | `/api/jobs/:id/retry` | Retry a failed job |

**Submit Job Body:**
```json
{
  "name": "Weekly Report",
  "type": "report-generation",
  "priority": "high",
  "maxRetries": 3,
  "payload": { "week": 24 }
}
```

### Workers

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/workers` | List all workers |
| POST | `/api/workers/register` | Register a worker |
| POST | `/api/workers/:id/heartbeat` | Send heartbeat |
| DELETE | `/api/workers/:id` | Deregister worker |

---

## Assumptions

- Job execution is **simulated** server-side (5–15s, 15% failure rate) to demonstrate the full lifecycle without external infrastructure.
- The data store is **in-memory** — state resets on server restart. Production would use PostgreSQL.
- Workers auto-register on startup (3 demo workers: Alpha, Beta, Gamma) to make the demo immediately functional.
- Heartbeat timeout is set to **15 seconds** for demo visibility (production would use 60s+).
- Frontend polls the API every **2.5 seconds** for live updates (production would use WebSockets/SSE).
