import { createBrowserClient } from '@supabase/ssr';

// Trim env vars to guard against CRLF added by some CI/CD pipelines (e.g. Vercel CLI on Windows)
const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim();
const supabaseAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '').trim();

export function createClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}