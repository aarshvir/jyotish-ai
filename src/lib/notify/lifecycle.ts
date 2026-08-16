/**
 * Lifecycle jobs: founder daily digest + abandoned-checkout recovery.
 * Run once a day (folded into the reconcile-payments cron — Vercel Hobby caps crons at 2).
 * Every send is gated on RESEND_API_KEY / TWILIO_* and wrapped so it never throws.
 */
import { createServiceClient } from '@/lib/supabase/admin';
import { sendEmail } from './email';
import { sendWhatsApp } from './whatsapp';
import { toUsdCents, fetchAllAuthUsers } from '@/lib/admin/analytics';
import { emailShell, emailButton, plainText } from './emailLayout';
import { fetchSuppressedSet, unsubscribeUrl } from './suppression';

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
      db.from('reports').select('plan_type, status, created_at, payment_status').gte('created_at', sinceIso).limit(50000),
      db.from('ziina_payments').select('amount, currency, status, created_at').eq('status', 'completed').gte('created_at', sinceIso).limit(50000),
      db.from('reports').select('id').eq('status', 'error').gte('created_at', sinceIso).limit(50000),
    ]);

    const signups = users.filter((u) => fresh(u.created_at)).length;
    const reports = reportsRes.data ?? [];
    const reportsMade = reports.length;
    const completed = reports.filter((r) => r.status === 'complete').length;
    // Count real paid reports by payment, matching the admin Users/Ops views.
    // Plan-based (!isFreePlan) over-counted bypass/promo paid-plan rows that never
    // produced a charge, so the digest disagreed with those screens.
    const paidReports = reports.filter(
      (r) => (r as { payment_status?: string }).payment_status === 'paid',
    ).length;
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
/**
 * Where an abandoned checkout actually resumes. NOT /pricing — that is a plan
 * chooser, so the reader lands one step further from finishing than the copy
 * promises. The real unlock is the onboard checkout for the plan they abandoned
 * (same shape as UNLOCK_7DAY_HREF in src/lib/pricing.ts).
 */
const PAID_PLANS = new Set(['7day', 'monthly', 'annual']);
function abandonedUnlockUrl(planType: string | null | undefined): string {
  const plan = planType && PAID_PLANS.has(planType) ? planType : '7day';
  return `${SITE}/onboard?plan=${plan}&promo=NEWUSER30`;
}

// Copy note: the recovery job SKIPS reports with status 'complete', so at send
// time the chart has NOT been computed — only the birth details were saved with
// the checkout draft. Never claim a finished reading is waiting.
function abandonedHtml(name: string, unlockUrl: string): string {
  const content = `
    <h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;color:#15131f">${name}, your reading is one step away</h1>
    <p style="margin:0 0 20px;font-size:16px;line-height:1.6;color:#2a2730">You started unlocking your VedicHour reading but didn't finish. Your birth details are still saved &mdash; pick up right where you left off, and use code <strong>NEWUSER30</strong> for 30% off. Your reading starts generating the moment checkout completes.</p>
    ${emailButton('Finish &amp; unlock', unlockUrl)}
    <p style="margin:18px 0 0;font-size:13px;color:#6b6776">24-hour money-back guarantee.</p>`;
  return emailShell({ preheader: `${name}, your details are saved — finish unlocking your reading.`, contentHtml: content });
}
function abandonedText(name: string, unlockUrl: string): string {
  return plainText([
    `${name}, your VedicHour reading is one step away.`,
    '',
    `Your birth details are still saved. Finish unlocking your reading and use code NEWUSER30 for 30% off:`,
    unlockUrl,
    '',
    '24-hour money-back guarantee.',
  ]);
}

// ── Preview → paid nurture drip ───────────────────────────────────────────
// Free/preview readers who got their sample report but never started checkout get
// nothing from the abandoned-checkout job (which only targets pending payments).
// This nudges them 3× over their first week, each email referencing THEIR question.
// Window-based dedup: the daily cron catches each report once per stage (mirrors
// runAbandonedCheckoutRecovery), so no per-report marker column is needed.

const NURTURE_STAGES = [
  { key: 's1', fromH: 20, toH: 44 }, //  ~day 1
  { key: 's2', fromH: 68, toH: 92 }, //  ~day 3
  { key: 's3', fromH: 164, toH: 188 }, // ~day 7
] as const;

