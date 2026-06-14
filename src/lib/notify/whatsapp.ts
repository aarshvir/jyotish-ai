/**
 * WhatsApp via Twilio (plain fetch — no SDK). Activates only when TWILIO_ACCOUNT_SID,
 * TWILIO_AUTH_TOKEN and TWILIO_WHATSAPP_FROM are set; otherwise logs and no-ops.
 *
 * TWILIO_WHATSAPP_FROM is your Twilio WhatsApp sender, e.g. "whatsapp:+14155238886"
 * (the Twilio sandbox number while testing, or your approved Twilio WhatsApp number
 * in production). Recipients must be in E.164 format (+countrycode...). Free-form
 * text only reaches users inside the 24h session window or the sandbox; for cold
 * business-initiated sends Twilio requires an approved template (contentSid).
 */
export interface SendWhatsAppArgs {
  to: string;
  body?: string;
  /** Optional Twilio Content template SID (HX...) + variables for cold/business-initiated sends. */
  contentSid?: string;
  contentVariables?: Record<string, string>;
}

function toE164Whatsapp(raw: string): string {
  const trimmed = (raw || '').trim();
  const digits = trimmed.replace(/[^\d+]/g, '');
  const e164 = digits.startsWith('+') ? `+${digits.replace(/\+/g, '')}` : `+${digits.replace(/\D/g, '')}`;
  return `whatsapp:${e164}`;
}

export async function sendWhatsApp({ to, body, contentSid, contentVariables }: SendWhatsAppArgs): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  const sid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const token = process.env.TWILIO_AUTH_TOKEN?.trim();
  const fromRaw = process.env.TWILIO_WHATSAPP_FROM?.trim();
  if (!sid || !token || !fromRaw) {
    console.log(`[notify/whatsapp] Twilio not configured — skipped → ${to}`);
    return { ok: false, skipped: true };
  }
  const digits = (to || '').replace(/\D/g, '');
  if (digits.length < 7) return { ok: false, error: 'invalid number' };

  const from = fromRaw.startsWith('whatsapp:') ? fromRaw : `whatsapp:${fromRaw}`;
  const form = new URLSearchParams({ From: from, To: toE164Whatsapp(to) });
  if (contentSid) {
    form.set('ContentSid', contentSid);
    if (contentVariables) form.set('ContentVariables', JSON.stringify(contentVariables));
  } else {
    form.set('Body', body ?? '');
  }

  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: form.toString(),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) {
      console.error('[notify/whatsapp] Twilio error', res.status, (await res.text()).slice(0, 200));
      return { ok: false, error: String(res.status) };
    }
    return { ok: true };
  } catch (e) {
    console.error('[notify/whatsapp]', e);
    return { ok: false, error: String(e) };
  }
}
