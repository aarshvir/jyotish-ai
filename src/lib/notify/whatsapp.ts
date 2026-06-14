/**
 * WhatsApp via Meta WhatsApp Cloud API (plain fetch). Activates only when
 * WHATSAPP_TOKEN + WHATSAPP_PHONE_ID are set; otherwise logs and no-ops.
 *
 * Note: free-form text only reaches users inside a 24h customer-service window.
 * For cold, business-initiated sends Meta requires a pre-approved template — pass
 * { template } to use one. The "report ready" send happens right after the user
 * acts on the site, so a text message is usually fine.
 */
export interface SendWhatsAppArgs {
  to: string;
  body?: string;
  /** Optional approved template (name + language + body params) for cold sends. */
  template?: { name: string; lang?: string; params?: string[] };
}

export async function sendWhatsApp({ to, body, template }: SendWhatsAppArgs): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  const token = process.env.WHATSAPP_TOKEN?.trim();
  const phoneId = process.env.WHATSAPP_PHONE_ID?.trim();
  if (!token || !phoneId) {
    console.log(`[notify/whatsapp] not configured — skipped → ${to}`);
    return { ok: false, skipped: true };
  }
  const num = (to || '').replace(/[^\d]/g, '');
  if (num.length < 7) return { ok: false, error: 'invalid number' };

  const payload = template
    ? {
        messaging_product: 'whatsapp', to: num, type: 'template',
        template: {
          name: template.name,
          language: { code: template.lang ?? 'en' },
          ...(template.params?.length ? { components: [{ type: 'body', parameters: template.params.map((t) => ({ type: 'text', text: t })) }] } : {}),
        },
      }
    : { messaging_product: 'whatsapp', to: num, type: 'text', text: { body: body ?? '', preview_url: true } };

  try {
    const res = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) {
      console.error('[notify/whatsapp] error', res.status, (await res.text()).slice(0, 200));
      return { ok: false, error: String(res.status) };
    }
    return { ok: true };
  } catch (e) {
    console.error('[notify/whatsapp]', e);
    return { ok: false, error: String(e) };
  }
}