function firstQuestionClause(personalContext: string | null | undefined): string {
  const q = (personalContext ?? '').trim().replace(/\s+/g, ' ').slice(0, 140);
  return q ? `you asked about <em>&ldquo;${escapeHtml(q)}&rdquo;</em>` : 'you came to VedicHour with a real question';
}
function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function nurtureEmail(stage: 's1' | 's2' | 's3', name: string, personalContext: string | null): { subject: string; html: string; text: string } {
  const qClause = firstQuestionClause(personalContext);
  const qPlain = (personalContext ?? '').trim().slice(0, 140);
  const unlockUrl = `${SITE}/onboard?plan=7day&promo=NEWUSER30`;
  const bullets = [
    'The exact hours and days ahead that favour your decision — hour by hour.',
    'Your 12-month timeline, so you act with the tide instead of against it.',
    'A direct, written answer to your question, grounded in your own chart.',
  ];
  const bulletHtml = bullets
    .map((b) => `<tr><td style="padding:4px 0;font-size:15px;line-height:1.5;color:#2a2730">&#10022;&nbsp; ${b}</td></tr>`)
    .join('');

  const copy = {
    s1: {
      subject: `${name}, the rest of your answer is ready`,
      lead: `Your VedicHour reading only scratched the surface — ${qClause}. Your full report answers it directly and shows the timing that matters.`,
      cta: 'See my full answer',
      ps: 'Use code NEWUSER30 for 30% off your first report — 24-hour money-back guarantee.',
    },
    s2: {
      subject: `${name}, here's exactly what you're missing`,
      lead: `Still weighing it up? Since ${qClause}, here's what the full report puts in your hands:`,
      cta: 'Unlock the full report',
      ps: 'NEWUSER30 still gets you 30% off. Most readers say the hour-by-hour timing alone was worth it.',
    },
    s3: {
      subject: `${name}, your 30% off is about to expire`,
      lead: `This is the last nudge — your personalized answer is one click away, and your NEWUSER30 discount won't stay forever. ${qClause[0].toUpperCase()}${qClause.slice(1)}: don't leave it unanswered.`,
      cta: 'Claim my report (30% off)',
      ps: '24-hour money-back guarantee — if it doesn\'t resonate, you pay nothing.',
    },
  }[stage];

  const content = `
    <h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;color:#15131f">${copy.subject}</h1>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#2a2730">${copy.lead}</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0 18px">${bulletHtml}</table>
    ${emailButton(copy.cta, unlockUrl)}
    <p style="margin:18px 0 0;font-size:13px;color:#6b6776">${copy.ps}</p>`;
  const html = emailShell({ preheader: copy.lead.replace(/<[^>]+>/g, '').slice(0, 120), contentHtml: content });
  const text = plainText([
    copy.subject,
    '',
    copy.lead.replace(/<[^>]+>/g, ''),
    '',
    ...bullets.map((b) => `- ${b}`),
    qPlain ? '' : '',
    `${copy.cta}: ${unlockUrl}`,
    '',
    copy.ps,
  ]);
  return { subject: copy.subject, html, text };
}

export async function runPreviewNurture(): Promise<{ ok: boolean; sent: number }> {
  let sent = 0;
  try {
    const db = createServiceClient();
    // Emails that already have a paid report — never nurture an existing customer.
    const { data: paidRows } = await db
      .from('reports')
      .select('user_email')
      .eq('payment_status', 'paid')
      .limit(50000);
    const paidEmails = new Set((paidRows ?? []).map((r) => (r as { user_email?: string }).user_email?.trim().toLowerCase()).filter(Boolean));
    const suppressed = await fetchSuppressedSet(db);

    for (const stage of NURTURE_STAGES) {
      const from = new Date(Date.now() - stage.toH * 3600_000).toISOString();
      const to = new Date(Date.now() - stage.fromH * 3600_000).toISOString();
      const { data: reports } = await db
        .from('reports')
        .select('id, user_email, native_name, personal_context, plan_type, payment_status, status, created_at')
        .in('plan_type', ['free', 'preview'])
        .eq('status', 'complete')
        .gte('created_at', from)
        .lte('created_at', to)
        .limit(2000);

      const seen = new Set<string>();
      for (const r of reports ?? []) {
        const rr = r as { user_email?: string; native_name?: string; personal_context?: string | null; payment_status?: string };
        const email = (rr.user_email ?? '').trim();
        const key = email.toLowerCase();
        if (!email || seen.has(key)) continue;
        if (rr.payment_status === 'paid' || rr.payment_status === 'promo') continue;
        if (paidEmails.has(key) || suppressed.has(key)) continue;
        seen.add(key);
        const name = ((rr.native_name ?? '').trim().split(' ')[0]) || 'there';
        const { subject, html, text } = nurtureEmail(stage.key, name, rr.personal_context ?? null);
        const res = await sendEmail({ to: email, subject, html, text, listUnsubscribeUrl: unsubscribeUrl(email) });
        if (res.ok) sent++;
      }
    }
    return { ok: true, sent };
  } catch (e) {
    console.error('[lifecycle/nurture]', e);
    return { ok: false, sent };
  }
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
      .select('report_id, user_id, plan_type, created_at')
      .eq('status', 'pending')
      .gte('created_at', from)
      .lte('created_at', to)
      .limit(2000);
    const suppressed = await fetchSuppressedSet(db);

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
      const unlockUrl = abandonedUnlockUrl((p as { plan_type?: string }).plan_type);
      if (email && !suppressed.has(email.toLowerCase())) await sendEmail({ to: email, subject: `${name}, your VedicHour reading is one step away`, html: abandonedHtml(name, unlockUrl), text: abandonedText(name, unlockUrl), listUnsubscribeUrl: unsubscribeUrl(email) });
      const phone = (rep.phone ?? '').trim();
      if (phone) await sendWhatsApp({ to: phone, body: `Namaste ${name} 🙏 Your birth details are saved — finish unlocking your VedicHour reading here: ${unlockUrl} (NEWUSER30 = 30% off).` });
      sent++;
    }
    return { ok: true, sent };
  } catch (e) {
    console.error('[lifecycle/recovery]', e);
    return { ok: false, sent };
  }
}
