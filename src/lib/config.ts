const required = {
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  EPHEMERIS_API_URL: process.env.EPHEMERIS_API_URL ?? 'http://localhost:8000',
} as const;

const optional = {
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
} as const;

function validateEnv() {
  const missing: string[] = [];

  if (!required.ANTHROPIC_API_KEY || required.ANTHROPIC_API_KEY === 'your_anthropic_api_key') {
    missing.push('ANTHROPIC_API_KEY');
  }

  if (missing.length > 0) {
    console.error(`[config] Missing required env vars: ${missing.join(', ')}. Check .env.local`);
  }

  for (const [key, value] of Object.entries(optional)) {
    if (!value) {
      console.warn(`[config] Optional env var ${key} is not set`);
    }
  }
}

if (typeof process !== 'undefined' && process.env) {
  validateEnv();
}

export const config = {
  anthropicApiKey: required.ANTHROPIC_API_KEY ?? '',
  ephemerisApiUrl: required.EPHEMERIS_API_URL,
  appUrl: optional.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
} as const;
