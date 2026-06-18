/**
 * Lifecycle jobs: founder daily digest + abandoned-checkout recovery.
 * Run once a day (folded into the reconcile-payments cron — Vercel Hobby caps crons at 2).
 * Every send is gated on RESEND_API_KEY / TWILIO_* and wrapped so it never throws.
 */
import { createServiceClient } from '@/lib/supabase/admin';
import { sendEmail } from './email';
import { sendWhatsApp } from './whatsapp';
import { toUsdCents, fetchAllAuthUsers, isFreePlan } from '@/lib/admin/analytics';
import { emailShell, emailButton, plainText } from './emailLayout';

const SITE = 'https://www.vedichour.com';
const FOUNDER_EMAIL = process.env.FOUNDER_EMAIL?.trim() || 'support@vedichour.com';

// ── Founder daily digest ──────────────────────────────────────────────────
export async function sendFounderDigest(): Promise<{ ok: boolean; skipped?: boolean }> {
  try {
    const db = createServiceClient();
    const since = new Date(Date.now() - 24 * 3600_000);
    const sinceIso = since.toISOString();
    const fresh = (t?: string | null) => !!t && new Date(t) >= since;

    const [users, reportsRes, paymentsRes, pendingRes] = await Promise.all([
      fetchAllAuthUsers(db),
      db.from('reports').select('plan_type, status, created_at').gte('created_at', sinceIso).limit(50000),
      db.from('ziina_payments').select('amount, currency, status, created_at').eq('status', 'completed').gte('created_at', sinceIso).limit(50000),
      db.from('reports').select('id').eq('status', 'error').gte('created_at', sinceIso).limit(50000),
    ]);

    const signups = users.filter((u) => fresh(u.created_at)).length;
    const reports = reportsRes.data ?? [];
    const reportsMade = reports.length;
    const completed = reports.filter((r) => r.status === 'complete').length;
    const paidReports = reports.filter((r) => !isFreePlan(r.plan_type)).length;
    const failed = (pendingRes.data ?? []).length;
    const orders = (paymentsRes.data ?? []).length;
    const revenueUsd = (paymentsRes.data ?? []).reduce((s, p) => s + toUsdCents((p as { amount?: number }).amount ?? 0, (p as { currency?: string }).currency ?? 'USD'), 0);

    const row = (k: string, v: string) =>
      `<tr><td style="padding:7px 0;border-bottom:1px solid #f0ece3;color:#6b6776;font-size:14px">${k}</td><td style="padding:7px 0;border-bottom:1px solid #f0ece3;text-align:right;font-weight:700;color:#15131f;font-size:15px">${v}</td></tr>`;
    const content = `
      <h1 style="margin:0 0 4px;font-size:20px;color:#15131f">Daily digest</h1>
      <p style="margin:0 0 16px;font-size:13px;color:#6b6776">Last 24 hours</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        ${row('New signups', String(signups))}
        ${row('Reports started', String(reportsMade))}
        ${row('Reports completed', String(completed))}
        ${row('Paid reports', String(paidReports))}
        ${row('Paid orders', String(orders))}
        ${row('Revenue (USD)', '$' + Math.round(revenueUsd / 100).toLocaleString())}
        ${row('Failed reports', String(failed))}
      </table>
      <div style="margin-top:20px">${emailButton('Open dashboard', `${SITE}/admin`)}</div>`;
    const html = emailShell({ preheader: `${signups} signups, $${Math.round(revenueUsd / 100)} revenue, ${orders} orders.`, contentHtml: content });
    const text = plainText([
      'VedicHour daily digest (last 24h):',
      `Signups: ${signups}`, `Reports started: ${reportsMade}`, `Reports completed: ${completed}`,
      `Paid reports: ${paidReports}`, `Paid orders: ${orders}`, `Revenue (USD): $${Math.round(revenueUsd / 100)}`,
      `Failed reports: ${failed}`, '', `Dashboard: ${SITE}/admin`,
    ]);

    await sendEmail({ to: FOUNDER_EMAIL, subject: `VedicHour: ${signups} signups, $${Math.round(revenueUsd / 100)}, ${orders} orders (24h)`, html, text });
    return { ok: true };
  } catch (e) {
    console.error('[lifecycle/digest]', e);
    return { ok: false };
  }
}

// ── Abandoned-checkout recovery ───────────────────────────────────────────
function abandonedHtml(name: string): string {
  const content = `
    <h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;color:#15131f">${name}, your reading is one step away</h1>
    <p style="margin:0 0 20px;font-size:16px;line-height:1.6;color:#2a2730">You started unlocking your VedicHour reading but didn't finish. Your chart is already computed and ready &mdash; pick up where you left off, and use code <strong>NEWUSER30</strong> for 30% off.</p>
    ${emailButton('Finish &amp; unlock', `${SITE}/pricing?promo=NEWUSER30`)}
    <p style="margin:18px 0 0;font-size:13px;color:#6b6776">24-hour money-back guarantee.</p>`;
  return emailShell({ preheader: `${name}, your reading is computed and ready to unlock.`, contentHtml: content });
}
function abandonedText(name: string): string {
  return plainText([
    `${name}, your VedicHour reading is one step away.`,
    '',
    `Your chart is computed and ready. Finish unlocking it and use code NEWUSER30 for 30% off:`,
    `${SITE}/pricing?promo=NEWUSER30`,
    '',
    '24-hour money-back guarantee.',
  ]);
}

export async function runAbandonedCheckoutRecovery(): Promise<{ ok: boolean; sent: number }> {
  let sent = 0;
  try {
    const db = createServiceClient();
    // Window 20-44h old → the daily cron catches each pending intent exactly once (no dedupe column needed).
    const from = new Date(Date.now() - 44 * 3600_000).toISOString();
    const to = new Date(Date.now() - 20 * 3600_000).toISOString();
    const { data: pending } = await db
      .from('ziina_payments')
      .select('report_id, user_id, created_at')
      .eq('status', 'pending')
      .gte('created_at', from)
      .lte('created_at', to)
      .limit(2000);

    for (const p of pending ?? []) {
      const reportId = (p as { report_id?: string }).report_id;
      if (!reportId) continue;
      // Skip if a completed payment exists for this report.
      const { data: done } = await db.from('ziina_payments').select('id').eq('report_id', reportId).eq('status', 'completed').limit(1).maybeSingle();
      if (done) continue;
      const { data: rep } = await db.from('reports').select('user_email, native_name, phone, status').eq('id', reportId).maybeSingle();
      if (!rep || rep.status === 'complete') continue;
      const email = (rep.user_email ?? '').trim();
      const name = ((rep.native_name ?? '').trim().split(' ')[0]) || 'there';
      if (email) await sendEmail({ to: email, subject: `${name}, your VedicHour reading is one step away`, html: abandonedHtml(name), text: abandonedText(name) });
      const phone = (rep.phone ?? '').trim();
      if (phone) await sendWhatsApp({ to: phone, body: `Namaste ${name} 🙏 Your VedicHour reading is computed and ready to unlock — finish here: ${SITE}/pricing?promo=NEWUSER30 (NEWUSER30 = 30% off).` });
      sent++;
    }
    return { ok: true, sent };
  } catch (e) {
    console.error('[lifecycle/recovery]', e);
    return { ok: false, sent };
  }
}
