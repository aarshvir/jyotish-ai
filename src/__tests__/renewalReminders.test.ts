import { describe, it, expect, vi } from 'vitest';
import {
  runRenewalReminders,
  renewalReminderEmail,
  MAX_REMINDERS_PER_RUN,
  type DueSubscription,
  type ReminderStore,
} from '@/lib/subscriptions/renewalReminders';

// Invented ids and addresses only — this repository is public.
const NOW = new Date('2026-09-13T03:00:00Z');
const inDays = (d: number) => new Date(NOW.getTime() + d * 86_400_000).toISOString();

function fakeStore(subs: DueSubscription[], opts: { emails?: Record<string, string | null>; suppressed?: string[]; missing?: boolean } = {}) {
  const claimed = new Set<string>();
  const key = (s: DueSubscription) => `${s.user_id}|${s.current_period_end}`;
  const store: ReminderStore = {
    endingSoon: vi.fn(async () => {
      if (opts.missing) throw new Error('TABLES_MISSING');
      return subs;
    }),
    claim: vi.fn(async (s) => {
      if (claimed.has(key(s))) return false;
      claimed.add(key(s));
      return true;
    }),
    release: vi.fn(async (s) => {
      claimed.delete(key(s));
    }),
    emailFor: vi.fn(async (id) => (opts.emails && id in opts.emails ? opts.emails[id] : `${id}@example.com`)),
    suppressed: vi.fn(async () => new Set(opts.suppressed ?? [])),
  };
  return { store, claimed };
}

const okSend = () => vi.fn(async () => ({ ok: true }));

describe('who gets a renewal reminder', () => {
  it('reminds a monthly plan 3 days out and an annual plan 14 days out, and nobody earlier', async () => {
    const subs: DueSubscription[] = [
      { user_id: 'm-due', plan: 'monthly', current_period_end: inDays(3) },
      { user_id: 'm-early', plan: 'monthly', current_period_end: inDays(5) },
      { user_id: 'a-due', plan: 'annual', current_period_end: inDays(14) },
      { user_id: 'a-early', plan: 'annual', current_period_end: inDays(20) },
      { user_id: 'lapsed', plan: 'monthly', current_period_end: inDays(-1) },
    ];
    const send = okSend();
    const r = await runRenewalReminders({ store: fakeStore(subs).store, send, now: NOW });
    expect(r).toMatchObject({ ok: true, due: 2, sent: 2 });
    expect(send.mock.calls.map((c) => (c[0] as { to: string }).to).sort()).toEqual(['a-due@example.com', 'm-due@example.com']);
  });

  it('links to one-tap renewal and never promises a price or discount', () => {
    const e = renewalReminderEmail({ plan: 'monthly', daysRemaining: 3, renewHref: 'https://www.vedichour.com/start?renew=1', unsubscribeHref: 'https://x/u' });
    expect(e.subject).toBe('Your VedicHour monthly plan ends in 3 days');
    expect(e.html).toContain('/start?renew=1');
    expect(e.text).toContain('Unsubscribe: https://x/u');
    expect(`${e.html}${e.text}`).not.toMatch(/%|off|discount|₹|\$|refund|guarantee/i);
    expect(renewalReminderEmail({ plan: 'annual', daysRemaining: 1, renewHref: 'r', unsubscribeHref: 'u' }).subject).toBe(
      'Your VedicHour annual plan ends tomorrow',
    );
  });
});

describe('sends at most once, and only when it should', () => {
  it('a second run for the same period sends nothing', async () => {
    const subs = [{ user_id: 'u1', plan: 'monthly' as const, current_period_end: inDays(2) }];
    const { store } = fakeStore(subs);
    const send = okSend();
    await runRenewalReminders({ store, send, now: NOW });
    const second = await runRenewalReminders({ store, send, now: NOW });
    expect(send).toHaveBeenCalledTimes(1);
    expect(second).toMatchObject({ sent: 0, alreadySent: 1 });
  });

  it('skips unsubscribed addresses and subscribers with no email, without claiming them', async () => {
    const subs = [
      { user_id: 'gone', plan: 'monthly' as const, current_period_end: inDays(2) },
      { user_id: 'noemail', plan: 'monthly' as const, current_period_end: inDays(2) },
    ];
    const { store, claimed } = fakeStore(subs, { suppressed: ['gone@example.com'], emails: { noemail: null } });
    const send = okSend();
    const r = await runRenewalReminders({ store, send, now: NOW });
    expect(r).toMatchObject({ sent: 0, suppressed: 1, noEmail: 1 });
    expect(send).not.toHaveBeenCalled();
    expect(claimed.size).toBe(0);
  });

  it('releases the claim when the email does not go out, so tomorrow retries', async () => {
    const subs = [{ user_id: 'u1', plan: 'monthly' as const, current_period_end: inDays(2) }];
    const { store, claimed } = fakeStore(subs);
    const notConfigured = vi.fn(async () => ({ ok: false, skipped: true }));
    const r1 = await runRenewalReminders({ store, send: notConfigured, now: NOW });
    expect(r1).toMatchObject({ sent: 0, notSent: 1 });
    expect(claimed.size).toBe(0);
    const throwing = vi.fn(async () => {
      throw new Error('provider down');
    });
    expect((await runRenewalReminders({ store, send: throwing, now: NOW })).notSent).toBe(1);
    expect(claimed.size).toBe(0);
    const send = okSend();
    expect((await runRenewalReminders({ store, send, now: NOW })).sent).toBe(1);
  });
});

describe('never gets in the way of the payment drain', () => {
  it('stays quiet when the subscription tables do not exist yet', async () => {
    const r = await runRenewalReminders({ store: fakeStore([], { missing: true }).store, send: okSend(), now: NOW });
    expect(r).toEqual({ ok: true, skipped: 'tables_missing', due: 0, sent: 0, alreadySent: 0, suppressed: 0, noEmail: 0, notSent: 0 });
  });

  it('never throws, even when the store fails', async () => {
    const { store } = fakeStore([{ user_id: 'u1', plan: 'monthly', current_period_end: inDays(2) }]);
    store.suppressed = vi.fn(async () => {
      throw new Error('db down');
    });
    await expect(runRenewalReminders({ store, send: okSend(), now: NOW })).resolves.toMatchObject({ ok: false, error: 'db down' });
  });

  it('caps the work per run', async () => {
    const subs = Array.from({ length: MAX_REMINDERS_PER_RUN + 10 }, (_, i) => ({
      user_id: `u${i}`,
      plan: 'monthly' as const,
      current_period_end: inDays(2),
    }));
    const send = okSend();
    const r = await runRenewalReminders({ store: fakeStore(subs).store, send, now: NOW });
    expect(r.due).toBe(MAX_REMINDERS_PER_RUN);
    expect(send).toHaveBeenCalledTimes(MAX_REMINDERS_PER_RUN);
  });
});
