import type { SupabaseClient } from '@supabase/supabase-js';
import { signingSecretOrNull } from '@/lib/notify/suppression';
import { NOTICE_VERSION } from './consentText';
import { contactHash } from './captureLead';
import { supabaseStore } from './store';

const UNSUBSCRIBED = 'Unsubscribed using the link in an email.';

/**
 * When someone unsubscribes, the consent ledger records it (both purposes: an unsubscribe is
 * global) next to the suppression row. Best effort and silent: it must never get in the way
 * of the unsubscribe itself, and it does nothing if the leads tables do not exist yet.
 */
export async function recordUnsubscribe(db: SupabaseClient, email: string, source: 'unsubscribe_link' | 'list_unsubscribe_post'): Promise<void> {
  try {
    const key = process.env.CONTACT_HASH_PEPPER?.trim() || signingSecretOrNull();
    if (!key) return;
    const store = supabaseStore(db);
    const found = await store.findByEmail(email.trim().toLowerCase());
    const leadId = found.ok ? (found.value?.id ?? null) : null;
    const hash = contactHash(email, key);
    const base = { lead_id: leadId, contact_hash: hash, channel: 'email' as const, source, notice_version: NOTICE_VERSION, lang: 'en', session_id: null, action: 'withdrawn' as const };
    await store.addConsent([
      { ...base, purpose: 'service', text_shown: UNSUBSCRIBED },
      { ...base, purpose: 'marketing', text_shown: UNSUBSCRIBED },
    ]);
  } catch {
    /* never block an unsubscribe */
  }
}
