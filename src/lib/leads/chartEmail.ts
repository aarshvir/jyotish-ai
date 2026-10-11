import { emailButton, emailShell, plainText } from '@/lib/notify/emailLayout';
import { PRIVACY_CONTACT } from './consentText';

/**
 * The "your chart link" email — the one message a person asked for when they gave their
 * address. It is a service message: it says why it was sent, carries a one-click
 * unsubscribe, and promises nothing it cannot do. (No weekly cadence is promised here; the
 * nurture sequences are not built.)
 */

export interface ChartEmailInput {
  lang: 'en' | 'hi';
  firstName: string | null;
  resumeUrl: string;
  unsubscribeUrl: string;
  /** They ticked the optional box for occasional emails about their chart and new tools. */
  marketingConsented: boolean;
  /** When the link stops working. */
  expiresOn: Date;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const day = (d: Date) => `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function renderChartEmail(i: ChartEmailInput): { subject: string; html: string; text: string } {
  const hi = i.lang === 'hi';
  const first = (i.firstName ?? '').trim();
  const until = day(i.expiresOn);

  const subject = hi ? 'Aapke chart ka link' : 'Your chart link';
  const preheader = hi ? 'Seedha aapke result par khulta hai.' : 'Opens straight to your result.';
  const greeting = first ? (hi ? `${first},` : `Hi ${first},`) : '';

  const ask = hi ? 'Aapne chart save karne ko kaha tha.' : 'You asked us to save your chart.';
  const body = hi
    ? `Aapke jawab pehle se andar hain, isliye link seedha aapke result par khulta hai. Link ${until} tak chalega.`
    : `Your answers are already in it, so the link opens straight to your result. It works until ${until}.`;
  const extra = i.marketingConsented
    ? hi
      ? 'Aapne chart aur naye tools ke emails wala box bhi tick kiya tha, isliye hum kabhi-kabhi aapko likh sakte hain. Ek tap mein band kar sakte hain.'
      : 'You also ticked the box for occasional emails about your chart and new tools, so we may write to you now and then. You can stop them in one tap.'
    : hi
      ? 'Aapne aur emails nahi maange, isliye hum yeh ek email hi bhejenge.'
      : 'That is the only email we will send unless you ask for more.';
  const button = hi ? 'Mera chart kholein' : 'Open my chart';

  const reason = i.marketingConsented
    ? hi
      ? 'Aapko yeh isliye mila kyunki aapne VedicHour se apna chart save karne ko kaha aur kabhi-kabhi ke emails wala box tick kiya.'
      : 'You are getting this because you asked VedicHour to save your chart and ticked the box for occasional emails.'
    : hi
      ? 'Aapko yeh isliye mila kyunki aapne VedicHour se apna chart save karne ko kaha.'
      : 'You are getting this because you asked VedicHour to save your chart.';
  const stop = hi ? 'Emails band karein' : 'Stop emails';
  const del = hi ? `Apna data delete karwane ke liye likhein: ${PRIVACY_CONTACT}` : `To delete your data, write to ${PRIVACY_CONTACT}`;

  const content = `
      ${greeting ? `<p style="margin:0 0 14px;font-size:16px;line-height:1.6;color:#2a2730">${esc(greeting)}</p>` : ''}
      <p style="margin:0 0 14px;font-size:16px;line-height:1.6;color:#2a2730">${esc(ask)}</p>
      ${emailButton(esc(button), i.resumeUrl)}
      <p style="margin:14px 0 14px;font-size:15px;line-height:1.6;color:#2a2730">${esc(body)}</p>
      <p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:#2a2730">${esc(extra)}</p>
      <p style="margin:0;font-size:15px;color:#2a2730">VedicHour</p>`;

  const html = emailShell({
    preheader,
    contentHtml: content,
    reasonHtml: `${esc(reason)}<br><a href="${i.unsubscribeUrl}" style="color:#a8a4b2">${esc(stop)}</a> &middot; ${esc(del)}`,
  });

  const lines: string[] = [];
  if (greeting) lines.push(greeting, '');
  lines.push(ask, '', `${button}: ${i.resumeUrl}`, '', body, extra, '', reason, `${stop}: ${i.unsubscribeUrl}`, del);
  const text = plainText(lines);

  return { subject, html, text };
}
