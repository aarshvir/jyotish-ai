/**
 * Normalize env values copied through dashboards/CLI tools.
 * Some deployment secrets were stored with literal "\\r\\n" suffixes,
 * which .trim() does not remove and external APIs treat as part of the key.
 */
/**
 * True only on the LIVE production deployment. Vercel preview/development
 * deployments also build with NODE_ENV=production, so VERCEL_ENV wins when present.
 * Security relaxations for local/e2e work must be keyed off this, never NODE_ENV alone.
 */
export function isProductionRuntime(): boolean {
  const vercelEnv = (process.env.VERCEL_ENV ?? '').trim();
  if (vercelEnv) return vercelEnv === 'production';
  return process.env.NODE_ENV === 'production';
}

export function cleanEnv(value: string | undefined): string {
  return (value ?? '')
    .trim()
    .replace(/^["']|["']$/g, '')
    .replace(/\\r|\\n/g, '')
    .trim();
}
