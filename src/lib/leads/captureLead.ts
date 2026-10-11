import { createHash } from 'node:crypto';
import { NOTICE_VERSION, consentText } from './consentText';
import { isMinor, type CaptureInput } from './capture';
import { renderChartEmail } from './chartEmail';
import type { LeadMailer } from './mailer';
import type { ConsentEvent, LeadStore, LeadWrite } from './store';

/**
 * Saves a lead, writes the consent ledger, and emails the chart link — in that order, and
 * never the email if any earlier step failed. Pure given its dependencies, so the whole
 * decision table is unit-tested with an in-memory store and a recording mailer.
 */

export interface CaptureDeps {
  store: LeadStore;
  mailer: LeadMailer;
  siteUrl: string;
  now: Date;
  /** Secret mixed into the contact hash. Without one nothing is stored (no consent evidence is possible). */
  hashKey: string | null;
  makeToken: (leadId: string, nowMs: number) => string | null;
  unsubscribeUrl: (email: string) => string;
}

export type NotSaved = 'minor' | 'no_birth_date' | 'no_key' | 'storage_unavailable' | 'storage_error';
export type NotEmailed = 'dry_run' | 'suppressed' | 'suppression_check_failed' | 'unconfigured' | 'provider_error' | 'invalid' | 'no_token';

export type CaptureResult =
  | { saved: false; emailed: false; reason: NotSaved }
  | { saved: true; emailed: true; leadId: string }
  | { saved: true; emailed: false; leadId: string; reason: NotEmailed };

export function contactHash(email: string, key: string): string {
  return createHash('sha256').update(`${email.trim().toLowerCase()}|${key}`).digest('hex');
}

function fields(input: CaptureInput, existing: { stage: string; reveal_viewed_at: string | null; source: string } | null, nowIso: string): Partial<LeadWrite> {
  const a = input.answers;
  const reask = input.source === 'reveal_reask';
  return {
    first_name: input.firstName,
    lang: input.lang,
    country: input.country,
    slug: input.slug,
    latest_session_id: input.sessionId,
    focus_area: a.focus_area ?? null,
    goal_12m: a.goal_12m ?? null,
    birth_time_known: a.birth_time_known ?? null,
    problems: a.problems ?? null,
    answers: a,
    stage: reask && (!existing || existing.stage === 'captured') ? 'revealed' : (existing?.stage ?? 'captured'),
    reveal_viewed_at: existing?.reveal_viewed_at ?? (reask ? nowIso : null),
  };
}

export async function captureLead(deps: CaptureDeps, input: CaptureInput): Promise<CaptureResult> {
  const { store } = deps;
  const nowIso = deps.now.toISOString();

  if (!input.answers.birth_date) return { saved: false, emailed: false, reason: 'no_birth_date' };
  if (isMinor(input.answers.birth_date, deps.now)) return { saved: false, emailed: false, reason: 'minor' };
  if (!deps.hashKey) return { saved: false, emailed: false, reason: 'no_key' };

  // 1. the lead
  const found = await store.findByEmail(input.email);
  if (!found.ok) return { saved: false, emailed: false, reason: found.missing ? 'storage_unavailable' : 'storage_error' };

  let leadId: string;
  if (found.value) {
    leadId = found.value.id;
    const patch = fields(input, found.value, nowIso);
    // A later capture never erases a name already given.
    if (!patch.first_name) delete patch.first_name;
    const up = await store.update(leadId, patch);
    if (!up.ok) return { saved: false, emailed: false, reason: up.missing ? 'storage_unavailable' : 'storage_error' };
  } else {
    const ins = await store.insert({
      ...(fields(input, null, nowIso) as LeadWrite),
      email: input.email,
      source: input.source,
      first_session_id: input.sessionId,
      utm_source: input.utm.utm_source ?? null,
      utm_medium: input.utm.utm_medium ?? null,
      utm_campaign: input.utm.utm_campaign ?? null,
      utm_content: input.utm.utm_content ?? null,
    });
    if (!ins.ok) return { saved: false, emailed: false, reason: ins.missing ? 'storage_unavailable' : 'storage_error' };
    leadId = ins.value;
  }

  // 2. the consent ledger: the words people were shown, looked up here, never taken from the browser
  const hash = contactHash(input.email, deps.hashKey);
  const base = { lead_id: leadId, contact_hash: hash, channel: 'email' as const, source: input.source, notice_version: NOTICE_VERSION, lang: input.lang, session_id: input.sessionId };
  const rows: ConsentEvent[] = [
    { ...base, purpose: 'service', action: 'notice_shown', text_shown: consentText('notice', input.lang) },
    { ...base, purpose: 'service', action: 'granted', text_shown: consentText(input.serviceBox ? 'service' : 'notice', input.lang) },
  ];
  if (input.consent.marketing) rows.push({ ...base, purpose: 'marketing', action: 'granted', text_shown: consentText('marketing', input.lang) });
  const ledger = await store.addConsent(rows);
  // No evidence of consent, no email.
  if (!ledger.ok) return { saved: false, emailed: false, reason: ledger.missing ? 'storage_unavailable' : 'storage_error' };

  // 3. the email — never to an address that has unsubscribed
  const sup = await store.isSuppressed(input.email);
  if (!sup.ok) return { saved: true, emailed: false, leadId, reason: 'suppression_check_failed' };
  if (sup.value) return { saved: true, emailed: false, leadId, reason: 'suppressed' };

  const token = deps.makeToken(leadId, deps.now.getTime());
  if (!token) return { saved: true, emailed: false, leadId, reason: 'no_token' };

  const mail = renderChartEmail({
    lang: input.lang,
    firstName: input.firstName,
    resumeUrl: `${deps.siteUrl}/q/${input.slug}?r=${encodeURIComponent(token)}`,
    unsubscribeUrl: deps.unsubscribeUrl(input.email),
    marketingConsented: input.consent.marketing,
    expiresOn: new Date(deps.now.getTime() + 30 * 24 * 3600_000),
  });
  const out = await deps.mailer.send({ to: input.email, ...mail, listUnsubscribeUrl: deps.unsubscribeUrl(input.email) });
  if (out.status === 'sent') return { saved: true, emailed: true, leadId };
  return { saved: true, emailed: false, leadId, reason: out.status };
}
