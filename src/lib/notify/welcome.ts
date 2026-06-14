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
      <p style="margin:0 0 18px;font-size:16px;line-height:1.6;color:#2a2730">You've joined VedicHour &mdash; Vedic astrology decoded hour by hour, computed with Swiss Ephemeris precision and explained in plain English.</p>
      <p style="margin:0 0 10px;font-size:15px;font-weight:700;color:#15131f">Three ways to start:</p>
      <p style="margin:0 0 22px;font-size:15px;line-height:1.8;color:#2a2730">
        &bull; <a href="${SITE}/free-kundli" style="color:#9a7b1a">Generate your free Kundli</a> &mdash; your full birth chart in a minute<br>
        &bull; <a href="${SITE}/onboard" style="color:#9a7b1a">Get your hour-by-hour forecast</a> &mdash; the best windows of your day<br>
        &bull; <a href="${SITE}/synastry" style="color:#9a7b1a">Check compatibility</a> &mdash; 36-point Gun Milan
      </p>
      ${emailButton('Start my free reading', `${SITE}/onboard`)}`;
    await sendEmail({
      to: email,
      subject: `Welcome to VedicHour, ${name}`,
      html: emailShell({ preheader: 'Start with your free Kundli and hour-by-hour forecast.', contentHtml: content }),
      text: plainText([
        `Welcome to VedicHour, ${name}.`,
        '',
        'Vedic astrology decoded hour by hour, with Swiss Ephemeris precision.',
        '',
        `Free Kundli: ${SITE}/free-kundli`,
        `Hour-by-hour forecast: ${SITE}/onboard`,
        `Compatibility (Gun Milan): ${SITE}/synastry`,
      ]),
    });
  } catch (e) {
    console.error('[notify/welcome]', e);
  }
}
