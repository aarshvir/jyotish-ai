import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createHmac } from 'node:crypto';
import { makeUnsubToken, verifyUnsubToken } from './suppression';

const KEYS = ['UNSUBSCRIBE_SECRET', 'CRON_SECRET', 'SUPABASE_SERVICE_ROLE_KEY'] as const;

let saved: Record<string, string | undefined> = {};

beforeEach(() => {
  saved = Object.fromEntries(KEYS.map((k) => [k, process.env[k]]));
  for (const k of KEYS) delete process.env[k];
});

afterEach(() => {
  for (const k of KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k] as string;
  }
});

describe('unsubscribe token signing', () => {
  it('round-trips an email when a signing key is configured', () => {
    process.env.UNSUBSCRIBE_SECRET = 'a-real-secret';
    expect(verifyUnsubToken(makeUnsubToken('Reader@Example.com '))).toBe('reader@example.com');
  });

  it('rejects a token signed with a different key', () => {
    process.env.UNSUBSCRIBE_SECRET = 'key-one';
    const token = makeUnsubToken('reader@example.com');
    process.env.UNSUBSCRIBE_SECRET = 'key-two';
    expect(verifyUnsubToken(token)).toBeNull();
  });

  it('refuses to MINT a token when no signing key is configured', () => {
    expect(() => makeUnsubToken('reader@example.com')).toThrow(/UNSUBSCRIBE_SECRET/);
  });

  it('fails CLOSED when no signing key is configured — no hardcoded fallback to forge with', () => {
    // The removed fallback was the literal 'vedichour-unsub-fallback', readable by anyone
    // with the repo. A token forged with it must not verify.
    const b64url = (b: Buffer) =>
      b.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const email = 'victim@example.com';
    const forged = `${b64url(Buffer.from(email, 'utf8'))}.${b64url(
      createHmac('sha256', 'vedichour-unsub-fallback').update(email).digest(),
    )}`;

    expect(verifyUnsubToken(forged)).toBeNull();

    // …and it stays rejected once a real key is in place.
    process.env.UNSUBSCRIBE_SECRET = 'a-real-secret';
    expect(verifyUnsubToken(forged)).toBeNull();
  });
});
