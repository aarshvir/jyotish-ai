import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createHmac } from 'node:crypto';
import { makeResumeToken, verifyResumeToken } from '@/lib/onboard/resumeToken';
import { makeUnsubToken } from '@/lib/notify/suppression';

const ID = '11111111-2222-4333-8444-555555555555';
const OTHER = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
const NOW = 1_790_000_000;
const DAY = 86_400;
const KEYS = ['UNSUBSCRIBE_SECRET', 'CRON_SECRET', 'SUPABASE_SERVICE_ROLE_KEY'] as const;
const SECRET = 'test-signing-secret';

const b64url = (b: Buffer) => b.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

let saved: Record<string, string | undefined> = {};
beforeEach(() => {
  saved = {};
  for (const k of KEYS) {
    saved[k] = process.env[k];
    delete process.env[k];
  }
  process.env.UNSUBSCRIBE_SECRET = SECRET;
});
afterEach(() => {
  for (const k of KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

describe('resume tokens', () => {
  it('round-trips a report id', () => {
    expect(verifyResumeToken(makeResumeToken(ID, NOW), NOW)).toBe(ID);
  });

  it('rejects a token pointed at someone else’s report', () => {
    const [, sig] = makeResumeToken(ID, NOW).split('.');
    const forged = `${b64url(Buffer.from(`${OTHER}.${NOW}`))}.${sig}`;
    expect(verifyResumeToken(forged, NOW)).toBeNull();
  });

  it('rejects a tampered signature', () => {
    const [payload, sig] = makeResumeToken(ID, NOW).split('.');
    const flipped = sig.slice(0, -1) + (sig.endsWith('A') ? 'B' : 'A');
    expect(verifyResumeToken(`${payload}.${flipped}`, NOW)).toBeNull();
  });

  it('expires after 45 days', () => {
    const t = makeResumeToken(ID, NOW);
    expect(verifyResumeToken(t, NOW + 44 * DAY)).toBe(ID);
    expect(verifyResumeToken(t, NOW + 46 * DAY)).toBeNull();
  });

  it('rejects a token issued in the future beyond clock skew', () => {
    expect(verifyResumeToken(makeResumeToken(ID, NOW + 3600), NOW)).toBeNull();
    expect(verifyResumeToken(makeResumeToken(ID, NOW + 60), NOW)).toBe(ID);
  });

  it('is domain-separated: a signature made without the resume prefix is refused', () => {
    const payload = `${ID}.${NOW}`;
    const unprefixed = createHmac('sha256', SECRET).update(payload).digest();
    expect(verifyResumeToken(`${b64url(Buffer.from(payload))}.${b64url(unprefixed)}`, NOW)).toBeNull();
  });

  it('does not accept an unsubscribe token', () => {
    expect(verifyResumeToken(makeUnsubToken('someone@example.com'), NOW)).toBeNull();
  });

  it('fails closed with no signing key', () => {
    const t = makeResumeToken(ID, NOW);
    delete process.env.UNSUBSCRIBE_SECRET;
    expect(verifyResumeToken(t, NOW)).toBeNull();
    expect(() => makeResumeToken(ID, NOW)).toThrow();
  });

  it('rejects malformed input', () => {
    for (const bad of ['', 'abc', 'a.b.c', '.', 'x.', '.y']) {
      expect(verifyResumeToken(bad, NOW)).toBeNull();
    }
  });
});
