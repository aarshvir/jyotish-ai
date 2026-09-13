import type { SupabaseClient } from '@supabase/supabase-js';
import { sendEmail } from '@/lib/notify/email';
import { emailButton, emailShell, plainText } from '@/lib/notify/emailLayout';
import { fetchSuppressedSet, unsubscribeUrl } from '@/lib/notify/suppression';
import { daysLeft, isDueForRenewalReminder, RENEW_REMINDER_DAYS, type SubscriptionPlan } from '@/lib/subscriptions/period';

/**
 * One renewal reminder per paid period, sent a few days before access ends.
 *
 * Ziina cannot charge a saved card, so a subscription only continues if the subscriber pays again.
 * Without this email a period simply lapses and the subscriber loses access without warning.
 *
 * Runs from the daily reconcile-payments cron, ahead of the payment drain, so it must:
 *  - send at most once per (user, period, kind): the row is CLAIMED before the email goes out, and
 *    released if the send does not happen, so a retry or a second run can never email twice;
 *  - honour the unsubscribe list;
 *  - stay quiet when the subscription tables do not exist yet, instead of erroring every day;
 *  - never throw, and cap its work, so the payment drain after it always runs.
 */

export type ReminderKind = 'renew_soon';

export interface DueSubscription {
  user_id: string;
  plan: SubscriptionPlan;
  current_period_end: string;
}

/** Everything the job touches outside itself — Supabase in production, fakes in tests. */
export interface ReminderStore {
  /** Active, not-cancelled subscriptions ending within `withinDays`. Throws 'TABLES_MISSING' if not set up. */
  endingSoon(now: Date, withinDays: number): Promise<DueSubscription[]>;
  /** Insert the reminder row; false when it already exists (already sent, or claimed by another run). */
  claim(sub: DueSubscription, kind: ReminderKind): Promise<boolean>;
  /** Remove a claim whose email did not go out, so tomorrow's run can try again. */
  release(sub: DueSubscription, kind: ReminderKind): Promise<void>;
  emailFor(userId: string): Promise<string | null>;
  suppressed(): Promise<Set<string>>;
}

export interface RenewalReminderResult {
  ok: boolean;
  skipped?: 'tables_missing';
  due: number;
  sent: number;
  alreadySent: number;
  suppressed: number;
  noEmail: number;
  notSent: number;
  error?: string;
}

/** Hard cap per run: the cron shares a 60 s function with the payment drain that follows. */
export const MAX_REMINDERS_PER_RUN = 50;

const PLAN_LABEL: Record<SubscriptionPlan, string> = { monthly: 'monthly', annual: 'annual' };

