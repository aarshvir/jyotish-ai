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

    const { data, error } = await db
      .from('reports')
      .select('user_email, native_name, phone, plan_type, notify_sent_at')
      .eq('id', reportId)
      .maybeSingle();

    let report = data as
      | {
          user_email?: string | null;
          native_name?: string | null;
          phone?: string | null;
          plan_type?: string | null;
          notify_sent_at?: string | null;
        }
      | null;
    const missingNotifyColumn =
      !!error && ((error.message ?? '').includes('notify_sent_at') || (error.message ?? '').includes('schema cache'));

    // Tolerant of an unapplied migration (20260617_reports_notify_sent_at). If the
    // column is missing, fall back to the pre-migration at-least-once behavior instead
    // of blocking notifications entirely.
    if (missingNotifyColumn) {
      const fallback = await db
        .from('reports')
        .select('user_email, native_name, phone, plan_type')
        .eq('id', reportId)
        .maybeSingle();
      report = fallback.data as typeof report;
    } else if (error) {
      console.warn('[notify/reportReady] report lookup failed:', error.message);
      return;
    }

    if (!report || report.notify_sent_at) return;
    const email = (report.user_email ?? '').trim();
    const name = ((report.native_name ?? '').trim().split(' ')[0]) || 'there';
    const free = isFreePlan(report.plan_type);
    const url = `${SITE}/report/${reportId}`;

    let delivered = false;
    if (email) {
      const result = await sendEmail({
        to: email,
        subject: `${name}, your VedicHour reading is ready`,
        html: emailHtml(name, url, free),
        text: emailText(name, url, free),
      });
      delivered = delivered || result.ok;
    }
    const phone = (report.phone ?? '').trim();
    if (phone) {
      const result = await sendWhatsApp({ to: phone, body: whatsappText(name, url, free) });
      delivered = delivered || result.ok;
    }

    // notify_sent_at means at least one configured channel actually accepted the
    // message. Failed/skipped sends stay NULL so a future finalize/recovery run can
    // try again instead of silently suppressing the user's ready notification.
    if (delivered && !missingNotifyColumn) {
      const { error: markErr } = await db
        .from('reports')
        .update({ notify_sent_at: new Date().toISOString() })
        .eq('id', reportId)
        .is('notify_sent_at', null);
      if (markErr) {
        console.warn('[notify/reportReady] notify_sent_at mark failed:', markErr.message);
      }
    } else if ((email || phone) && !delivered) {
      console.warn('[notify/reportReady] no delivery channel succeeded for report', reportId);
    }
  } catch (e) {
    console.error('[notify/reportReady]', e);
  }
}
