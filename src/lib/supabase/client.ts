import { createBrowserClient } from '@supabase/ssr';
import { cleanEnv } from '@/lib/env';

// Normalize env vars to guard against copied CRLF suffixes in deployment secrets.
const supabaseUrl = cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_URL);
const supabaseAnonKey = cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export function createClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
