/**
 * Lifecycle jobs: founder daily digest + abandoned-checkout recovery.
 * Run once a day (folded into the reconcile-payments cron — Vercel Hobby caps crons at 2).
 * Every send is gated on RESEND_API_KEY / TWILIO_* and wrapped so it never throws.
 */
import { createServiceClient } from '@/lib/supabase/admin';
import { sendEmail } from './email';
import { sendWhatsApp } from './whatsapp';
import { toUsdCents, fetchAllAuthUsers, isFreePlan } from '@/lib/admin/analytics';

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
      db.from('reports').select('id').eq('status', 'failed').gte('created_at', sinceIso).limit(50000),
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
      `<tr><td style="padding:6px 0;color:#4a4658">${k}</td><td style="padding:6px 0;text-align:right;font-weight:700;color:#15131f">${v}</td></tr>`;
    const html = `<!doctype html><html><body style="margin:0;background:#f4f1ea;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif">
      <table width="100%" style="background:#f4f1ea;padding:24px 0"><tr><td align="center">
        <table width="100%" style="max-width:480px;background:#fff;border-radius:14px;overflow:hidden">
          <tr><td style="background:#0a0a1a;padding:18px;text-align:center"><span style="color:#d4af37;font-weight:700">VedicHour · Daily Digest</span></td></tr>
          <tr><td style="padding:22px 24px"><p style="margin:0 0 14px;color:#4a4658">Last 24 hours:</p>
            <table width="100%" style="font-size:15px">
              ${row('New signups', String(signups))}
              ${row('Reports started', String(reportsMade))}
              ${row('Reports completed', String(completed))}
              ${row('Paid reports', String(paidReports))}
              ${row('Paid orders', String(orders))}
              ${row('Revenue (USD)', '$' + Math.round(revenueUsd / 100).toLocaleString())}
              ${row('Failed reports ⚠', String(failed))}
            </table>
            <a href="${SITE}/admin" style="display:inline-block;margin-top:18px;background:#d4af37;color:#1a1407;text-decoration:none;font-weight:700;padding:10px 20px;border-radius:9px">Open dashboard →</a>
          </td></tr>
        </table></td></tr></table></body></html>`;

    await sendEmail({ to: FOUNDER_EMAIL, subject: `VedicHour: ${signups} signups · $${Math.round(revenueUsd / 100)} · ${orders} orders (24h)`, html });
    return { ok: true };
  } catch (e) {
    console.error('[lifecycle/digest]', e);
    return { ok: false };
  }
}

// ── Abandoned-checkout recovery ───────────────────────────────────────────
function abandonedHtml(name: string): string {
  return `<!doctype html><html><body style="margin:0;background:#f4f1ea;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif">
    <table width="100%" style="background:#f4f1ea;padding:28px 0"><tr><td align="center">
      <table width="100%" style="max-width:540px;background:#fff;border-radius:16px;overflow:hidden">
        <tr><td style="background:#0a0a1a;padding:20px;text-align:center"><span style="color:#d4af37;font-size:20px;font-weight:700">VedicHour</span></td></tr>
        <tr><td style="padding:26px 24px">
          <h1 style="margin:0 0 10px;font-size:21px;color:#15131f">${name}, your reading is one step away ✨</h1>
          <p style="margin:0 0 18px;font-size:15px;color:#4a4658;line-height:1.6">You started unlocking your VedicHour reading but didn't finish. Your chart is computed and ready — pick up where you left off, and use code <b>NEWUSER30</b> for 30% off.</p>
          <a href="${SITE}/pricing?promo=NEWUSER30" style="display:inline-block;background:#d4af37;color:#1a1407;text-decoration:none;font-weight:700;padding:13px 26px;border-radius:10px;font-size:15px">Finish &amp; unlock →</a>
          <p style="margin:18px 0 0;font-size:12px;color:#9a96a8">24-hour money-back guarantee. ${SITE}</p>
        </td></tr>
      </table></td></tr></table></body></html>`;
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
      if (email) await sendEmail({ to: email, subject: `${name}, your VedicHour reading is one step away`, html: abandonedHtml(name) });
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
