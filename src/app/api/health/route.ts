/**
 * /api/health — public uptime + dependency health endpoint.
 *
 * Returns JSON with the configured status of each launch-critical dependency.
 * Never exposes secret values — only whether they are configured.
 *
 * HTTP status policy:
 *   200 OK   — all report-blocking dependencies healthy. Analytics-tier
 *              degradation (e.g. PostHog missing) is reported as
 *              `degraded: true` but does not flip status to 503.
 *   503 SUC  — at least one report-blocking dependency is missing or
 *              unreachable. Report-blocking deps are: supabase, ziina (when
 *              UPSELL_ENABLED is true), inngest (when REPORT_START_REQUIRE_INNGEST
 *              is true), upstash (in production), ephemeris service, anthropic.
 *
 * Shape (intentionally minimal — no secret values, no PII):
 *   {
 *     ok: boolean,
 *     status: 'healthy' | 'degraded' | 'unhealthy',
 *     build: { commit, version, ts },
 *     deps: {
 *       supabase: { configured, reachable },
 *       ziina: { configured },
 *       inngest: { configured, required },
 *       upstash: { configured, required },
 *       ephemeris: { configured, reachable },
 *       anthropic: { configured },
 *       sentry: { configured },     // analytics-tier; does not block
 *       posthog: { configured }     // analytics-tier; does not block
 *     },
 *     degraded: boolean,
 *     blockers: string[]
 *   }
 *
 * The endpoint is intentionally tolerant: a single slow dep should not cause
 * a 5s health check to time out. Each upstream probe has a 2s timeout.
 */

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';

const PROBE_TIMEOUT_MS = 2000;

async function probeUrl(url: string): Promise<{ reachable: boolean; ms: number; status?: number }> {
  const start = Date.now();
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), PROBE_TIMEOUT_MS);
    const res = await fetch(url, {
      method: 'GET',
      signal: ctrl.signal,
      headers: { 'cache-control': 'no-store' },
    });
    clearTimeout(t);
    return { reachable: res.ok || res.status < 500, ms: Date.now() - start, status: res.status };
  } catch {
    return { reachable: false, ms: Date.now() - start };
  }
}

function present(name: string): boolean {
  const v = process.env[name];
  return typeof v === 'string' && v.length > 0;
}

function flag(name: string): boolean {
  const v = process.env[name];
  return v === 'true' || v === '1';
}

export async function GET() {
  const isProd = process.env.NODE_ENV === 'production';

  // Dep flags
  const supabaseConfigured =
    present('NEXT_PUBLIC_SUPABASE_URL') &&
    present('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  const supabaseServiceKey = present('SUPABASE_SERVICE_ROLE_KEY');
  const ziinaConfigured = present('ZIINA_API_TOKEN');
  const inngestConfigured = present('INNGEST_EVENT_KEY');
  const inngestRequired = flag('REPORT_START_REQUIRE_INNGEST') || isProd;
  const upstashConfigured =
    present('UPSTASH_REDIS_REST_URL') && present('UPSTASH_REDIS_REST_TOKEN');
  const upstashRequired = isProd;
  const ephemerisUrl = process.env.EPHEMERIS_API_URL || process.env.EPHEMERIS_SERVICE_URL;
  const ephemerisConfigured = typeof ephemerisUrl === 'string' && ephemerisUrl.length > 0;
  const anthropicConfigured = present('ANTHROPIC_API_KEY');
  const sentryConfigured = present('SENTRY_DSN') || present('NEXT_PUBLIC_SENTRY_DSN');
  const posthogConfigured = present('NEXT_PUBLIC_POSTHOG_KEY');
  const upsellEnabled = flag('UPSELL_ENABLED');

  // Live probe: ephemeris service is the only external dep cheap enough to probe here.
  let ephemerisProbe = { reachable: false, ms: 0 } as Awaited<ReturnType<typeof probeUrl>>;
  if (ephemerisConfigured && ephemerisUrl) {
    ephemerisProbe = await probeUrl(`${ephemerisUrl.replace(/\/+$/, '')}/health`);
  }

  // Supabase probe: cheap HEAD against the REST root.
  let supabaseProbe = { reachable: false, ms: 0 } as Awaited<ReturnType<typeof probeUrl>>;
  if (supabaseConfigured) {
    const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, '')}/rest/v1/`;
    supabaseProbe = await probeUrl(url);
  }

  // Determine blockers
  const blockers: string[] = [];
  if (!supabaseConfigured) blockers.push('supabase_not_configured');
  else if (!supabaseProbe.reachable) blockers.push('supabase_unreachable');
  if (!supabaseServiceKey) blockers.push('supabase_service_role_missing');
  if (!anthropicConfigured) blockers.push('anthropic_not_configured');
  if (!ephemerisConfigured) blockers.push('ephemeris_not_configured');
  else if (!ephemerisProbe.reachable) blockers.push('ephemeris_unreachable');
  if (inngestRequired && !inngestConfigured) blockers.push('inngest_required_but_missing');
  if (upstashRequired && !upstashConfigured) blockers.push('upstash_required_but_missing');
  if (upsellEnabled && !ziinaConfigured) blockers.push('ziina_required_for_upsell_but_missing');

  // Analytics-tier degraded (not blocking)
  const degraded = !sentryConfigured || (isProd && !posthogConfigured);

  const ok = blockers.length === 0;
  const status: 'healthy' | 'degraded' | 'unhealthy' = ok
    ? degraded
      ? 'degraded'
      : 'healthy'
    : 'unhealthy';

  const body = {
    ok,
    status,
    build: {
      commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ?? 'unknown',
      version: process.env.npm_package_version ?? 'unknown',
      ts: new Date().toISOString(),
    },
    deps: {
      supabase: { configured: supabaseConfigured, reachable: supabaseProbe.reachable, ms: supabaseProbe.ms },
      ziina: { configured: ziinaConfigured, required: upsellEnabled },
      inngest: { configured: inngestConfigured, required: inngestRequired },
      upstash: { configured: upstashConfigured, required: upstashRequired },
      ephemeris: { configured: ephemerisConfigured, reachable: ephemerisProbe.reachable, ms: ephemerisProbe.ms },
      anthropic: { configured: anthropicConfigured },
      sentry: { configured: sentryConfigured },
      posthog: { configured: posthogConfigured },
    },
    degraded,
    blockers,
  };

  return NextResponse.json(body, {
    status: ok ? 200 : 503,
    headers: {
      'cache-control': 'no-store, max-age=0',
      'content-type': 'application/json',
    },
  });
}
