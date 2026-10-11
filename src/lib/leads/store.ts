import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Storage for leads and the consent ledger, behind a small interface so the capture logic is
 * tested without a database. `supabaseStore` is the real one. Every method reports a missing
 * table as `missing: true` instead of throwing, so the funnel keeps working until the
 * migration (supabase/migrations/20261012_leads.sql) has been run.
 */

export interface LeadRow {
  id: string;
  email: string;
  first_name: string | null;
  lang: 'en' | 'hi';
  country: string | null;
  source: string;
  slug: string | null;
  first_session_id: string | null;
  latest_session_id: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  focus_area: string | null;
  goal_12m: string | null;
  birth_time_known: string | null;
  problems: string | null;
  answers: Record<string, string>;
  stage: string;
  reveal_viewed_at: string | null;
}

export type LeadWrite = Omit<LeadRow, 'id' | 'first_session_id'> & { first_session_id?: string | null };

export interface ConsentEvent {
  lead_id: string | null;
  contact_hash: string;
  channel: 'email';
  purpose: 'service' | 'marketing';
  action: 'notice_shown' | 'granted' | 'withdrawn';
  source: string;
  notice_version: string;
  text_shown: string;
  lang: string;
  session_id: string | null;
}

export type StoreResult<T> = { ok: true; value: T } | { ok: false; missing: boolean; error: string };

export interface LeadStore {
  findByEmail(email: string): Promise<StoreResult<LeadRow | null>>;
  findById(id: string): Promise<StoreResult<LeadRow | null>>;
  insert(row: LeadWrite): Promise<StoreResult<string>>;
  update(id: string, patch: Partial<LeadWrite>): Promise<StoreResult<true>>;
  addConsent(rows: ConsentEvent[]): Promise<StoreResult<true>>;
  isSuppressed(email: string): Promise<StoreResult<boolean>>;
}

const missingTable = (msg: string | undefined) => /leads|consent_events|email_suppressions|schema cache|does not exist/i.test(msg ?? '');

export function supabaseStore(db: SupabaseClient): LeadStore {
  const fail = (e: { message?: string }): { ok: false; missing: boolean; error: string } => ({
    ok: false,
    missing: missingTable(e.message),
    error: e.message ?? 'error',
  });
  return {
    async findByEmail(email) {
      const { data, error } = await db
        .from('leads')
        .select('id, email, first_name, lang, country, source, slug, first_session_id, latest_session_id, utm_source, utm_medium, utm_campaign, utm_content, focus_area, goal_12m, birth_time_known, problems, answers, stage, reveal_viewed_at')
        .eq('email', email)
        .maybeSingle();
      return error ? fail(error) : { ok: true, value: (data as LeadRow | null) ?? null };
    },
    async findById(id) {
      const { data, error } = await db
        .from('leads')
        .select('id, email, first_name, lang, country, source, slug, first_session_id, latest_session_id, utm_source, utm_medium, utm_campaign, utm_content, focus_area, goal_12m, birth_time_known, problems, answers, stage, reveal_viewed_at')
        .eq('id', id)
        .is('erased_at', null)
        .maybeSingle();
      return error ? fail(error) : { ok: true, value: (data as LeadRow | null) ?? null };
    },
    async insert(row) {
      const { data, error } = await db.from('leads').insert(row).select('id').single();
      return error || !data ? fail(error ?? { message: 'no row' }) : { ok: true, value: (data as { id: string }).id };
    },
    async update(id, patch) {
      const { error } = await db.from('leads').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id);
      return error ? fail(error) : { ok: true, value: true };
    },
    async addConsent(rows) {
      const { error } = await db.from('consent_events').insert(rows);
      return error ? fail(error) : { ok: true, value: true };
    },
    async isSuppressed(email) {
      const { data, error } = await db.from('email_suppressions').select('email').eq('email', email).limit(1);
      // Fail closed: if we cannot tell, we do not send.
      return error ? fail(error) : { ok: true, value: (data ?? []).length > 0 };
    },
  };
}

/** In-memory store for tests. */
export function memoryStore(opts: { suppressed?: string[]; missing?: boolean } = {}): LeadStore & { leads: Map<string, LeadRow>; consent: ConsentEvent[] } {
  const leads = new Map<string, LeadRow>();
  const consent: ConsentEvent[] = [];
  const gone = (): { ok: false; missing: boolean; error: string } => ({ ok: false, missing: true, error: 'relation "leads" does not exist' });
  let n = 0;
  return {
    leads,
    consent,
    async findByEmail(email) {
      if (opts.missing) return gone();
      return { ok: true, value: Array.from(leads.values()).find((l) => l.email === email) ?? null };
    },
    async findById(id) {
      if (opts.missing) return gone();
      return { ok: true, value: leads.get(id) ?? null };
    },
    async insert(row) {
      if (opts.missing) return gone();
      const id = `00000000-0000-4000-8000-${String(++n).padStart(12, '0')}`;
      leads.set(id, { ...(row as unknown as LeadRow), id, first_session_id: row.first_session_id ?? row.latest_session_id ?? null });
      return { ok: true, value: id };
    },
    async update(id, patch) {
      if (opts.missing) return gone();
      const cur = leads.get(id);
      if (cur) leads.set(id, { ...cur, ...(patch as Partial<LeadRow>) });
      return { ok: true, value: true };
    },
    async addConsent(rows) {
      if (opts.missing) return gone();
      consent.push(...rows);
      return { ok: true, value: true };
    },
    async isSuppressed(email) {
      return { ok: true, value: (opts.suppressed ?? []).includes(email) };
    },
  };
}
