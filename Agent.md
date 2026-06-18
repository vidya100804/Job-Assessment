# Agent.md — AI Usage Disclosure

## AI Tools Used

**Claude (Anthropic)** was used as the primary AI assistant throughout this assessment.

---

## Development Approach

The assessment was completed in a pair-programming style with Claude handling boilerplate scaffolding and I driving all architecture decisions, debugging, and design choices.

### Workflow

1. **Requirement analysis** — Read the PDF spec, broke it down into discrete features: job submission, scheduling, worker registration, heartbeat monitoring, retry policies, failure recovery, queue prioritization, execution history.

2. **Architecture design** — Decided on an in-memory store with Map<id, T> for the demo (vs. SQLite/Postgres) after considering the 48h deadline and native module compilation issues. Documented the production DB path in Architecture.md.

3. **Backend first** — Built types → store → scheduler service → routes. The scheduler is the core engine — a polling loop that dispatches queued jobs to idle workers, checks heartbeats, and handles crash recovery.

4. **Frontend** — Next.js App Router with a sidebar layout. Four pages: Dashboard (live stats + active jobs), Jobs (table + detail drawer + submit form), Workers (card grid + heartbeat), History. All data fetched via a typed API lib, polling every 2.5s.

5. **Iteration** — Fixed TypeScript errors, adjusted UI spacing, tuned heartbeat timeout (15s for demo visibility).

---

## Prompts Used (representative examples)

- "Build the scheduler service with heartbeat checking, crash recovery, and retry logic"
- "Create a Jobs page with a filter tab bar, data table, detail side drawer, and submit modal — dark theme"
- "Fix TypeScript error: Property 'status' does not exist on type 'unknown'"
- "Write Architecture.md covering system diagram, design decisions, DB choice rationale, and scalability table"

---

## What I Own

- All architecture decisions (in-memory vs. DB, polling vs. WebSocket, priority scoring algorithm)
- The scheduler logic — dispatch pairing, heartbeat timeout values, retry state machine
- UI design system — color palette (dark navy/blue), component API design, layout choices
- Trade-off decisions documented in Architecture.md
- Every line was reviewed and understood before committing
