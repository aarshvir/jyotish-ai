/**
 * Transactional email via Resend (no SDK — plain fetch). Activates only when
 * RESEND_API_KEY is set; otherwise it logs and no-ops so nothing breaks before
 * the key is configured in Vercel. Set EMAIL_FROM too (e.g. "VedicHour <hello@vedichour.com>").
 */
export interface SendEmailArgs {
  to: string;
  subject: string;
  html: string;
  /** Plain-text alternative — strongly improves deliverability + Primary-tab placement. */
  text?: string;
  replyTo?: string;
  /**
   * HTTPS one-click unsubscribe URL for MARKETING mail (nurture/recovery/digest to
   * users). When set, adds RFC 8058 List-Unsubscribe + List-Unsubscribe-Post headers
   * that Gmail/Yahoo now require from bulk senders. Omit for transactional mail
   * (report-ready, admin alerts) which is exempt.
   */
  listUnsubscribeUrl?: string;
}

export async function sendEmail({ to, subject, html, text, replyTo, listUnsubscribeUrl }: SendEmailArgs): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  const key = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim() || 'VedicHour <support@vedichour.com>';
  if (!key) {
    console.log(`[notify/email] RESEND_API_KEY not set — skipped: "${subject}" → ${to}`);
    return { ok: false, skipped: true };
  }
  if (!to || !to.includes('@')) return { ok: false, error: 'invalid recipient' };
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to,
        subject,
        html,
        ...(text ? { text } : {}),
        reply_to: replyTo ?? 'support@vedichour.com',
        headers: listUnsubscribeUrl
          ? {
              // One-click (RFC 8058) — required by Gmail/Yahoo for bulk marketing mail.
              'List-Unsubscribe': `<${listUnsubscribeUrl}>, <mailto:support@vedichour.com?subject=unsubscribe>`,
              'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
            }
          : { 'List-Unsubscribe': '<mailto:support@vedichour.com?subject=unsubscribe>' },
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) {
      console.error('[notify/email] Resend error', res.status, (await res.text()).slice(0, 200));
      return { ok: false, error: String(res.status) };
    }
    return { ok: true };
  } catch (e) {
    console.error('[notify/email]', e);
    return { ok: false, error: String(e) };
  }
}
