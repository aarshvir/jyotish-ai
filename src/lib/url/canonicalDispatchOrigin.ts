/**
 * Origin used when enqueueing `report/generate` and for orchestrator internal `fetch(base + '/api/...')`.
 * Prefer a stable production URL over preview/request hosts so server-to-server calls stay consistent.
 */

const trim = (v: string | undefined) => (v ?? '').trim();

function originFromCandidate(candidate: string): string | null {
  const c = trim(candidate);
  if (!c) return null;
  try {
    const withProto = /^https?:\/\//i.test(c) ? c : `https://${c}`;
    return new URL(withProto).origin;
  } catch {
    return null;
  }
}

/**
 * Returns canonical app origin for pipeline HTTP dispatch.
 * Order: `REPORT_PIPELINE_BASE_URL` → `PUBLIC_APP_URL` → `NEXT_PUBLIC_APP_URL` → `NEXT_PUBLIC_URL`
 * → `VERCEL_URL` (https) → fallback `requestOrigin` (e.g. dev server or preview host).
 */
export function getCanonicalDispatchOrigin(requestOrigin: string): string {
  const envChain = [
    process.env.REPORT_PIPELINE_BASE_URL,
    process.env.PUBLIC_APP_URL,
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.NEXT_PUBLIC_URL,
  ];
  for (const raw of envChain) {
    const o = originFromCandidate(raw ?? '');
    if (o) return o;
  }

  const vercel = trim(process.env.VERCEL_URL);
  if (vercel) {
    const host = vercel.replace(/^https?:\/\//, '');
    return `https://${host}`;
  }

  return requestOrigin;
}
