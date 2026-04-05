// Trim all env vars to guard against CRLF from CI/CD pipelines (e.g. Vercel CLI on Windows)
const trim = (v: string | undefined) => (v ?? '').trim();

const required = {
  ANTHROPIC_API_KEY: trim(process.env.ANTHROPIC_API_KEY),
  NEXT_PUBLIC_SUPABASE_URL: trim(process.env.NEXT_PUBLIC_SUPABASE_URL),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: trim(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
} as const;

const optional = {
  EPHEMERIS_SERVICE_URL: trim(process.env.EPHEMERIS_SERVICE_URL) || trim(process.env.EPHEMERIS_API_URL) || 'http://localhost:8000',
  NEXT_PUBLIC_APP_URL: trim(process.env.NEXT_PUBLIC_APP_URL) || trim(process.env.NEXT_PUBLIC_URL),
  BYPASS_SECRET: trim(process.env.BYPASS_SECRET),
  SUPABASE_SERVICE_ROLE_KEY: trim(process.env.SUPABASE_SERVICE_ROLE_KEY),
  STRIPE_SECRET_KEY: trim(process.env.STRIPE_SECRET_KEY),
} as const;

function validateEnv() {
  const missing: string[] = [];
  const warnings: string[] = [];

  // Critical: LLM provider
  if (!required.ANTHROPIC_API_KEY || required.ANTHROPIC_API_KEY === 'your_anthropic_api_key') {
    missing.push('ANTHROPIC_API_KEY');
  }

  // Critical: Supabase auth
  if (!required.NEXT_PUBLIC_SUPABASE_URL || !required.NEXT_PUBLIC_SUPABASE_URL.startsWith('https://')) {
    missing.push('NEXT_PUBLIC_SUPABASE_URL');
  }
  if (!required.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    missing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }

  if (missing.length > 0) {
    console.error(
      `[config] ❌ MISSING REQUIRED ENV VARS: ${missing.join(', ')}. ` +
      `The app will not work correctly. Check your .env.local or deployment environment.`
    );
  }

  // Warnings for optional but important vars
  if (!optional.SUPABASE_SERVICE_ROLE_KEY) {
    warnings.push('SUPABASE_SERVICE_ROLE_KEY (admin operations will fail)');
  }
  if (!optional.BYPASS_SECRET) {
    warnings.push('BYPASS_SECRET (bypass authentication is disabled)');
  }
  if (optional.EPHEMERIS_SERVICE_URL === 'http://localhost:8000') {
    warnings.push('EPHEMERIS_SERVICE_URL not set — defaulting to http://localhost:8000');
  }
  if (!optional.NEXT_PUBLIC_APP_URL) {
    warnings.push('NEXT_PUBLIC_APP_URL / NEXT_PUBLIC_URL not set — auth redirects may break');
  }

  for (const w of warnings) {
    console.warn(`[config] ⚠️  ${w}`);
  }
}

if (typeof process !== 'undefined' && process.env) {
  validateEnv();
}

export const config = {
  anthropicApiKey: required.ANTHROPIC_API_KEY,
  supabaseUrl: required.NEXT_PUBLIC_SUPABASE_URL,
  supabaseAnonKey: required.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  ephemerisApiUrl: optional.EPHEMERIS_SERVICE_URL,
  appUrl: optional.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  bypassSecret: optional.BYPASS_SECRET,
} as const;
