# Architecture — JobFlow Distributed Job Execution Platform

## System Overview

JobFlow is a distributed job execution platform where users submit jobs through a Next.js frontend, a Node.js/Express API manages job lifecycle, and workers pick up and execute jobs asynchronously. All components communicate over REST.

```
┌─────────────────────────────────────────────────────────────┐
│                     Next.js Frontend (3000)                  │
│  Dashboard │ Jobs │ Workers │ History                        │
└─────────────────┬──────────────────────┬───────────────────┘
                  │ REST (polling 2.5s)  │
┌─────────────────▼──────────────────────▼───────────────────┐
│              Node.js / Express API (4000)                    │
│                                                              │
│   /api/jobs      ── submit, list, cancel, retry, stats      │
│   /api/workers   ── register, heartbeat, deregister         │
│                                                              │
│   ┌──────────────────────────────────────────────────────┐  │
│   │              Scheduler (runs every 2s)               │  │
│   │  1. Check heartbeats → mark stale workers offline    │  │
│   │  2. Query queued/retrying jobs (by priority + time)  │  │
│   │  3. Pair each job with an idle worker → execute()    │  │
│   └──────────────────────────────────────────────────────┘  │
│                                                              │
│   ┌──────────────────────────────────────────────────────┐  │
│   │              In-Memory Store (Map<id, T>)            │  │
│   │  jobs: Map<string, Job>                              │  │
│   │  workers: Map<string, Worker>                        │  │
│   │  executionHistory: Job[]                             │  │
│   └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## Component Breakdown

### Backend (`/backend`)

| File | Responsibility |
|------|---------------|
| `src/index.ts` | Express app bootstrap, seeds 3 demo workers, starts scheduler |
| `src/types/index.ts` | Shared TypeScript interfaces (Job, Worker, Stats, LogEntry) |
| `src/db/store.ts` | In-memory Maps acting as the data layer |
| `src/services/scheduler.ts` | Core engine: job dispatch, simulated execution, heartbeat checker, cancel/retry helpers |
| `src/routes/jobs.ts` | REST handlers for job CRUD + actions |
| `src/routes/workers.ts` | REST handlers for worker registration + heartbeat |

### Frontend (`/frontend`)

| Path | Purpose |
|------|---------|
| `app/layout.tsx` | Root layout with persistent sidebar navigation |
| `app/page.tsx` | Dashboard — live stats, running jobs, worker status |
| `app/jobs/page.tsx` | Job table with filters, detail drawer, submit modal |
| `app/workers/page.tsx` | Worker cards with heartbeat + remove actions |
| `app/history/page.tsx` | Execution history with aggregate metrics |
| `components/ui/index.tsx` | Shared UI primitives (Badge, Button, Card, ProgressBar, Spinner) |
| `lib/api.ts` | Typed fetch wrapper for all API endpoints |

---

## Core Design Decisions

### Priority Queue
Jobs carry a `priorityScore` (critical=4, high=3, normal=2, low=1). The scheduler sorts queued jobs by `priorityScore DESC, createdAt ASC` before dispatching — so critical jobs always preempt lower-priority ones waiting in queue.

### Heartbeat & Crash Recovery
- Workers send a `POST /api/workers/:id/heartbeat` to stay alive.
- The scheduler checks heartbeats every 2s. If a worker's last heartbeat is > 15s old, it is marked **offline**.
- Any job assigned to that crashed worker is immediately moved back to `queued` (if retries remain) or `failed`.

### Retry Policy
- Each job has a configurable `maxRetries` (default 3).
- On failure, `retryCount` is incremented and status becomes `retrying`, which re-queues the job for the next scheduler tick.
- The UI shows `retryCount / maxRetries` and allows manual retry of failed jobs.

### Execution Simulation
Since this is a demonstration platform, job execution is simulated server-side:
- Random duration 5–15s per job
- 15% random failure probability
- Progress updated in 5 steps during execution
- All events appended to `job.logs[]` (timestamped, leveled)

In production, replace the `executeJob()` simulation with real task runner integration (e.g., spawning child processes, calling a worker microservice via message queue, etc.).

---

## Data Models

```typescript
Job {
  id, name, type, payload,
  status: 'queued' | 'running' | 'completed' | 'failed' | 'retrying',
  priority: 'low' | 'normal' | 'high' | 'critical',
  priorityScore: 1–4,
  workerId, createdAt, startedAt, completedAt,
  progress: 0–100,
  retryCount, maxRetries,
  errorMessage, logs: LogEntry[]
}

Worker {
  id, name,
  status: 'idle' | 'busy' | 'offline',
  registeredAt, lastHeartbeat,
  currentJobId, completedJobs, failedJobs,
  tags: string[]
}
```

---

## Database Choice

**Current:** In-memory `Map<string, T>` — zero dependencies, instant reads/writes, sufficient for a single-node demo.

**Production recommendation: PostgreSQL**
- Jobs table with index on `(status, priorityScore, createdAt)` for efficient queue queries
- Workers table with index on `status`
- Execution history as an append-only audit log
- Use `pg-boss` or `BullMQ` (Redis) for a production-grade job queue with at-least-once delivery guarantees

---

## Scalability Considerations

| Concern | Current | Production Path |
|---------|---------|----------------|
| Job queue | In-memory Map | BullMQ (Redis) or pg-boss (Postgres) |
| Multiple API instances | Single process | Stateless API + shared queue in Redis/Postgres |
| Worker isolation | Simulated in-process | Separate worker microservices or k8s Jobs |
| Real-time updates | 2.5s polling | WebSocket / Server-Sent Events |
| Persistence | Lost on restart | PostgreSQL with migrations |
| Auth | None | JWT + RBAC |

---

## Failure Handling Strategies

1. **Worker crash** → heartbeat timeout → mark offline → re-queue running jobs
2. **Job failure** → retryCount < maxRetries → status = 'retrying' → re-queued next tick
3. **Exhausted retries** → status = 'failed', error logged, manual retry available via UI
4. **User cancel** → immediate status = 'failed' with reason, worker freed
5. **API crash** → state is lost (in-memory); mitigation: persist to DB on every state change
