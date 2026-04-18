import { createClient } from '@supabase/supabase-js';

/** Service-role client — server-only (bypass RLS). */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
  }
  return createClient(url, key, {
    global: {
      // Prevent PostgREST / CDN from serving a cached row during the critical
      // window right after a pipeline write (replica lag can persist for ~30s).
      headers: { 'Cache-Control': 'no-store', Pragma: 'no-cache' },
    },
  });
}
