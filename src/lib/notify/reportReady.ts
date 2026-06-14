/**
 * "Your report is ready" notification — email (with upsell/cross-sell) + WhatsApp.
 * Fire-and-forget from the report pipeline; never throws. No-ops gracefully until
 * RESEND_API_KEY / WHATSAPP_* are configured.
 */
import { createServiceClient } from '@/lib/supabase/admin';
import { sendEmail } from './email';
import { sendWhatsApp } from './whatsapp';
import { isFreePlan } from '@/lib/admin/analytics';

const SITE = 'https://www.vedichour.com';

function emailHtml(name: string, url: string, free: boolean): string {
  const upsell = free
    ? `<tr><td style="padding:20px 24px;background:#fbf7ec;border-radius:12px;">
         <p style="margin:0 0 8px;font-size:15px;color:#5a4a1a;font-weight:600;">This is your free preview. Unlock the full picture:</p>
         <p style="margin:0;font-size:14px;color:#6b5d35;line-height:1.6;">
           • <strong>Hour-by-Hour Forecast</strong> — every planetary hour rated for 7–30 days<br>
           • <strong>Deep Kundli Report</strong> — all 12 houses, doshas &amp; a 5-year outlook<br>
           • <strong>Kundli Matchmaking</strong> — full 36-point Gun Milan compatibility
         </p>
         <a href="${SITE}/pricing" style="display:inline-block;margin-top:14px;background:#d4af37;color:#1a1407;text-decoration:none;font-weight:700;padding:11px 22px;border-radius:9px;font-size:14px;">See plans →</a>
       </td></tr>`
    : `<tr><td style="padding:20px 24px;background:#fbf7ec;border-radius:12px;">
         <p style="margin:0 0 8px;font-size:15px;color:#5a4a1a;font-weight:600;">Go deeper with your other readings:</p>
         <p style="margin:0;font-size:14px;color:#6b5d35;line-height:1.6;">
           • <a href="${SITE}/kundali" style="color:#9a7b1a;">Deep Kundli Report</a> — your full chart across every life area<br>
           • <a href="${SITE}/synastry" style="color:#9a7b1a;">Kundli Matchmaking</a> — 36-point compatibility with a partner
         </p>
       </td></tr>`;

  return `<!doctype html><html><body style="margin:0;background:#f4f1ea;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f1ea;padding:28px 0;">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.06);">
        <tr><td style="background:#0a0a1a;padding:22px 24px;text-align:center;">
          <span style="color:#d4af37;font-size:20px;font-weight:700;letter-spacing:0.5px;">VedicHour</span>
        </td></tr>
        <tr><td style="padding:28px 24px 8px;">
          <h1 style="margin:0 0 10px;font-size:22px;color:#15131f;">${name}, your reading is ready ✨</h1>
          <p style="margin:0 0 20px;font-size:15px;color:#4a4658;line-height:1.6;">
            We have finished computing your chart and forecast from the exact moment of your birth. It is waiting for you now.
          </p>
          <a href="${url}" style="display:inline-block;background:#d4af37;color:#1a1407;text-decoration:none;font-weight:700;padding:13px 28px;border-radius:10px;font-size:15px;">Open my report →</a>
        </td></tr>
        <tr><td style="padding:18px 24px 26px;">
          <table role="presentation" width="100%"><tbody>${upsell}</tbody></table>
        </td></tr>
        <tr><td style="padding:0 24px 26px;">
          <p style="margin:0;font-size:12px;color:#9a96a8;line-height:1.6;">
            Sent by VedicHour · For reflection and guidance, not guaranteed outcomes.<br>
            <a href="${url}" style="color:#9a96a8;">${url}</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table></body></html>`;
}

function whatsappText(name: string, url: string, free: boolean): string {
  const tail = free
    ? '\n\nThis is your free preview — unlock the full Hour-by-Hour Forecast, deep Kundli or Matchmaking at ' + SITE + '/pricing'
    : '\n\nWant to go deeper? Your deep Kundli & Matchmaking readings are at ' + SITE + '/pricing';
  return `Namaste ${name} 🙏 Your VedicHour reading is ready. Open it here: ${url}${tail}`;
}

export async function notifyReportReady(reportId: string): Promise<void> {
  try {
    const db = createServiceClient();
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
        subject: free ? `${name}, your free VedicHour reading is ready` : `${name}, your VedicHour report is ready`,
        html: emailHtml(name, url, free),
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
