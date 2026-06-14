/**
 * Welcome email — sent once, the first time a user signs in (new account).
 * Gated on RESEND_API_KEY; never throws.
 */
import { sendEmail } from './email';

const SITE = 'https://www.vedichour.com';

export async function sendWelcomeEmail(email: string, displayName?: string): Promise<void> {
  try {
    if (!email) return;
    const name = (displayName ?? '').trim().split(' ')[0] || 'there';
    const html = `<!doctype html><html><body style="margin:0;background:#f4f1ea;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif">
      <table width="100%" style="background:#f4f1ea;padding:28px 0"><tr><td align="center">
        <table width="100%" style="max-width:540px;background:#fff;border-radius:16px;overflow:hidden">
          <tr><td style="background:#0a0a1a;padding:20px;text-align:center"><span style="color:#d4af37;font-size:20px;font-weight:700">VedicHour</span></td></tr>
          <tr><td style="padding:28px 24px">
            <h1 style="margin:0 0 10px;font-size:22px;color:#15131f">Welcome, ${name} 🌙</h1>
            <p style="margin:0 0 16px;font-size:15px;color:#4a4658;line-height:1.6">
              You just joined VedicHour — Vedic astrology decoded hour by hour, computed with Swiss Ephemeris precision and explained in plain English.
            </p>
            <p style="margin:0 0 8px;font-size:15px;color:#4a4658;font-weight:600">Here's where to start:</p>
            <p style="margin:0 0 20px;font-size:14px;color:#6b5d35;line-height:1.7">
              • <a href="${SITE}/free-kundli" style="color:#9a7b1a">Generate your free Kundli</a> — your full birth chart in a minute<br>
              • <a href="${SITE}/onboard" style="color:#9a7b1a">Get your hour-by-hour forecast</a> — the best windows of your day<br>
              • <a href="${SITE}/synastry" style="color:#9a7b1a">Check compatibility</a> — 36-point Gun Milan
            </p>
            <a href="${SITE}/onboard" style="display:inline-block;background:#d4af37;color:#1a1407;text-decoration:none;font-weight:700;padding:13px 26px;border-radius:10px;font-size:15px">Start my free reading →</a>
            <p style="margin:16px 0 0;font-size:13px;color:#6b5d35">Use code <b>NEWUSER30</b> for 30% off your first paid report.</p>
          </td></tr>
          <tr><td style="padding:0 24px 24px"><p style="margin:0;font-size:12px;color:#9a96a8">For reflection and guidance, not guaranteed outcomes. ${SITE}</p></td></tr>
        </table></td></tr></table></body></html>`;
    await sendEmail({ to: email, subject: `Welcome to VedicHour, ${name} 🌙`, html });
  } catch (e) {
    console.error('[notify/welcome]', e);
  }
}
