# Jyotish AI — Platform Architecture Review & Redesign

**Reviewed:** 2026-04-25  
**Target scale:** Early SaaS — hundreds to a few thousand users, dozens of concurrent generation jobs  
**Infrastructure constraint:** Low-cost managed cloud (Vercel + Supabase + Inngest + Railway/Fly + Upstash)

---

## Table of Contents

1. [Current Architecture Map](#1-current-architecture-map)
2. [Critical Risks](#2-critical-risks)
3. [Target Architecture](#3-target-architecture)
4. [Report Generation Lifecycle (Redesign)](#4-report-generation-lifecycle-redesign)
5. [Agent Orchestration (Redesign)](#5-agent-orchestration-redesign)
6. [Database Schema Additions](#6-database-schema-additions)
7. [Rate Limiting & Caching](#7-rate-limiting--caching)
8. [Internal Authentication](#8-internal-authentication)
9. [Progress Delivery](#9-progress-delivery)
10. [Observability](#10-observability)
11. [Ephemeris Service](#11-ephemeris-service)
12. [Supabase Schema & RLS Audit](#12-supabase-schema--rls-audit)
13. [Phased Implementation Backlog](#13-phased-implementation-backlog)
14. [SLO Targets](#14-slo-targets)

---

## 1. Current Architecture Map

### 1.1 Request & Auth Flows

```
Browser
  │
  ├── [GET/POST /app/*]         → Next.js RSC (Supabase cookie session)
  ├── [POST /api/reports/start] → requireAuth → upsert report → Inngest OR inline pipeline
  ├── [GET /api/reports/:id/status] → requireAuth → raw PostgREST (primary bypass replica)
  ├── [GET /api/reports/:id/stream]  → requireAuth → SSE polling loop (15 min cap)
  ├── [POST /api/agents/*]      → requireAuth (service-key or user session)
  ├── [POST /api/commentary/*]  → requireAuth → Anthropic/fallback chain
  ├── [GET  /api/geocode]       → no auth, IP rate limit, Nominatim
  └── [POST /api/ziina/*]       → webhook/verify payment → Inngest report/generate

middleware.ts
  └── updateSession on every request
  └── PROTECTED_PREFIXES redirect to /login
  └── x-bypass-token / ?bypass= → skip auth entirely
```

**requireAuth() branches:**
1. `x-bypass-token == BYPASS_SECRET` → synthetic admin identity (BYPASS_USER_ID)
2. `x-service-key == SUPABASE_SERVICE_ROLE_KEY` → synthetic pipeline identity (BYPASS_USER_ID)
3. Cookie session via `getUser()` → real user identity

### 1.2 Report Generation Pipeline

```
POST /api/reports/start
  │
  ├── [if INNGEST_EVENT_KEY set]
  │     └── inngest.send('report/generate') → 202 immediately
  │
  └── [else – dev/fallback]
        └── generateReportPipeline() inline in same request (300s cap)

Inngest: generateReportJob
  ├── step:phase:ephemeris    → runPhase('ephemeris')
  ├── step:phase:nativity_grids → runPhase('nativity_grids')
  ├── step:phase:commentary   → runPhase('commentary')
  └── step:phase:finalize     → runPhase('finalize')

Each runPhase() calls generateReportPipeline(stopAfterPhase=N)
  → resumes from pipeline_checkpoint in DB
  → throws PipelinePhaseStopSignal when done (caught, not retried)
  → any other error → Inngest retries that step (up to 3x)
```

### 1.3 Orchestrator Internal Fan-out (Current)

```
Phase: nativity_grids
  ├── POST /api/agents/nativity   (90s timeout, 2 retries)
  │     └── NativityAgent: RAG + Anthropic claude-sonnet-4-6 (1 attempt, 45s abort)
  │          → fallback chain: OpenAI → Gemini → Grok
  └── Promise.all( dateRange.map → POST /api/agents/daily-grid )
        └── 7–30 concurrent HTTP calls to ephemeris Python service
        └── No concurrency cap

Phase: commentary
  └── Promise.all([
        POST /api/commentary/daily-overviews  (140s + budgetSignal)
        POST /api/commentary/nativity-text    (80s + budgetSignal)
        Promise.all( chunks.map → POST /api/commentary/hourly-batch )
          └── up to 3 chunks (10 days each), all concurrent, 160s + budgetSignal
        POST /api/commentary/months-first    
        POST /api/commentary/months-second
        POST /api/commentary/weeks-synthesis
      ])
      └── 6–8 concurrent outbound LLM calls with no global semaphore
```

### 1.4 Supabase Schema (Current)

Core tables: `reports`, `user_profiles`, `user_consent`, `jyotish_scriptures`,  
`ziina_payments`, `ziina_webhook_events`, `synastry_charts`,  
`user_synastry_unlock`, `analytics_events`, `promo_codes`, `promo_redemptions`

`reports` columns relevant to pipeline:
```
status                  TEXT        -- 'generating' | 'complete' | 'error'
generation_step         TEXT        -- current phase label
generation_progress     INTEGER     -- 0–100 %
pipeline_checkpoint     TEXT        -- last completed phase
pipeline_state          JSONB       -- intermediate data (ephemeris, grids, etc.)
report_data             JSONB       -- final assembled report
generation_started_at   TIMESTAMPTZ
updated_at              TIMESTAMPTZ
```

### 1.5 Progress Delivery (Current)

```
Client
  ├── Supabase Realtime (postgres_changes on reports) — primary
  ├── Polling GET /api/reports/:id/status every 3s — fallback
  └── EventSource /api/reports/:id/stream — CLI / observability only
```

---

## 2. Critical Risks

### R1 — Inline 300-second fallback in production (SEVERE)

**Location:** `src/app/api/reports/start/route.ts` L193-228

When `INNGEST_EVENT_KEY` is not configured, the full pipeline runs synchronously in a single serverless invocation. One user's report ties a Vercel concurrency slot for up to 300s. Under any reasonable load (10+ concurrent users), this exhausts the concurrency budget. Vercel also silently kills requests that exceed the platform limit.

**Fix:** Fail fast in production if Inngest is not configured. Never silently fall back to inline execution in a deployed environment.

### R2 — Unbounded daily-grid fan-out (HIGH)

**Location:** `src/lib/reports/orchestrator.ts` ~L672

```ts
dailyGridResults = await Promise.all(dateRange.map(async (d) => { ... }))
```

A 30-day plan fires 30 simultaneous HTTP calls to the Python ephemeris service. The ephemeris container runs a single uvicorn process. Under concurrent users, this creates a thundering herd that saturates the Python container and causes cascading timeouts.

**Fix:** Concurrency cap of 5–6 using a semaphore (p-limit pattern).

### R3 — Unbounded commentary fan-out (HIGH)

**Location:** `src/lib/reports/orchestrator.ts` ~L818-1249

Up to 8 concurrent LLM-facing HTTP calls fire in a single `Promise.all`. For 30-day plans with multiple concurrent users, this spikes Anthropic and causes 429/529 responses. There is no global semaphore or per-provider queue.

**Fix:** Concurrency limit of 3 concurrent LLM calls per report, plus provider-level global limits via Redis.

### R4 — Per-instance rate limiting (HIGH)

**Location:** `src/lib/api/rateLimit.ts`

The in-memory sliding-window store is per Node process. On Vercel, each serverless instance has its own store. A user sending 10 requests/minute can hit 10 separate instances and bypass all limits. The code already documents this limitation.

**Fix:** Replace with Upstash Redis sliding-window adapter.

### R5 — Service role key propagated through HTTP headers (HIGH)

**Location:** `src/app/api/reports/start/route.ts` L177-188

The `SUPABASE_SERVICE_ROLE_KEY` is passed as `x-service-key` in `authHeaders` to all internal agent route calls. This key has full DB access with no RLS. If any log, proxy, or middleware leaks this header, the entire database is exposed. The key is also stored in Inngest event data (`data.authHeaders`).

**Fix:** Use short-lived HMAC tokens scoped to `{reportId, userId, purpose, exp}` for internal pipeline calls. Keep service role key server-side only.

### R6 — cleanupOrphanedReports not registered (MEDIUM)

**Location:** `src/app/api/inngest/route.ts` L16-18

`cleanupOrphanedReports` is defined in `functions.ts` (runs every 30 min) but only three functions are registered with Inngest's `serve()`. The Inngest cron is silently inactive. Only the Vercel cron running once daily at 06:00 UTC actually sweeps stale reports.

**Fix:** Register `cleanupOrphanedReports` in the serve call, or remove it and document the Vercel cron as the sole mechanism.

### R7 — NativityAgent retry loop is effectively dead (MEDIUM)

**Location:** `src/lib/agents/NativityAgent.ts` L178

```ts
for (let attempt = 0; attempt < 1; attempt++) {  // only 1 iteration
  // ... 429/529 retry branches that check `attempt < 2` — never true
}
```

The 429 retry delay fires, `continue`s, but the loop ends. The code wastes 3–12s on backoff before hitting the fallback chain, without any actual retry.

**Fix:** Remove the dead retry branches inside the single-attempt loop, or change the loop to `attempt < 2`.

### R8 — RAG timeout conflicts with LLM route budget (MEDIUM)

**Location:** `src/lib/rag/vectorSearch.ts`, `src/app/api/agents/nativity/route.ts`

`RAG_TOTAL_TIMEOUT_MS` defaults to 120s. The nativity route budget is also ~120s. RAG can consume the entire budget before the LLM call even starts, leaving the fallback chain with 0 remaining time.

**Fix:** RAG budget should be at most 40s when called from the pipeline (vs. 120s for standalone use). Pass a `ragTimeoutMs` parameter from orchestrator.

### R9 — SSE stream holds serverless function open up to 15 minutes (MEDIUM)

**Location:** `src/app/api/reports/[id]/stream/route.ts`

Each SSE connection holds a serverless function alive for up to 15 minutes (MAX_STREAM_MS). Concurrent users watching generation each consume a long-lived function slot. The code acknowledges this is mainly for CLI/observability and the web UI uses Realtime + polling.

**Fix:** Deprecate SSE for the main web UI path, or move it to a dedicated always-on container. Keep it for dev tooling only.

### R10 — No promo table migrations (MEDIUM)

**Location:** `src/lib/pricing/promo/server.ts`, `supabase/migrations/`

`promo_codes` and `promo_redemptions` tables and the `increment_promo_used_count` RPC are used in application code but no `CREATE TABLE` migration exists for them. Fresh environments will fail silently on any promo code path.

**Fix:** Add a migration file for `promo_codes`, `promo_redemptions`, and the RPC.

### R11 — EphemerisAgent cache is per-instance and unbounded (LOW)

**Location:** `src/lib/agents/EphemerisAgent.ts` L35-57

512-entry in-process Map with 24h TTL. Identical chart requests on different serverless instances each hit the Python service. The cache provides no benefit in a serverless multi-instance environment.

**Fix:** Move the cache to Upstash Redis (same infrastructure as rate limits). Key: `SHA256(path+body)`.

### R12 — Supabase pooler not confirmed for serverless (LOW)

In high-concurrency scenarios, each serverless function invocation may open a DB connection. Supabase's Supavisor pooler must be used as the connection string (port 6543) not the direct Postgres port (5432).

---

## 3. Target Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                            │
│   Browser / PWA — Next.js App Router pages                      │
│   Realtime subscription (Supabase) ←── primary progress         │
│   Polling /api/reports/:id/status ←── fallback                  │
└──────────────────────────────┬──────────────────────────────────┘
                               │  short HTTP requests
┌──────────────────────────────▼──────────────────────────────────┐
│                    WEB / API LAYER (Vercel)                      │
│   Next.js App Router  maxDuration: 30s for most routes          │
│   /api/reports/start → 202 immediately (always Inngest)         │
│   /api/reports/:id/status → <30ms DB read                       │
│   /api/geocode → Upstash cache + Nominatim                      │
│   /api/ziina/* → webhook ingestion → Inngest event              │
│   Per-route global rate limits via Upstash Redis                │
└──────────────────────────────┬──────────────────────────────────┘
                               │  Inngest events
┌──────────────────────────────▼──────────────────────────────────┐
│              DURABLE EXECUTION LAYER (Inngest)                   │
│   generateReportJob (concurrency: 1 per reportId)               │
│     step:ephemeris    → bounded fetch to ephemeris pool          │
│     step:nativity_grids → p-limit(5) daily grids + NativityAgent │
│     step:commentary_a  → daily-overviews + nativity-text         │
│     step:commentary_b  → hourly batch 1–3 (p-limit(3))          │
│     step:commentary_c  → months + weeks                         │
│     step:finalize      → validation + assembly + dbSaveFinal     │
│   extendReportToMonthlyJob                                       │
│   refreshEmbeddingsCron                                          │
│   cleanupOrphanedReports (cron every 30 min) — REGISTERED       │
└──────────────┬──────────────────────────┬────────────────────────┘
               │                          │
┌──────────────▼──────────┐  ┌────────────▼──────────────────────┐
│    AI PROVIDERS         │  │  EPHEMERIS SERVICE (Railway/Fly)  │
│  Anthropic claude-*     │  │  FastAPI + Swiss Ephemeris         │
│  OpenAI (fallback)      │  │  Horizontally scalable replicas    │
│  Gemini (fallback)      │  │  Health check endpoint             │
│  Grok (fallback)        │  │  No auth for now (internal VPC)   │
│  Provider-level global  │  │  Connection from Inngest workers   │
│  rate limits via Redis  │  └───────────────────────────────────┘
└─────────────────────────┘
               │
┌──────────────▼──────────────────────────────────────────────────┐
│              DATA & CACHE LAYER                                  │
│  Supabase Postgres (Supavisor pooler)                           │
│    reports, report_runs, agent_runs                              │
│    user_profiles, user_consent, payments, scriptures             │
│    RLS on all user-facing tables                                 │
│    Realtime on reports table                                     │
│  Upstash Redis                                                   │
│    Global rate limiter (sliding window per user/IP)             │
│    Ephemeris result cache (SHA256 key, 24h TTL)                  │
│    Geocode cache (7d TTL)                                        │
│    Report start idempotency locks (10 min TTL)                  │
└─────────────────────────────────────────────────────────────────┘
```

### 3.1 Failure Boundaries

| Component | Failure Mode | Mitigation |
|---|---|---|
| Inngest unavailable | report/generate not dispatched | Fail fast (503) — never silently inline |
| Anthropic 429/529 | nativity/commentary timeouts | Multi-provider fallback chain already in place |
| Ephemeris container down | daily grids null | Fallback deterministic day data already in place |
| Supabase primary lag | status reads stale | `Prefer: no-cache` PostgREST header already in place |
| Supabase Realtime drop | progress invisible | Polling fallback already in place |
| Budget exceeded mid-phase | pipeline stuck | Hard-kill + DB update guard already in place |
| Payment webhook duplicate | double report gen | Ziina webhook idempotency table already in place |

---

## 4. Report Generation Lifecycle (Redesign)

### 4.1 Request flow — POST /api/reports/start

```
1. requireAuth()              — user session or reject
2. Load existing report row   — check alreadyDone / youngGenerating
3. Acquire Redis lock         — SET NX TTL 10m on key report:{reportId}:gen_lock
   └── if lock exists and not forceRestart → 202 skippedPipeline
4. Upsert report row          — status=generating, generation_started_at=now
5. inngest.send('report/generate', { ... })  — ALWAYS required in production
   └── if send fails → release lock, return 503 with retry guidance
6. Return 202 immediately
```

**env guard for production:**
```ts
if (!process.env.INNGEST_EVENT_KEY && process.env.NODE_ENV === 'production') {
  return NextResponse.json({ error: 'Job queue not configured' }, { status: 503 });
}
```

### 4.2 Inngest job DAG (redesign)

Split the large commentary phase into three independent Inngest steps so failures are granularly retried:

```
generateReportJob
  ├── step:ephemeris         → fetchEphemeris()
  ├── step:nativity_grids    → fetchNativityAndGrids(p-limit=5)
  ├── step:commentary_a      → fetchDailyOverviews + fetchNativityText
  ├── step:commentary_b      → fetchHourlyBatches(p-limit=3)
  ├── step:commentary_c      → fetchMonths + fetchWeeks
  └── step:finalize          → validate + assemble + dbSaveFinal
```

Each step reads from `pipeline_checkpoint` so it can skip already-completed sub-phases on retry.

### 4.3 Idempotency

- **Report start:** Redis lock `report:{reportId}:gen_lock` (NX, 10m TTL). Released on success/failure.
- **Inngest events:** Use `inngest.send({ ..., id: `report-gen-${reportId}` })` — Inngest deduplicates by event ID within 24h.
- **Payment webhooks:** `ziina_webhook_events.event_id` unique (already in place). Use `SELECT FOR UPDATE` or `ON CONFLICT DO NOTHING` for the insert before finalization.

---

## 5. Agent Orchestration (Redesign)

### 5.1 Bounded daily-grid concurrency

```ts
import pLimit from 'p-limit';
const limit = pLimit(5);  // max 5 concurrent ephemeris HTTP calls

dailyGridResults = await Promise.all(
  dateRange.map((d) => limit(() => fetchDailyGrid(d)))
);
```

### 5.2 Bounded commentary concurrency

```ts
const llmLimit = pLimit(3);  // max 3 concurrent LLM calls per report

const [overviewRes, natTextRes, ...hourlyResults] = await Promise.all([
  llmLimit(() => fetchDailyOverviews(...)),
  llmLimit(() => fetchNativityText(...)),
  llmLimit(() => fetchHourlyBatch(chunk0, ...)),
  llmLimit(() => fetchHourlyBatch(chunk1, ...)),
  llmLimit(() => fetchHourlyBatch(chunk2, ...)),
]);
```

### 5.3 NativityAgent retry fix

Remove the dead retry branches from the single-attempt loop:

```ts
// Before (broken): loop runs once, 429 branches check attempt < 2 (never true)
for (let attempt = 0; attempt < 1; attempt++) { ... }

// After (correct): single attempt, fall immediately to fallback chain on any error
try {
  const response = await this.client.messages.create({ ... }, { signal: ctrl.signal });
  return safeParseJson<NativityProfile>(extractTextContent(response));
} catch (error) {
  // falls through to fallback chain below
}
```

### 5.4 RAG budget scoping

Add `ragTimeoutMs` parameter to `buildScriptureContextHybrid`:

```ts
// In orchestrator call context: limit RAG to 35s
const ragContext = await buildScriptureContextHybrid(
  detectedYogas, natalChart.lagna, mode,
  { timeoutMs: 35_000 }
);
```

---

## 6. Database Schema Additions

### 6.1 report_runs table

Tracks each pipeline execution attempt. Enables: retry audit, cost analysis, duration tracking, user-facing error messages.

```sql
CREATE TABLE report_runs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id       UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  inngest_run_id  TEXT,                    -- Inngest run identifier
  attempt         INTEGER NOT NULL DEFAULT 1,
  status          TEXT NOT NULL DEFAULT 'running',  -- running|complete|error|timeout
  phase           TEXT,                    -- last active phase
  error_class     TEXT,                    -- 'timeout' | 'llm_429' | 'ephemeris_down' | etc
  error_message   TEXT,
  started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at     TIMESTAMPTZ,
  duration_ms     INTEGER,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_report_runs_report_id ON report_runs(report_id);
CREATE INDEX idx_report_runs_status ON report_runs(status) WHERE status = 'running';
ALTER TABLE report_runs ENABLE ROW LEVEL SECURITY;
-- No user SELECT policy — server-only via service role
```

### 6.2 agent_runs table

Tracks individual agent invocations for cost and latency monitoring:

```sql
CREATE TABLE agent_runs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_run_id   UUID REFERENCES report_runs(id) ON DELETE CASCADE,
  report_id       UUID NOT NULL,
  agent_name      TEXT NOT NULL,          -- 'nativity' | 'daily-grid' | 'hourly-batch' | etc
  provider        TEXT,                   -- 'anthropic' | 'openai' | 'gemini' | 'ephemeris'
  model           TEXT,                   -- 'claude-sonnet-4-6' etc
  status          TEXT NOT NULL,          -- 'success' | 'error' | 'timeout' | 'fallback'
  input_tokens    INTEGER,
  output_tokens   INTEGER,
  latency_ms      INTEGER,
  cost_usd_micro  INTEGER,                -- cost in micro-dollars (multiply by 1e-6 for USD)
  error_class     TEXT,
  started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_agent_runs_report_id ON agent_runs(report_id);
CREATE INDEX idx_agent_runs_started_at ON agent_runs(started_at DESC);
ALTER TABLE agent_runs ENABLE ROW LEVEL SECURITY;
-- Server-only
```

### 6.3 Missing promo migrations

```sql
-- promo_codes table (create if not exists)
CREATE TABLE IF NOT EXISTS promo_codes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code          TEXT UNIQUE NOT NULL,
  discount_pct  INTEGER NOT NULL DEFAULT 0,
  max_uses      INTEGER,
  used_count    INTEGER NOT NULL DEFAULT 0,
  valid_from    TIMESTAMPTZ,
  valid_until   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- promo_redemptions table
CREATE TABLE IF NOT EXISTS promo_redemptions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_id    UUID NOT NULL REFERENCES promo_codes(id),
  user_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  order_id    TEXT UNIQUE NOT NULL,       -- idempotency key
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- increment_promo_used_count RPC
CREATE OR REPLACE FUNCTION increment_promo_used_count(p_code TEXT)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE promo_codes SET used_count = used_count + 1 WHERE code = p_code;
END;
$$;

ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_redemptions ENABLE ROW LEVEL SECURITY;
-- No user policies — server-only writes via service role
```

### 6.4 Missing composite indexes

```sql
-- Dashboard queries: user's reports sorted by date
CREATE INDEX IF NOT EXISTS idx_reports_user_status_created
  ON reports(user_id, status, created_at DESC);

-- Stale report sweep (cleanup job)
CREATE INDEX IF NOT EXISTS idx_reports_status_updated
  ON reports(status, updated_at)
  WHERE status = 'generating';

-- Analytics events by user+time
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_created
  ON analytics_events(user_id, created_at DESC);
```

### 6.5 Vector dimension alignment

There are two migrations with conflicting vector dimensions: `20260418_jyotish_rag_pgvector.sql` (1536-dim) and `20260425_jyotish_scriptures_768dim.sql` (768-dim). The application code in `vectorSearch.ts` currently uses 1536-dim embeddings. These must be aligned before applying the 768-dim migration:

1. Update `vectorSearch.ts` to use Gemini's `text-embedding-004` (768-dim) model.
2. Re-embed all scripture chunks.
3. Apply the 768-dim migration.
4. Drop the old 1536-dim column and index.

---

## 7. Rate Limiting & Caching

### 7.1 Replace in-memory store with Upstash Redis

Add `@upstash/ratelimit` and `@upstash/redis` to package.json.

**New adapter** (`src/lib/api/rateLimit.ts`):

```ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();  // UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN

export const rateLimiters = {
  commentary:   new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(10, '60s') }),
  ephemeris:    new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(30, '60s') }),
  validation:   new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5, '60s') }),
  reportStart:  new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(3, '60s') }),
  geocode:      new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(30, '60s') }),
};
```

**Apply to missing routes:**
- `/api/agents/ephemeris` — currently has no rate limit
- `/api/reports/start` — no rate limit (user can spam report starts)

### 7.2 Upstash ephemeris cache

```ts
async function cachedEphemerisFetch(path: string, body: object): Promise<unknown> {
  const key = `eph:${sha256(path + JSON.stringify(body))}`;
  const cached = await redis.get(key);
  if (cached) return cached;
  const result = await fetchFromPython(path, body);
  await redis.set(key, result, { ex: 86400 });  // 24h TTL
  return result;
}
```

### 7.3 Geocode cache

Geocode responses are already cached via HTTP `Cache-Control` headers but this only works at the CDN/browser layer. Add Redis cache server-side:

```ts
const geoKey = `geo:${encodeURIComponent(query)}`;
const cached = await redis.get(geoKey);
if (cached) return NextResponse.json(cached);
// ... fetch from Nominatim ...
await redis.set(geoKey, result, { ex: 604800 });  // 7d TTL
```

---

## 8. Internal Authentication

### 8.1 Current risk

`SUPABASE_SERVICE_ROLE_KEY` is passed as `x-service-key` in HTTP headers from the orchestrator to all agent routes. This header appears in Inngest event payloads and in any server logs that capture request headers.

### 8.2 Signed job tokens

Replace with short-lived HMAC-signed tokens scoped to each pipeline run:

```ts
// Token payload
interface JobToken {
  reportId: string;
  userId: string;
  purpose: 'pipeline' | 'extend' | 'embed';
  exp: number;  // Unix timestamp (now + 15 min)
}

// Signing
function signJobToken(payload: JobToken): string {
  const secret = process.env.JOB_TOKEN_SECRET!;
  const data = JSON.stringify(payload);
  const sig = createHmac('sha256', secret).update(data).digest('hex');
  return Buffer.from(JSON.stringify({ data, sig })).toString('base64url');
}

// Verification in agent routes
function verifyJobToken(token: string): JobToken {
  const { data, sig } = JSON.parse(Buffer.from(token, 'base64url').toString());
  const expected = createHmac('sha256', process.env.JOB_TOKEN_SECRET!).update(data).digest('hex');
  if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) throw new Error('invalid');
  const payload: JobToken = JSON.parse(data);
  if (Date.now() / 1000 > payload.exp) throw new Error('expired');
  return payload;
}
```

Agent routes then verify the token and confirm `reportId` matches the request body:

```ts
const token = request.headers.get('x-job-token');
const payload = verifyJobToken(token!);
if (payload.reportId !== body.reportId) return 401;
```

**Migration path:** Keep `x-service-key` as a secondary fallback until all callers are updated, then remove it.

---

## 9. Progress Delivery

### 9.1 Recommended model (keep existing, remove SSE from main path)

```
Primary:   Supabase Realtime postgres_changes → updates every DB write (already in place)
Fallback:  Polling /api/reports/:id/status every 3s (already in place)
Removed:   SSE /api/reports/:id/stream from main web UI code path
Kept:      SSE for CLI tools and developer debugging only
```

The SSE route holds a serverless function alive for 15 minutes. Since the web UI already uses Realtime + polling, the SSE route should not be used from the main UI. The `GeneratingScreen` component should not open an `EventSource` by default.

### 9.2 Progress granularity improvement

Current `dbSetProgress()` writes are fire-and-forget. Each write queues independently and may overwrite each other. Add a write-coalescing wrapper to reduce DB writes from ~15 per report to ~6:

```ts
let pendingProgress: { step: string; pct: number } | null = null;
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function queueProgress(step: string, pct: number) {
  pendingProgress = { step, pct };
  if (!flushTimer) {
    flushTimer = setTimeout(async () => {
      if (pendingProgress) await dbSetProgress(pendingProgress.step, pendingProgress.pct);
      pendingProgress = null;
      flushTimer = null;
    }, 2000);  // flush at most every 2s
  }
}
```

---

## 10. Observability

### 10.1 Correlation ID

Add `x-correlation-id` header to all internal pipeline calls. Generate once at report start and thread through to every agent and commentary call. Store on `report_runs.inngest_run_id`.

```ts
const correlationId = `${reportId}-${Date.now()}`;
const h = { ...authHeaders, 'x-correlation-id': correlationId };
```

### 10.2 Structured logging standard

All pipeline log events should use the existing `orchestrator_step` format but with added fields:

```json
{
  "event": "orchestrator_step",
  "reportId": "...",
  "correlationId": "...",
  "step": "commentary_hourly_batch",
  "phase": "commentary",
  "ms": 12500,
  "provider": "anthropic",
  "model": "claude-sonnet-4-6",
  "tokens": { "input": 4200, "output": 2100 },
  "status": "success"
}
```

### 10.3 LLM audit persistence

Current `logLlmAudit` writes to stdout only. Persist to `agent_runs` table for post-hoc analysis:

```ts
async function persistAgentRun(run: AgentRunRecord): Promise<void> {
  const db = createServiceClient();
  await db.from('agent_runs').insert(run).throwOnError();
}
```

### 10.4 Cleanup job visibility

Current `cleanupOrphanedReports` logs a count only. Extend to also write a `report_runs` entry with `status='timeout'` for each swept report, enabling audit of timeout rates over time.

---

## 11. Ephemeris Service

### 11.1 Current deployment

- Single Railway container, single uvicorn process (1 worker)
- 30 concurrent daily-grid calls from a 30-day plan will queue up inside uvicorn
- No health check endpoint
- No connection pooling or circuit breaker

### 11.2 Recommended changes

**Short-term (no infra change):**
- Cap daily-grid concurrency to 5 in orchestrator (R2 fix)
- Add `/health` endpoint to FastAPI for Railway health checks
- Set Railway to restart on health check failure

**Medium-term:**
- Add `--workers 4` to uvicorn command (multi-process, same container)
- Monitor ephemeris P95 latency; scale container size if needed

**Dockerfile update:**
```dockerfile
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000} --workers ${WORKERS:-2}"]
```

**Long-term (growth scale):**
- Horizontal scaling with a load balancer (Railway or Fly.io)
- Shared Redis cache for identical chart inputs across instances

---

## 12. Supabase Schema & RLS Audit

### 12.1 RLS coverage gaps

| Table | Risk |
|---|---|
| `reports` | `user_id` is nullable (ON DELETE SET NULL); a null-user-id row can be selected by other users if RLS policy uses `auth.uid() = user_id` (NULL != NULL in Postgres). Add `AND user_id IS NOT NULL` to all user-facing policies. |
| `analytics_events` | INSERT policy allows `user_id IS NULL`; this is intentional for anonymous tracking but ensure it is not abused for data exfiltration. |
| `promo_codes` / `promo_redemptions` | No migrations; no RLS policies defined. Must be added. |
| `report_runs` / `agent_runs` | New tables — must be server-only (no user policies). |

### 12.2 Service role usage audit

The following code paths use `createServiceClient()` and must enforce row-level filtering in application code (no RLS protection):

- `orchestrator.ts` — filters by `reportId` + `userId` on all writes ✓
- `checkpoint.ts` — filters by `reportId` + `userId` ✓
- `reports/[id]/status/route.ts` — filters by `id` + `user_id` ✓
- `reports/[id]/stream/route.ts` — filters by `id` + `user_id` ✓
- `reports/start/route.ts` — filters by `id` + `user_id` on read; upsert uses service client ✓
- `cleanupOrphanedReports` — sweeps all stale `generating` rows without user filter (correct, admin-only) ✓

### 12.3 Supabase pooler

Confirm connection strings use Supavisor (port 6543, session mode for Next.js server):
```
DATABASE_URL=postgresql://postgres.[project]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
```

---

## 13. Phased Implementation Backlog

### Phase 1 — Quick safety wins (days 1–3)

| # | Task | File | Risk |
|---|---|---|---|
| 1.1 | Register `cleanupOrphanedReports` in Inngest serve | `src/app/api/inngest/route.ts` | Low |
| 1.2 | Add production guard: fail fast if no INNGEST_EVENT_KEY | `src/app/api/reports/start/route.ts` | Low |
| 1.3 | Add ephemeris rate limit to `/api/agents/ephemeris` | `src/app/api/agents/ephemeris/route.ts` | Low |
| 1.4 | Add report-start rate limit (3/60s per user) | `src/app/api/reports/start/route.ts` | Low |
| 1.5 | Fix NativityAgent dead retry loop | `src/lib/agents/NativityAgent.ts` | Low |
| 1.6 | Add p-limit(5) to daily-grid fan-out | `src/lib/reports/orchestrator.ts` | Medium |
| 1.7 | Add p-limit(3) to commentary fan-out | `src/lib/reports/orchestrator.ts` | Medium |
| 1.8 | Add missing promo table migration | `supabase/migrations/` | Medium |
| 1.9 | Add composite indexes for reports dashboard/sweep | `supabase/migrations/` | Low |
| 1.10 | Add `/health` to ephemeris FastAPI | `ephemeris-service/main.py` | Low |

### Phase 2 — Durable operations (days 4–10)

| # | Task | File | Risk |
|---|---|---|---|
| 2.1 | Add `report_runs` migration and RLS | `supabase/migrations/` | Medium |
| 2.2 | Add `agent_runs` migration and RLS | `supabase/migrations/` | Medium |
| 2.3 | Write to `report_runs` at Inngest job start/end | `src/lib/inngest/functions.ts` | Low |
| 2.4 | Write to `agent_runs` in `logLlmAudit` | `src/lib/llm/audit.ts` | Low |
| 2.5 | Add correlation ID to internal headers | `src/lib/reports/orchestrator.ts` | Low |
| 2.6 | Add Inngest event ID deduplication | `src/app/api/reports/start/route.ts` | Low |
| 2.7 | Add `SELECT FOR UPDATE` on Ziina webhook finalize | `src/app/api/ziina/webhook/route.ts` | Medium |
| 2.8 | Scope RAG timeout to 35s for pipeline calls | `src/lib/agents/NativityAgent.ts`, `src/lib/rag/vectorSearch.ts` | Low |
| 2.9 | Split commentary into 3 Inngest steps | `src/lib/inngest/functions.ts`, `src/lib/reports/orchestrator.ts` | Medium |
| 2.10 | Resolve vector dimension ambiguity (1536 vs 768) | `src/lib/rag/vectorSearch.ts`, migrations | High |

### Phase 3 — Scalable execution (days 11–21)

| # | Task | File | Risk |
|---|---|---|---|
| 3.1 | Add Upstash Redis (`@upstash/ratelimit`, `@upstash/redis`) | `package.json`, new `src/lib/redis/` | Low |
| 3.2 | Replace in-memory rate limiter with Upstash adapter | `src/lib/api/rateLimit.ts` | Medium |
| 3.3 | Apply global rate limits to all missing routes | Various agent/commentary routes | Low |
| 3.4 | Add Redis ephemeris cache | `src/lib/agents/EphemerisAgent.ts` | Low |
| 3.5 | Add Redis geocode cache | `src/app/api/geocode/route.ts` | Low |
| 3.6 | Implement signed job tokens (JOB_TOKEN_SECRET) | `src/lib/api/jobToken.ts` (new), `requireAuth.ts` | High |
| 3.7 | Update orchestrator to use job tokens instead of service key | `src/lib/reports/orchestrator.ts` | High |
| 3.8 | Remove service-role key from Inngest event data | `src/app/api/reports/start/route.ts`, `functions.ts` | High |
| 3.9 | Add uvicorn multi-worker to ephemeris Dockerfile | `ephemeris-service/Dockerfile` | Low |
| 3.10 | Confirm Supabase connection string uses pooler | `.env.example`, docs | Low |
| 3.11 | Add Redis idempotency lock to report start | `src/app/api/reports/start/route.ts` | Medium |
| 3.12 | Remove SSE from main web UI code path | `src/components/report/GeneratingScreen.tsx` | Low |

### Phase 4 — Operations & cost control (days 22+)

| # | Task | Description |
|---|---|---|
| 4.1 | SLO monitoring | Define and instrument report-start P95, completion P95, timeout rate, provider 429 rate |
| 4.2 | Ephemeris horizontal scale | Configure Railway/Fly autoscaling for ephemeris service |
| 4.3 | Cost dashboard | Build agent_runs query → cost/report, cost/day, provider breakdown |
| 4.4 | Stuck job alerts | Alert when report_runs has running rows > 20 min old |
| 4.5 | Deployment topology doc | Document Vercel + Supabase + Inngest + Railway + Upstash topology |
| 4.6 | Vector embedding cost analysis | Compare Gemini 768 vs Voyage 1536 for RAG quality/cost |
| 4.7 | GitHub Actions CI | tsc → lint → vitest (ensure `src/__tests__/**` are included) |

---

## 14. SLO Targets

| Metric | Current | Target |
|---|---|---|
| Report start response time (P95) | ~5s (inline) → <500ms (Inngest) | <300ms |
| Report generation wall time (P95, 7-day plan) | ~120s | <180s |
| Report generation wall time (P95, 30-day plan) | ~240s | <300s |
| Provider 429 rate | Unknown | <5% of LLM calls |
| Ephemeris timeout rate | Unknown | <1% |
| Report success rate | Unknown | >95% |
| Stale report cleanup lag | Up to 24h (Vercel cron) → 30min (Inngest cron) | <30min |
| SSE / long-lived serverless function count | Unbounded | 0 for web UI path |

---

*Document generated 2026-04-25 — Jyotish AI Platform Architecture Review*
