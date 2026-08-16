/**
 * Welcome email — sent once, the first time a user signs in (new account).
 * Gated on RESEND_API_KEY; never throws.
 */
import { sendEmail } from './email';
import { emailShell, emailButton, plainText } from './emailLayout';

const SITE = 'https://www.vedichour.com';

export async function sendWelcomeEmail(email: string, displayName?: string): Promise<void> {
  try {
    if (!email) return;
    const name = (displayName ?? '').trim().split(' ')[0] || 'there';
    const content = `
      <h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;color:#15131f">Welcome, ${name}</h1>
      <p style="margin:0 0 18px;font-size:16px;line-height:1.6;color:#2a2730">You&apos;ve joined VedicHour &mdash; Vedic astrology decoded hour by hour, in plain English.</p>
      <p style="margin:0 0 10px;font-size:15px;font-weight:700;color:#15131f">Three ways to start:</p>
      <p style="margin:0 0 22px;font-size:15px;line-height:1.8;color:#2a2730">
        &bull; <a href="${SITE}/onboard?plan=free" style="color:#9a7b1a">Generate your free chart</a> &mdash; your birth chart in a minute<br>
        &bull; <a href="${SITE}/onboard?plan=7day&amp;promo=NEWUSER30" style="color:#9a7b1a">Get your hour-by-hour forecast</a> &mdash; the clearer windows of your day<br>
        &bull; <a href="${SITE}/synastry" style="color:#9a7b1a">Check compatibility</a> &mdash; 36-point Gun Milan
      </p>
      ${emailButton('Start my free reading', `${SITE}/onboard?plan=free`)}`;
    await sendEmail({
      to: email,
      subject: `Welcome to VedicHour, ${name}`,
      html: emailShell({ preheader: 'Start with your free Kundli and hour-by-hour forecast.', contentHtml: content }),
      text: plainText([
        `Welcome to VedicHour, ${name}.`,
        '',
        'Vedic astrology decoded hour by hour, in plain English.',
        '',
        `Free chart: ${SITE}/onboard?plan=free`,
        `Hour-by-hour forecast: ${SITE}/onboard?plan=7day&promo=NEWUSER30`,
        `Compatibility (Gun Milan): ${SITE}/synastry`,
      ]),
    });
  } catch (e) {
    console.error('[notify/welcome]', e);
  }
}
