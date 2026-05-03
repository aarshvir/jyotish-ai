/**
 * Normalize env values copied through dashboards/CLI tools.
 * Some deployment secrets were stored with literal "\\r\\n" suffixes,
 * which .trim() does not remove and external APIs treat as part of the key.
 */
export function cleanEnv(value: string | undefined): string {
  return (value ?? '')
    .trim()
    .replace(/^["']|["']$/g, '')
    .replace(/\\r|\\n/g, '')
    .trim();
}
