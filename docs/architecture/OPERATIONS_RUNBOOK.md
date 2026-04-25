# Jyotish AI Operations Runbook

## Production Topology

- **Web/API:** Vercel, Next.js App Router. Report start routes should return quickly and dispatch to Inngest.
- **Durable jobs:** Inngest Cloud. `report/generate` is concurrency-limited by `reportId`.
- **Database/Auth:** Supabase Postgres/Auth. Use Supavisor pooler for serverless connections.
- **Cache/limits:** Upstash Redis. Used for global API rate limits, report-start locks, geocode cache, and ephemeris cache.
- **Ephemeris:** Railway/Fly/Render container running FastAPI + Swiss Ephemeris. Health endpoint: `/health`.

## Required Secrets

- `INNGEST_EVENT_KEY`
- `INNGEST_SIGNING_KEY`
- `JOB_TOKEN_SECRET`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ANTHROPIC_API_KEY`
- At least one fallback provider key: `OPENAI_API_KEY` or `GEMINI_API_KEY`

## SLOs

- Report start API P95: `<300ms`
- 7-day report completion P95: `<180s`
- 30-day report completion P95: `<300s`
- Report success rate: `>95%`
- LLM provider 429/529 rate: `<5%`
- Ephemeris timeout rate: `<1%`
- Stale generating report cleanup lag: `<30min`

## Alerts

Create alerts for:

- `report_runs.status = 'running'` older than 20 minutes.
- More than 5 reports swept by `cleanupOrphanedReports` in 30 minutes.
- LLM `agent_runs.status IN ('error', 'timeout')` above 10% over 15 minutes.
- Ephemeris `agent_runs.agent_name IN ('ephemeris:natal-chart', 'daily-grid')` timeout rate above 2%.
- Report start 503 responses, which means Inngest dispatch is unavailable or not configured.

## Useful Queries

```sql
-- Stuck active report runs
SELECT id, report_id, user_id, phase, started_at, now() - started_at AS age
FROM report_runs
WHERE status = 'running'
  AND started_at < now() - interval '20 minutes'
ORDER BY started_at ASC;
```

```sql
-- Provider/agent error rates over the last 24 hours
SELECT
  agent_name,
  provider,
  count(*) AS total,
  count(*) FILTER (WHERE status IN ('error', 'timeout')) AS failures,
  round(
    100.0 * count(*) FILTER (WHERE status IN ('error', 'timeout')) / nullif(count(*), 0),
    2
  ) AS failure_pct
FROM agent_runs
WHERE started_at > now() - interval '24 hours'
GROUP BY agent_name, provider
ORDER BY failure_pct DESC, total DESC;
```

```sql
-- P95 latency per agent over the last 24 hours
SELECT
  agent_name,
  provider,
  percentile_cont(0.95) WITHIN GROUP (ORDER BY latency_ms) AS p95_ms,
  count(*) AS samples
FROM agent_runs
WHERE started_at > now() - interval '24 hours'
  AND latency_ms IS NOT NULL
GROUP BY agent_name, provider
ORDER BY p95_ms DESC;
```

```sql
-- Completion duration by report plan type
SELECT
  r.plan_type,
  percentile_cont(0.95) WITHIN GROUP (ORDER BY rr.duration_ms) AS p95_ms,
  count(*) AS completed_runs
FROM report_runs rr
JOIN reports r ON r.id = rr.report_id
WHERE rr.status = 'complete'
  AND rr.finished_at > now() - interval '7 days'
GROUP BY r.plan_type
ORDER BY p95_ms DESC;
```

## Production Report Validation

Use two independent checks:

1. API pipeline check with the production bypass secret:
   `E2E_BYPASS=<prod-bypass-secret> npm run test:e2e:prod`

2. Browser promo path with `ADMIN100`:
   open `https://www.vedichour.com/onboard?plan=7day&promo=ADMIN100`, confirm the UI shows `100% off` and the CTA says `Generate Report Free`, then wait for `/report/...` to complete.

`ADMIN100` is a private admin promo. Do not expose it in public docs or UI.