export function renewalReminderEmail(opts: {
  plan: SubscriptionPlan;
  daysRemaining: number;
  renewHref: string;
  unsubscribeHref: string;
}): { subject: string; html: string; text: string } {
  const { plan, daysRemaining, renewHref, unsubscribeHref } = opts;
  const when = daysRemaining <= 1 ? 'tomorrow' : `in ${daysRemaining} days`;
  const subject = `Your VedicHour ${PLAN_LABEL[plan]} plan ends ${when}`;
  const contentHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#2a2730">Your VedicHour ${PLAN_LABEL[plan]} plan ends ${when}.</p>
    <p style="margin:0 0 20px;font-size:16px;line-height:1.6;color:#2a2730">Renew now and the new period starts when this one ends, so you do not lose a single day of your hour-by-hour forecast. Your birth details are already saved.</p>
    ${emailButton('Renew in one tap', renewHref)}
    <p style="margin:24px 0 0;font-size:12px;line-height:1.6;color:#6b6776">For reflection and planning only. Not medical, legal, financial, or emergency advice.<br><a href="${unsubscribeHref}" style="color:#6b6776">Unsubscribe</a></p>`;
  const html = emailShell({ preheader: `Renew before it ends and keep every day of your forecast.`, contentHtml });
  const text = plainText([
    `Your VedicHour ${PLAN_LABEL[plan]} plan ends ${when}.`,
    '',
    'Renew now and the new period starts when this one ends, so you do not lose a single day of your hour-by-hour forecast. Your birth details are already saved.',
    '',
    `Renew in one tap: ${renewHref}`,
    '',
    'For reflection and planning only. Not medical, legal, financial, or emergency advice.',
    `Unsubscribe: ${unsubscribeHref}`,
  ]);
  return { subject, html, text };
}

export async function runRenewalReminders(opts: {
  store: ReminderStore;
  send?: typeof sendEmail;
  now?: Date;
  site?: string;
  max?: number;
}): Promise<RenewalReminderResult> {
  const { store, send = sendEmail, now = new Date(), site = 'https://www.vedichour.com', max = MAX_REMINDERS_PER_RUN } = opts;
  const result: RenewalReminderResult = { ok: true, due: 0, sent: 0, alreadySent: 0, suppressed: 0, noEmail: 0, notSent: 0 };
  const kind: ReminderKind = 'renew_soon';

  try {
    const withinDays = Math.max(...Object.values(RENEW_REMINDER_DAYS));
    let candidates: DueSubscription[];
    try {
      candidates = await store.endingSoon(now, withinDays);
    } catch (e) {
      if (e instanceof Error && e.message === 'TABLES_MISSING') return { ...result, skipped: 'tables_missing' };
      throw e;
    }
    const due = candidates.filter((s) => isDueForRenewalReminder(s, now)).slice(0, max);
    result.due = due.length;
    if (!due.length) return result;

    const suppressed = await store.suppressed();
    for (const sub of due) {
      const email = (await store.emailFor(sub.user_id))?.trim().toLowerCase() ?? '';
      if (!email) {
        result.noEmail++;
        continue;
      }
      if (suppressed.has(email)) {
        result.suppressed++;
        continue;
      }
      if (!(await store.claim(sub, kind))) {
        result.alreadySent++;
        continue;
      }
      const { subject, html, text } = renewalReminderEmail({
        plan: sub.plan,
        daysRemaining: daysLeft(sub, now),
        renewHref: `${site}/start?renew=1`,
        unsubscribeHref: unsubscribeUrl(email, site),
      });
      let delivered = false;
      try {
        const r = await send({ to: email, subject, html, text, listUnsubscribeUrl: unsubscribeUrl(email, site) });
        delivered = r.ok && !r.skipped;
      } catch {
        delivered = false;
      }
      if (delivered) {
        result.sent++;
      } else {
        // Not sent (no RESEND key yet, provider error): release so tomorrow's run tries again.
        result.notSent++;
        await store.release(sub, kind).catch(() => {});
      }
    }
    return result;
  } catch (e) {
    return { ...result, ok: false, error: e instanceof Error ? e.message.slice(0, 200) : String(e).slice(0, 200) };
  }
}

/** PostgREST / Postgres codes for a table that does not exist. */
function isMissingTable(err: { code?: string; message?: string } | null | undefined): boolean {
  if (!err) return false;
  return err.code === '42P01' || err.code === 'PGRST205' || /does not exist|could not find the table/i.test(err.message ?? '');
}

export function supabaseReminderStore(db: SupabaseClient): ReminderStore {
  return {
    async endingSoon(now, withinDays) {
      const until = new Date(now.getTime() + (withinDays + 1) * 86_400_000).toISOString();
      const { data, error } = await db
        .from('subscriptions')
        .select('user_id, plan, current_period_end')
        .is('canceled_at', null)
        .gt('current_period_end', now.toISOString())
        .lte('current_period_end', until);
      if (isMissingTable(error)) throw new Error('TABLES_MISSING');
      if (error) throw new Error(`subscriptions query failed: ${error.message}`);
      return (data ?? []) as DueSubscription[];
    },
    async claim(sub, kind) {
      const { error } = await db
        .from('subscription_reminders')
        .insert({ user_id: sub.user_id, period_end: sub.current_period_end, kind });
      if (!error) return true;
      if (error.code === '23505') return false; // already claimed or sent for this period
      if (isMissingTable(error)) throw new Error('TABLES_MISSING');
      throw new Error(`reminder claim failed: ${error.message}`);
    },
    async release(sub, kind) {
      await db
        .from('subscription_reminders')
        .delete()
        .eq('user_id', sub.user_id)
        .eq('period_end', sub.current_period_end)
        .eq('kind', kind);
    },
    async emailFor(userId) {
      try {
        const { data } = await db.auth.admin.getUserById(userId);
        return data.user?.email ?? null;
      } catch {
        return null;
      }
    },
    suppressed: () => fetchSuppressedSet(db),
  };
}
