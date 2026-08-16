/**
 * Shared premium email shell. Fixes the encoding garble (declares UTF-8 + uses
 * HTML entities for special characters, no raw emoji), works across clients
 * (table-based, inline styles), and keeps a clean, transactional look so emails
 * are more likely to land in Primary rather than Promotions.
 */

const BRAND = '#d4af37';
const INK = '#1f1c26';
const MUTED = '#6b6776';

export interface EmailDoc {
  /** Hidden preview text shown in the inbox list. */
  preheader: string;
  /** Inner content HTML (already entity-safe). */
  contentHtml: string;
}

export function emailButton(label: string, href: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 4px"><tr><td style="border-radius:9px;background:${BRAND}">
    <a href="${href}" style="display:inline-block;padding:13px 26px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;color:#1a1407;text-decoration:none;border-radius:9px">${label} &rarr;</a>
  </td></tr></table>`;
}

export function emailShell({ preheader, contentHtml }: EmailDoc): string {
  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light only">
</head>
<body style="margin:0;padding:0;background:#f5f3ee;-webkit-text-size-adjust:100%">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#f5f3ee;font-size:1px;line-height:1px">${preheader}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f3ee;padding:28px 12px">
  <tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border:1px solid #ece8df;border-radius:14px;overflow:hidden">
      <tr><td style="background:#0a0a1a;padding:18px 28px">
        <span style="font-family:Georgia,'Times New Roman',serif;font-size:19px;font-weight:700;color:${BRAND};letter-spacing:1px">VedicHour</span>
      </td></tr>
      <tr><td style="padding:30px 28px;font-family:Arial,Helvetica,sans-serif;color:${INK};font-size:16px;line-height:1.6">
        ${contentHtml}
      </td></tr>
      <tr><td style="padding:0 28px 26px;font-family:Arial,Helvetica,sans-serif">
        <hr style="border:none;border-top:1px solid #ece8df;margin:0 0 16px">
        <p style="margin:0;font-size:12px;line-height:1.6;color:${MUTED}">
          VedicHour &bull; Hour-by-hour Vedic timing, in plain English.<br>
          For reflection and guidance, not guaranteed outcomes.<br>
          Questions? Just reply to this email &bull; <a href="https://www.vedichour.com" style="color:${MUTED}">vedichour.com</a>
        </p>
      </td></tr>
    </table>
    <p style="max-width:480px;margin:14px auto 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#a8a4b2;text-align:center">
      You're receiving this because you have a VedicHour account.
    </p>
  </td></tr>
</table>
</body></html>`;
}

/** Build a clean plain-text alternative (improves deliverability + Primary placement). */
export function plainText(lines: string[]): string {
  return lines.join('\n').trim() + '\n\n— VedicHour · vedichour.com';
}
