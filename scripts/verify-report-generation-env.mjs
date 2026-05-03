#!/usr/bin/env node
/**
 * Sanity-check env vars for report generation (Vercel / local).
 * Warnings on stderr for optional gaps.
 *
 * - In CI (`CI=true`) or with `VERIFY_REPORT_ENV_STRICT=1`, exit 1 if required vars are missing.
 * - Locally, missing required vars are printed as errors but exit 0 (so clones without .env still pass).
 *
 * Usage: node scripts/verify-report-generation-env.mjs
 */

const trim = (v) => (v ?? '').trim().replace(/^["']|["']$/g, '').replace(/\\r|\\n/g, '').trim();
const strict = process.env.CI === 'true' || process.env.VERIFY_REPORT_ENV_STRICT === '1';

const errors = [];
const warnings = [];

function need(name, ok, hint) {
  if (!ok) errors.push(`${name}: ${hint}`);
}

function warn(name, hint) {
  warnings.push(`${name}: ${hint}`);
}

const anthropic = trim(process.env.ANTHROPIC_API_KEY);
need('ANTHROPIC_API_KEY', !!anthropic && anthropic !== 'your_anthropic_api_key', 'required for commentary');

const supabaseUrl = trim(process.env.NEXT_PUBLIC_SUPABASE_URL);
const supabaseAnon = trim(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
need('NEXT_PUBLIC_SUPABASE_URL', !!supabaseUrl?.startsWith('https://'), 'must be https Supabase URL');
need('NEXT_PUBLIC_SUPABASE_ANON_KEY', !!supabaseAnon, 'required for auth');

const serviceRole = trim(process.env.SUPABASE_SERVICE_ROLE_KEY);
if (!serviceRole) warn('SUPABASE_SERVICE_ROLE_KEY', 'server-side report rows / admin may fail');

const inngest = trim(process.env.INNGEST_EVENT_KEY);
const inlineOverride = ['1', 'true'].includes(trim(process.env.REPORT_PIPELINE_INLINE).toLowerCase());
const productionLike =
  process.env.NODE_ENV === 'production' ||
  process.env.VERCEL_ENV === 'production' ||
  process.env.VERCEL === '1';
if (!inngest) {
  if ((strict || productionLike) && !inlineOverride) {
    need(
      'INNGEST_EVENT_KEY',
      false,
      'required for production report/generate background execution; set REPORT_PIPELINE_INLINE=true only as an emergency override',
    );
  } else {
    warn('INNGEST_EVENT_KEY', 'background report/generate will not run; inline fallback only where allowed');
  }
}

const ephem =
  trim(process.env.EPHEMERIS_SERVICE_URL) ||
  trim(process.env.EPHEMERIS_API_URL);
if (!ephem || ephem === 'http://localhost:8000') {
  warn('EPHEMERIS_SERVICE_URL', 'defaults to localhost — set in production');
}

const jobSecret = trim(process.env.JOB_TOKEN_SECRET);
if (!jobSecret && !serviceRole && !trim(process.env.BYPASS_SECRET)) {
  warn(
    'JOB_TOKEN_SECRET',
    'unset — falls back to SUPABASE_SERVICE_ROLE_KEY or BYPASS_SECRET; set explicitly for clarity',
  );
}

const pipelineBase =
  trim(process.env.REPORT_PIPELINE_BASE_URL) ||
  trim(process.env.PUBLIC_APP_URL) ||
  trim(process.env.NEXT_PUBLIC_APP_URL) ||
  trim(process.env.NEXT_PUBLIC_URL);
if (!pipelineBase) {
  warn(
    'REPORT_PIPELINE_BASE_URL / NEXT_PUBLIC_APP_URL',
    'orchestrator uses request host only — preview deployments may call wrong origin for internal fetch',
  );
}

const bypass = trim(process.env.BYPASS_SECRET);
if (!bypass) warn('BYPASS_SECRET', 'E2E bypass + admin bypass routes disabled');

const maxDur = trim(process.env.VERCEL_FUNCTION_MAX_DURATION);
const budget = trim(process.env.REPORT_PIPELINE_BUDGET_MS);
if (!maxDur && !budget) {
  warn(
    'VERCEL_FUNCTION_MAX_DURATION / REPORT_PIPELINE_BUDGET_MS',
    'long pipelines rely on defaults — verify deployment tier allows sufficient maxDuration',
  );
}

const openai = trim(process.env.OPENAI_API_KEY);
const gemini = trim(process.env.GOOGLE_GENERATIVE_AI_API_KEY) || trim(process.env.GEMINI_API_KEY);
if (!openai && !gemini) {
  warnings.push('fallback LLMs: OPENAI_API_KEY / GOOGLE_GENERATIVE_AI_API_KEY unset (optional fallbacks)');
}

for (const w of warnings) console.warn('[verify-report-env] ⚠️ ', w);
if (errors.length) {
  console.error('[verify-report-env] ❌ Missing or invalid:');
  for (const e of errors) console.error('  -', e);
  if (strict) process.exit(1);
  else {
    console.warn(
      '[verify-report-env] non-strict: exit 0 (set CI=1 or VERIFY_REPORT_ENV_STRICT=1 to fail the build)',
    );
  }
} else {
  console.log('[verify-report-env] OK (see warnings above if any)');
}
