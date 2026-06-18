# Architecture — JobFlow Distributed Job Execution Platform

## System Overview

JobFlow is a distributed job execution platform where users submit jobs through a Next.js frontend, a Node.js/Express API manages job lifecycle, and workers pick up and execute jobs asynchronously. All components communicate over REST.

```
┌─────────────────────────────────────────────────────────────┐
│                   Next.js Frontend (3000)                   │
│  Dashboard  │  Jobs  │  Workers  │  History                 │
└─────────────────┬──────────────────────┬────────────────────┘
                  │                      │
                  │ REST Polling (2.5s)  │
                  │                      │
┌─────────────────▼──────────────────────▼────────────────────┐
│              Node.js / Express API (4000)                   │
│                                                             │
│   /api/jobs     -> submit, list, cancel, retry, stats       │
│   /api/workers  -> register, heartbeat, deregister          │
│                                                             │
│   ┌─────────────────────────────────────────────────────┐   │
│   │             Scheduler (runs every 2s)               │   │
│   │  1. Check heartbeats -> mark stale workers offline  │   │
│   │  2. Query queued/retrying jobs (by priority + time) │   │
│   │  3. Pair each job with an idle worker -> execute()  │   │
│   └─────────────────────────────────────────────────────┘   │
│                                                             │
│   ┌─────────────────────────────────────────────────────┐   │
│   │            MongoDB Database (Mongoose)              │   │
│   │  jobs: JobModel (collection: jobs)                  │   │
│   │  workers: WorkerModel (collection: workers)         │   │
│   └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## Component Breakdown

### Backend (`/backend`)

| File                           | Responsibility                                                                        |
|--------------------------------|---------------------------------------------------------------------------------------|
| `src/index.ts`                 | Express app bootstrap, seeds demo workers & jobs, starts database and scheduler      |
| `src/types/index.ts`           | Shared TypeScript interfaces (Job, Worker, Stats, LogEntry)                           |
| `src/db/connection.ts`         | Manages connection establishment and disconnection with the MongoDB cluster           |
| `src/db/models.ts`             | Defines Mongoose schemas, virtual options, and model structures                       |
| `src/db/store.ts`              | Database layer abstraction providing asynchronous data access and queries             |
| `src/services/scheduler.ts`    | Core engine: job dispatch, simulated execution, heartbeat checker, cancel/retry locks |
| `src/routes/jobs.ts`           | REST handlers for job CRUD + operations                                               |
| `src/routes/workers.ts`        | REST handlers for worker registration + heartbeats                                    |

### Frontend (`/frontend`)

| Path                       | Purpose                                                          |
|----------------------------|------------------------------------------------------------------|
| `app/layout.tsx`           | Root layout with persistent sidebar navigation                   |
| `app/page.tsx`             | Dashboard — live stats, running jobs, worker status              |
| `app/jobs/page.tsx`        | Job table with status filters, detail drawer, and submission form|
| `app/workers/page.tsx`     | Worker cards displaying live heartbeat states and quick removal  |
| `app/history/page.tsx`     | Execution history of completed and failed jobs                   |
| `components/ui/index.tsx`  | Shared UI primitives (Badge, Button, Card, ProgressBar, Spinner) |
| `lib/api.ts`               | Typed fetch client targeting Express API endpoints               |

---

## Core Design Decisions

### Priority Queue
Jobs carry a `priorityScore` (critical=4, high=3, normal=2, low=1). The scheduler sorts queued jobs by `priorityScore DESC, createdAt ASC` before dispatching — so critical jobs always preempt lower-priority ones waiting in queue.

### Heartbeat & Crash Recovery
- Workers send a `POST /api/workers/:id/heartbeat` to stay alive.
- The scheduler checks heartbeats every 2s. If a worker's last heartbeat is > 15s old, it is marked **offline**.
- Any job assigned to that crashed worker is immediately recovered and moved back to `retrying` (if retries remain) or `failed`.

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
  id: string,
  name: string,
  type: string,
  payload: Record<string, any>,
  status: 'pending' | 'queued' | 'running' | 'completed' | 'failed' | 'retrying',
  priority: 'low' | 'normal' | 'high' | 'critical',
  priorityScore: number, // critical=4, high=3, normal=2, low=1
  workerId?: string,
  createdAt: number,
  startedAt?: number,
  completedAt?: number,
  progress: number, // 0-100
  retryCount: number,
  maxRetries: number,
  errorMessage?: string,
  logs: LogEntry[]
}

Worker {
  id: string,
  name: string,
  status: 'idle' | 'busy' | 'offline',
  registeredAt: number,
  lastHeartbeat: number,
  currentJobId?: string,
  completedJobs: number,
  failedJobs: number,
  tags: string[]
}
```

---

## Database Choice

**Current:** MongoDB / Mongoose — persistent, document-based storage that retains state across server restarts and supports complex logging subdocuments.

**Production Recommendation:**
- **Primary Database**: MongoDB Atlas or PostgreSQL with indexed columns on queue queries.
- **Queue Broker**: BullMQ (Redis-backed) or pg-boss (Postgres-backed) to support distributed locking, at-least-once delivery, and concurrent job popping.

---

## Scalability Considerations

| Concern                 | Current                               | Production Path                                       |
|-------------------------|---------------------------------------|-------------------------------------------------------|
| Job Queue               | MongoDB Polling (Indexed queries)     | BullMQ (Redis) or RabbitMQ / Kafka                    |
| Multiple API Instances  | Stateless handlers + Scheduler         | Shared lock / Redis pub-sub for dispatching           |
| Worker Isolation        | Simulated in-process execution        | Separate worker container processes (Kubernetes Jobs) |
| Real-time Updates       | 2.5s Frontend Polling                 | WebSockets or Server-Sent Events (SSE)                |
| Persistence             | MongoDB collection store              | Sharded production MongoDB cluster or PostgreSQL      |
| Authentication          | None                                  | JWT-based authentication + Role-Based Access Control  |

---

## Failure Handling Strategies

1. **Worker crash** -> heartbeat timeout -> mark offline -> re-queue running jobs
2. **Job failure** -> retryCount < maxRetries -> status = 'retrying' -> re-queued next tick
3. **Exhausted retries** -> status = 'failed', error logged, manual retry available via UI
4. **User cancel** -> immediate status = 'failed' with reason, worker freed
5. **API crash** -> states are safely retained in MongoDB; scheduler recovers running jobs from crashed workers upon bootstrap.
