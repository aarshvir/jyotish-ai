import { createHmac, timingSafeEqual } from 'crypto';

export type JobTokenPurpose = 'pipeline' | 'extend' | 'embed';

export interface JobTokenPayload {
  reportId: string;
  userId: string;
  purpose: JobTokenPurpose;
  exp: number;
  correlationId?: string;
}

function secret(): string {
  const s = process.env.JOB_TOKEN_SECRET?.trim();
  if (s) return s;

  const fallback = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (fallback) return fallback;

  const bypass = process.env.BYPASS_SECRET?.trim();
  if (bypass) return bypass;

  throw new Error('JOB_TOKEN_SECRET is required for internal job tokens');
}

function sign(data: string): string {
  return createHmac('sha256', secret()).update(data).digest('hex');
}

/** Default TTL for long-running pipeline / extend jobs (multi-step Inngest). Override with `JOB_TOKEN_TTL_SECONDS`. */
export const PIPELINE_JOB_TOKEN_DEFAULT_TTL_SECONDS = 6 * 60 * 60;

function pipelineTtlFromEnv(): number {
  const raw = process.env.JOB_TOKEN_TTL_SECONDS?.trim();
  if (!raw) return PIPELINE_JOB_TOKEN_DEFAULT_TTL_SECONDS;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n)) return PIPELINE_JOB_TOKEN_DEFAULT_TTL_SECONDS;
  if (n < 300) return 300;
  if (n > 48 * 3600) return 48 * 3600;
  return n;
}

/** TTL for `purpose: 'pipeline'` and `'extend'` internal job tokens (avoids mid-run 401 when runs exceed ~1h). */
export function getPipelineJobTokenTtlSeconds(): number {
  return pipelineTtlFromEnv();
}

export function createJobToken(
  payload: Omit<JobTokenPayload, 'exp'> & { ttlSeconds?: number },
): string {
  const { ttlSeconds = 15 * 60, ...rest } = payload;
  const body: JobTokenPayload = {
    ...rest,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  };
  const data = Buffer.from(JSON.stringify(body), 'utf8').toString('base64url');
  return `${data}.${sign(data)}`;
}

export function verifyJobToken(token: string | null | undefined): JobTokenPayload | null {
  if (!token) return null;
  const [data, signature] = token.split('.');
  if (!data || !signature) return null;

  const expected = sign(data);
  const expectedBuffer = Buffer.from(expected, 'hex');
  const actualBuffer = Buffer.from(signature, 'hex');
  if (expectedBuffer.length !== actualBuffer.length) return null;
  if (!timingSafeEqual(expectedBuffer, actualBuffer)) return null;

  const payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf8')) as JobTokenPayload;
  if (!payload.reportId || !payload.userId || !payload.purpose || !payload.exp) return null;
  if (payload.exp < Math.floor(Date.now() / 1000)) return null;
  return payload;
}
