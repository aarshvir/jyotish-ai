/**
 * "Your report is ready" notification — email + WhatsApp.
 * Fire-and-forget from the report pipeline; never throws. No-ops gracefully until
 * RESEND_API_KEY / TWILIO_* are configured.
 */
import { createServiceClient } from '@/lib/supabase/admin';
import { sendEmail } from './email';
import { sendWhatsApp } from './whatsapp';
import { isFreePlan } from '@/lib/admin/analytics';
import { emailShell, emailButton, plainText } from './emailLayout';

const SITE = 'https://www.vedichour.com';

function emailHtml(name: string, url: string, free: boolean): string {
  // Kept clean + transactional (one CTA, a single subtle upsell line) so it lands
  // in Primary, not Promotions. Entity-safe — no raw emoji/unicode.
  const upsell = free
    ? `<p style="margin:22px 0 0;font-size:14px;line-height:1.6;color:#6b6776">This is your free preview. When you're ready, your full <a href="${SITE}/pricing" style="color:#9a7b1a">hour-by-hour forecast, deep Kundli or matchmaking</a> goes much deeper.</p>`
    : `<p style="margin:22px 0 0;font-size:14px;line-height:1.6;color:#6b6776">Want to go further? Explore your <a href="${SITE}/kundali" style="color:#9a7b1a">deep Kundli</a> and <a href="${SITE}/synastry" style="color:#9a7b1a">matchmaking</a> readings.</p>`;

  const content = `
    <h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;color:#15131f">${name}, your reading is ready</h1>
    <p style="margin:0 0 22px;font-size:16px;line-height:1.6;color:#2a2730">We've finished computing your chart and forecast from the exact moment of your birth. It's ready to view now.</p>
    ${emailButton('Open my report', url)}
    ${upsell}`;

  return emailShell({ preheader: `${name}, your VedicHour reading is ready to view.`, contentHtml: content });
}

function emailText(name: string, url: string, free: boolean): string {
  return plainText([
    `${name}, your reading is ready.`,
    '',
    `We've finished computing your chart and forecast from the exact moment of your birth.`,
    `Open it here: ${url}`,
    '',
    free
      ? `This is your free preview — your full hour-by-hour forecast, deep Kundli and matchmaking go much deeper: ${SITE}/pricing`
      : `Go further with your deep Kundli and matchmaking readings: ${SITE}/pricing`,
  ]);
}

function whatsappText(name: string, url: string, free: boolean): string {
  const tail = free
    ? `\n\nThis is your free preview — unlock the full forecast, deep Kundli or matchmaking at ${SITE}/pricing`
    : `\n\nGo deeper with your Kundli & matchmaking readings: ${SITE}/pricing`;
  return `Namaste ${name}. Your VedicHour reading is ready: ${url}${tail}`;
}

export async function notifyReportReady(reportId: string): Promise<void> {
  try {
    const db = createServiceClient();

    // Idempotency claim: this runs inside a retryable Inngest finalize step, so a retry
    // would otherwise re-send the email + WhatsApp (real cost / spam). Atomically claim
    // notify_sent_at; only the first caller (it was NULL) proceeds. Tolerant of an
    // unapplied migration (20260617_reports_notify_sent_at) — if the column is missing
    // the claim errors and we fall through to send (status-quo at-least-once) rather than
    // block notifications entirely.
    const { data: claim, error: claimErr } = await db
      .from('reports')
      .update({ notify_sent_at: new Date().toISOString() })
      .eq('id', reportId)
      .is('notify_sent_at', null)
      .select('id')
      .maybeSingle();
    if (!claimErr && !claim) {
      return; // already notified by an earlier finalize
    }

    const { data } = await db
      .from('reports')
      .select('user_email, native_name, phone, plan_type')
      .eq('id', reportId)
      .maybeSingle();
    if (!data) return;
    const email = (data.user_email ?? '').trim();
    const name = ((data.native_name ?? '').trim().split(' ')[0]) || 'there';
    const free = isFreePlan(data.plan_type);
    const url = `${SITE}/report/${reportId}`;

    if (email) {
      await sendEmail({
        to: email,
        subject: `${name}, your VedicHour reading is ready`,
        html: emailHtml(name, url, free),
        text: emailText(name, url, free),
      });
    }
    const phone = (data.phone ?? '').trim();
    if (phone) {
      await sendWhatsApp({ to: phone, body: whatsappText(name, url, free) });
    }
  } catch (e) {
    console.error('[notify/reportReady]', e);
  }
}
