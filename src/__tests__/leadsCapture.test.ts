import { describe, it, expect, beforeAll } from 'vitest';
import { ageOn, isMinor, parseCapture } from '@/lib/leads/capture';
import { captureLead, contactHash, type CaptureDeps } from '@/lib/leads/captureLead';
import { NOTICE_VERSION, consentText } from '@/lib/leads/consentText';
import { maskEmail, mailModeFor, recordingMailer } from '@/lib/leads/mailer';
import { renderChartEmail } from '@/lib/leads/chartEmail';
import { makeResumeToken, verifyResumeToken } from '@/lib/leads/resumeToken';
import { memoryStore } from '@/lib/leads/store';
import { aiTells, claimHits } from '@/lib/funnel/toneLint';

// Invented addresses and answers only — this repository is public.

const SESSION = '7d3c1f9e-1111-4222-8333-444455556666';
const NOW = new Date(Date.UTC(2026, 9, 12, 8, 0, 0));
const body = (over: Record<string, unknown> = {}) => ({
  sessionId: SESSION,
  slug: 'repeating-lessons',
  lang: 'en',
  email: ' Asha.Test@Example.INVALID ',
  firstName: 'Asha',
  source: 'quiz_s15',
  consent: { service: true, marketing: false },
  answers: { focus_area: 'career', problems: 'career_stuck', birth_date: '1990-04-12', birth_time_known: 'exact', birth_time: '06:30', birth_city: 'Testpur', birth_city_lat: '26.85', birth_city_lng: '80.95', mind_words: 'private words' },
  utm: { utm_source: 'meta', evil: 'x' },
  ...over,
});

beforeAll(() => {
  process.env.UNSUBSCRIBE_SECRET = 'unit-test-signing-key-not-a-secret';
});

function deps(over: Partial<CaptureDeps> = {}): CaptureDeps & { mailer: ReturnType<typeof recordingMailer>; store: ReturnType<typeof memoryStore> } {
  const mailer = recordingMailer();
  const store = memoryStore();
  return {
    store,
    mailer,
    siteUrl: 'https://example.invalid',
    now: NOW,
    hashKey: 'hash-key',
    makeToken: (id, now) => makeResumeToken(id, now),
    unsubscribeUrl: (e) => `https://example.invalid/api/unsubscribe?t=${encodeURIComponent(e)}`,
    ...over,
  } as CaptureDeps & { mailer: ReturnType<typeof recordingMailer>; store: ReturnType<typeof memoryStore> };
}

describe('what the capture endpoint accepts', () => {
  it('normalises the address, keeps known answers only and never the free text', () => {
    const r = parseCapture(body(), 'in');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.input.email).toBe('asha.test@example.invalid');
    expect(r.input.country).toBe('IN');
    expect(r.input.answers).not.toHaveProperty('mind_words');
    expect(r.input.answers.birth_date).toBe('1990-04-12');
    expect(r.input.utm).toEqual({ utm_source: 'meta' });
    expect(r.input.consent).toEqual({ service: true, marketing: false });
    expect(r.input.serviceBox).toBe(true);
  });

  it('refuses a bad address, a bad session, and any capture without the affirmative act', () => {
    expect(parseCapture(body({ email: 'nope' }), null)).toEqual({ ok: false, error: 'bad_email' });
    expect(parseCapture(body({ sessionId: 'x' }), null)).toEqual({ ok: false, error: 'bad_payload' });
    expect(parseCapture(body({ source: 'newsletter' }), null)).toEqual({ ok: false, error: 'bad_payload' });
    expect(parseCapture(body({ consent: { service: false, marketing: true } }), null)).toEqual({ ok: false, error: 'consent_required' });
    expect(parseCapture(body({ consent: undefined }), null)).toEqual({ ok: false, error: 'consent_required' });
    expect(parseCapture(null, null)).toEqual({ ok: false, error: 'bad_payload' });
  });

  it('counts a marketing tick only when it is exactly true', () => {
    const r = parseCapture(body({ consent: { service: true, marketing: 'yes' } }), null);
    expect(r.ok && r.input.consent.marketing).toBe(false);
  });
});

