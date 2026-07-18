export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/admin';
import { verifyUnsubToken, addSuppression } from '@/lib/notify/suppression';

/**
 * Email unsubscribe endpoint.
 *   - POST (RFC 8058 one-click, sent by Gmail/Yahoo/Apple when List-Unsubscribe-Post
 *     is present): verify token → suppress → 200. No body/redirect.
 *   - GET (a human clicking the link): verify token → confirmation form. No mutation.
 * The token is HMAC-signed over the email, so no auth is needed and it can't be forged.
 */

async function suppress(token: string): Promise<boolean> {
  const email = verifyUnsubToken(token);
  if (!email) return false;
  const db = createServiceClient();
  return addSuppression(db, email, 'unsubscribe-link');
}

async function postToken(req: NextRequest): Promise<string> {
  const queryToken = req.nextUrl.searchParams.get('t');
  if (queryToken) return queryToken;
  try {
    const value = (await req.formData()).get('t');
    return typeof value === 'string' ? value : '';
  } catch {
    return '';
  }
}

function escapeHtmlAttribute(value: string): string {
  return value.replace(/[&<>"']/g, (character) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]!
  ));
}

export async function POST(req: NextRequest) {
  const token = await postToken(req);
  const ok = await suppress(token);
  return NextResponse.json({ ok }, { status: ok ? 200 : 400 });
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('t') ?? '';
  const valid = verifyUnsubToken(token) !== null;
  const body = valid
    ? { title: 'Confirm unsubscribe', msg: 'Confirm that you no longer want to receive marketing emails from VedicHour. Your account and any reports will be untouched.' }
    : { title: 'Link expired', msg: 'This unsubscribe link is invalid or expired. Email support@vedichour.com and we&rsquo;ll remove you right away.' };
  const action = valid
    ? `<form method="post" action="/api/unsubscribe"><input type="hidden" name="t" value="${escapeHtmlAttribute(token)}"><button type="submit">Unsubscribe</button></form>`
    : '<a href="https://www.vedichour.com">Back to VedicHour</a>';
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${body.title}</title>
<style>body{margin:0;background:#0a0a1a;color:#e8eaf0;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;display:flex;min-height:100vh;align-items:center;justify-content:center;padding:24px}
.card{max-width:440px;text-align:center;background:#0d1426;border:1px solid #1e2a4a;border-radius:16px;padding:40px 32px}
h1{font-family:Georgia,serif;color:#d4af37;font-size:24px;margin:0 0 12px}p{color:#8892a4;font-size:15px;line-height:1.6;margin:0 0 20px}
a,button{display:inline-block;color:#0a0a1a;background:#d4af37;text-decoration:none;font-weight:600;padding:11px 22px;border:0;border-radius:9px;font-size:14px;cursor:pointer}</style></head>
<body><div class="card"><h1>${body.title}</h1><p>${body.msg}</p>${action}</div></body></html>`;
  return new NextResponse(html, { status: valid ? 200 : 400, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}