describe('under 18', () => {
  it('computes whole-year age on the day', () => {
    expect(ageOn('2008-10-12', NOW)).toBe(18);
    expect(ageOn('2008-10-13', NOW)).toBe(17);
    expect(isMinor('2010-01-01', NOW)).toBe(true);
    expect(isMinor('1990-04-12', NOW)).toBe(false);
    expect(isMinor(undefined, NOW)).toBe(false);
  });
});

describe('saving a lead', () => {
  it('stores the lead, writes the ledger from the canonical words, and emails the chart link', async () => {
    const d = deps();
    const p = parseCapture(body({ consent: { service: true, marketing: true }, lang: 'hi' }), 'IN');
    if (!p.ok) throw new Error('parse');
    const r = await captureLead(d, p.input);
    expect(r).toMatchObject({ saved: true, emailed: true });

    const lead = Array.from(d.store.leads.values())[0];
    expect(lead.email).toBe('asha.test@example.invalid');
    expect(lead.first_name).toBe('Asha');
    expect(lead.focus_area).toBe('career');
    expect(lead.answers.birth_city).toBe('Testpur');
    expect(lead.utm_source).toBe('meta');
    expect(lead.stage).toBe('captured');

    expect(d.store.consent.map((c) => `${c.purpose}:${c.action}`)).toEqual(['service:notice_shown', 'service:granted', 'marketing:granted']);
    const marketing = d.store.consent.find((c) => c.purpose === 'marketing')!;
    expect(marketing.text_shown).toBe(consentText('marketing', 'hi'));
    expect(marketing.notice_version).toBe(NOTICE_VERSION);
    expect(marketing.contact_hash).toBe(contactHash('asha.test@example.invalid', 'hash-key'));
    expect(JSON.stringify(d.store.consent)).not.toContain('asha.test');

    expect(d.mailer.sent).toHaveLength(1);
    const mail = d.mailer.sent[0];
    expect(mail.to).toBe('asha.test@example.invalid');
    expect(mail.subject).toBe('Aapke chart ka link');
    const url = /https:\/\/example\.invalid\/q\/repeating-lessons\?r=([^"&\s]+)/.exec(mail.html);
    expect(url).not.toBeNull();
    const t = verifyResumeToken(decodeURIComponent(url![1]), NOW.getTime());
    expect(t?.leadId).toBe(lead.id);
  });

  it('records only the service grant when the marketing box is not ticked', async () => {
    const d = deps();
    const p = parseCapture(body(), null);
    if (!p.ok) throw new Error('parse');
    await captureLead(d, p.input);
    expect(d.store.consent.some((c) => c.purpose === 'marketing')).toBe(false);
    expect(d.mailer.sent[0].html).toContain('That is the only email we will send');
  });

  it('records the notice words, not the box words, when the service box was not shown', async () => {
    const d = deps();
    const p = parseCapture(body({ serviceBox: false }), null);
    if (!p.ok) throw new Error('parse');
    await captureLead(d, p.input);
    expect(d.store.consent.find((c) => c.action === 'granted')!.text_shown).toBe(consentText('notice', 'en'));
  });

  it('updates the same lead when the address comes back, and keeps the name already given', async () => {
    const d = deps();
    const a = parseCapture(body(), null);
    const b = parseCapture(body({ firstName: '', source: 'reveal_reask' }), null);
    if (!a.ok || !b.ok) throw new Error('parse');
    await captureLead(d, a.input);
    await captureLead(d, b.input);
    expect(d.store.leads.size).toBe(1);
    const lead = Array.from(d.store.leads.values())[0];
    expect(lead.first_name).toBe('Asha');
    expect(lead.source).toBe('quiz_s15');
    expect(lead.stage).toBe('revealed');
    expect(lead.reveal_viewed_at).toBe(NOW.toISOString());
  });
});

describe('when nothing may be sent', () => {
  it('stores and emails nothing for a birth date under 18', async () => {
    const d = deps();
    const p = parseCapture(body({ answers: { birth_date: '2012-05-05', focus_area: 'family' } }), null);
    if (!p.ok) throw new Error('parse');
    expect(await captureLead(d, p.input)).toEqual({ saved: false, emailed: false, reason: 'minor' });
    expect(d.store.leads.size).toBe(0);
    expect(d.store.consent).toHaveLength(0);
    expect(d.mailer.sent).toHaveLength(0);
  });

  it('does nothing without a birth date, or without a key to make the consent record', async () => {
    const noDate = parseCapture(body({ answers: { focus_area: 'career' } }), null);
    const ok = parseCapture(body(), null);
    if (!noDate.ok || !ok.ok) throw new Error('parse');
    expect(await captureLead(deps(), noDate.input)).toMatchObject({ saved: false, reason: 'no_birth_date' });
    const d = deps({ hashKey: null });
    expect(await captureLead(d, ok.input)).toMatchObject({ saved: false, reason: 'no_key' });
    expect(d.store.leads.size).toBe(0);
  });

  it('degrades quietly, sending nothing, until the tables exist', async () => {
    const d = deps({ store: memoryStore({ missing: true }) });
    const p = parseCapture(body(), null);
    if (!p.ok) throw new Error('parse');
    expect(await captureLead(d, p.input)).toEqual({ saved: false, emailed: false, reason: 'storage_unavailable' });
    expect(d.mailer.sent).toHaveLength(0);
  });

  it('never emails an address that has unsubscribed, but still saves it', async () => {
    const d = deps({ store: memoryStore({ suppressed: ['asha.test@example.invalid'] }) });
    const p = parseCapture(body(), null);
    if (!p.ok) throw new Error('parse');
    expect(await captureLead(d, p.input)).toMatchObject({ saved: true, emailed: false, reason: 'suppressed' });
    expect(d.mailer.sent).toHaveLength(0);
  });

  it('does not claim the email went when the mailer did not send it', async () => {
    for (const status of ['dry_run', 'unconfigured', 'invalid'] as const) {
      const d = deps({ mailer: recordingMailer({ status }) });
      const p = parseCapture(body(), null);
      if (!p.ok) throw new Error('parse');
      expect(await captureLead(d, p.input)).toMatchObject({ saved: true, emailed: false, reason: status });
    }
    const failing = deps({ mailer: recordingMailer({ status: 'provider_error', error: '500' }) });
    const p = parseCapture(body(), null);
    if (!p.ok) throw new Error('parse');
    expect(await captureLead(failing, p.input)).toMatchObject({ saved: true, emailed: false, reason: 'provider_error' });
  });

  it('sends no link when no signing key exists', async () => {
    const d = deps({ makeToken: () => null });
    const p = parseCapture(body(), null);
    if (!p.ok) throw new Error('parse');
    expect(await captureLead(d, p.input)).toMatchObject({ saved: true, emailed: false, reason: 'no_token' });
    expect(d.mailer.sent).toHaveLength(0);
  });
});

describe('when mail may leave the building', () => {
  it('is dry-run off production, and with the kill switch, and outside the allowlist', () => {
    expect(mailModeFor('a@x.invalid', { NODE_ENV: 'development' })).toBe('dry_run');
    expect(mailModeFor('a@x.invalid', { NODE_ENV: 'test' })).toBe('dry_run');
    expect(mailModeFor('a@x.invalid', { NODE_ENV: 'production' })).toBe('live');
    expect(mailModeFor('a@x.invalid', { NODE_ENV: 'production', LEADS_DRY_RUN: '1' })).toBe('dry_run');
    expect(mailModeFor('a@x.invalid', { NODE_ENV: 'production', LEADS_ALLOWLIST: 'team@x.invalid' })).toBe('dry_run');
    expect(mailModeFor('Team@X.invalid', { NODE_ENV: 'production', LEADS_ALLOWLIST: ' team@x.invalid, other@x.invalid' })).toBe('live');
    expect(mailModeFor('a@x.invalid', { NODE_ENV: 'development', LEADS_LIVE_SEND: '1' })).toBe('live');
    expect(mailModeFor('a@x.invalid', { NODE_ENV: 'production', LEADS_DRY_RUN: '1', LEADS_ALLOWLIST: 'a@x.invalid' })).toBe('dry_run');
  });
  it('masks addresses for logs and the screen', () => {
    expect(maskEmail('asha.test@example.invalid')).toBe('a***@example.invalid');
    expect(maskEmail('nonsense')).toBe('***');
  });
});

describe('the chart link token', () => {
  it('opens one chart, expires, and cannot be forged', () => {
    const id = '00000000-0000-4000-8000-000000000001';
    const t = makeResumeToken(id, NOW.getTime())!;
    expect(verifyResumeToken(t, NOW.getTime() + 1000)?.leadId).toBe(id);
    expect(verifyResumeToken(t, NOW.getTime() + 31 * 24 * 3600_000)).toBeNull();
    const [payload, mac] = t.split('.');
    const forged = `${Buffer.from(`00000000-0000-4000-8000-000000000002.${Math.floor(NOW.getTime() / 1000) + 99999}`).toString('base64').replace(/=+$/, '')}.${mac}`;
    expect(verifyResumeToken(forged, NOW.getTime())).toBeNull();
    expect(verifyResumeToken(`${payload}.AAAA`, NOW.getTime())).toBeNull();
    expect(verifyResumeToken('', NOW.getTime())).toBeNull();
    expect(verifyResumeToken('a.b.c', NOW.getTime())).toBeNull();
  });
});

describe('the chart link email', () => {
  const base = { firstName: 'Asha', resumeUrl: 'https://example.invalid/q/x?r=tok', unsubscribeUrl: 'https://example.invalid/u?t=1', expiresOn: new Date(Date.UTC(2026, 10, 11)) };

  it('says why it was sent, carries the link and a way out, and promises nothing else', () => {
    const m = renderChartEmail({ ...base, lang: 'en', marketingConsented: false });
    expect(m.subject).toBe('Your chart link');
    expect(m.html).toContain('You asked us to save your chart.');
    expect(m.html).toContain('https://example.invalid/q/x?r=tok');
    expect(m.html).toContain('works until 11 Nov 2026');
    expect(m.html).toContain('You are getting this because you asked VedicHour to save your chart.');
    expect(m.html).toContain('Stop emails');
    expect(m.html).toContain('privacy@vedichour.com');
    expect(m.html).not.toContain('have a VedicHour account');
    expect(m.text).toContain('Open my chart: https://example.invalid/q/x?r=tok');
  });

  it('does not promise a schedule even when they ticked the notes box', () => {
    const m = renderChartEmail({ ...base, lang: 'en', marketingConsented: true });
    expect(m.html).toContain('ticked the box for notes');
    expect(m.html).not.toMatch(/every week|weekly|once a week/i);
  });

  it('has no invented claim and no AI tell, in both languages', () => {
    for (const lang of ['en', 'hi'] as const) {
      for (const marketingConsented of [false, true]) {
        const m = renderChartEmail({ ...base, lang, marketingConsented });
        const visible = m.text.replace(/https?:\/\/\S+/g, '');
        expect(claimHits(visible), visible).toEqual([]);
        expect(aiTells(visible), visible).toEqual([]);
        expect(m.subject.length).toBeLessThan(60);
      }
    }
  });

  it('escapes a name that carries markup', () => {
    const m = renderChartEmail({ ...base, firstName: '<img src=x onerror=1>', lang: 'en', marketingConsented: false });
    expect(m.html).not.toContain('<img src=x');
  });
});

describe('the consent words', () => {
  it('exist in both languages for every purpose, and are never pre-written as accepted', () => {
    for (const k of ['notice', 'service', 'marketing'] as const) {
      expect(consentText(k, 'en').length).toBeGreaterThan(20);
      expect(consentText(k, 'hi').length).toBeGreaterThan(20);
      expect(consentText(k, 'hi')).not.toMatch(/[ऀ-ॿ]/);
    }
    for (const lang of ['en', 'hi'] as const) {
      for (const k of ['notice', 'service', 'marketing'] as const) expect(consentText(k, lang)).not.toMatch(/whatsapp|phone|call/i);
    }
  });
});
