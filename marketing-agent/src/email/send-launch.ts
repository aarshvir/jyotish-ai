import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { db, logRun, ROOT } from '../db/index';
import { isKilled, killInfo } from '../safety/killswitch';

/**
 * VedicHour launch-email sender — sends to ALL users / all email IDs across every source.
 *   npm run email:launch                          # DRY RUN (counts only, no send)
 *   npm run email:launch -- --test you@mail.com   # one test
 *   npm run email:launch -- --send                # send to everyone NOT already sent
 *   ... --exclude a@x.com,b@y.com                 # extra excludes (plus the hard list below)
 *
 * Sources: auth.users (admin API) + user_profiles + reports + newsletter_subscribers + user_consent.
 * Already-sent emails are tracked in output/email/sent.json so re-runs never double-send.
 * Needs RESEND_API_KEY, EMAIL_FROM, BUSINESS_ADDRESS + Supabase creds in ../.env.local or marketing-agent/.env.
 */

const SUBJECT = "Your day isn't one mood. It's 18.";
const EMAIL_DIR = resolve(ROOT, 'output', 'email');
const SENT_FILE = resolve(EMAIL_DIR, 'sent.json');
const HARD_EXCLUDE = ['aarshvir@gmail.com', 'pulkit.rocker@gmail.com'];

function env(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const f of [resolve(ROOT, '..', '.env.local'), resolve(ROOT, '.env')]) {
    if (!existsSync(f)) continue;
    for (const line of readFileSync(f, 'utf8').split(/\r?\n/)) {
      if (line.trim().startsWith('#')) continue;
      const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
      if (!m) continue;
      let v = m[2];
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      if (out[m[1]] === undefined) out[m[1]] = v;
    }
  }
  return out;
}

async function supaRows(base: string, key: string, path: string): Promise<any[]> {
  const r = await fetch(`${base}/rest/v1/${path}`, { headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/json' } });
  if (!r.ok) throw new Error(`${path.split('?')[0]} HTTP ${r.status}`);
  return (await r.json()) as any[];
}

async function authUsers(base: string, key: string): Promise<{ email: string; name: string }[]> {
  const out: { email: string; name: string }[] = [];
  for (let page = 1; page <= 100; page++) {
    const r = await fetch(`${base}/auth/v1/admin/users?page=${page}&per_page=200`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
    if (!r.ok) break;
    const j: any = await r.json();
    const users = j.users ?? (Array.isArray(j) ? j : []);
    for (const u of users) {
      const em = String(u.email ?? '').trim().toLowerCase();
      if (em.includes('@')) out.push({ email: em, name: u.user_metadata?.full_name ?? u.user_metadata?.name ?? '' });
    }
    if (users.length < 200) break;
  }
  return out;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const firstName = (name: string | null | undefined): string => {
  const n = (name ?? '').trim().split(/\s+/)[0];
  return n && /^[A-Za-z][A-Za-z'-]+$/.test(n) ? n.charAt(0).toUpperCase() + n.slice(1) : 'there';
};

function loadSent(): Set<string> {
  try {
    const a = JSON.parse(readFileSync(SENT_FILE, 'utf8'));
    return new Set((Array.isArray(a) ? a : [a]).filter(Boolean).map((x: string) => String(x).toLowerCase()));
  } catch {
    return new Set();
  }
}
function saveSent(s: Set<string>): void {
  writeFileSync(SENT_FILE, JSON.stringify([...s]));
}

async function pullAll(base: string, key: string): Promise<{ email: string; name: string }[]> {
  const map = new Map<string, string>();
  const add = (em: string, nm: string) => {
    const e = String(em ?? '').trim().toLowerCase();
    if (e.includes('@') && !map.has(e)) map.set(e, nm ?? '');
  };
  try {
    for (const u of await authUsers(base, key)) add(u.email, u.name);
  } catch {
    /* auth admin may be restricted */
  }
  const feeds: [string, string, string | null][] = [
    ['reports?select=user_email,native_name&limit=100000', 'user_email', 'native_name'],
    ['user_profiles?select=email,display_name&limit=100000', 'email', 'display_name'],
    ['newsletter_subscribers?select=email&limit=100000', 'email', null],
    ['user_consent?select=user_email&limit=100000', 'user_email', null],
  ];
  for (const [path, ecol, ncol] of feeds) {
    try {
      for (const row of await supaRows(base, key, path)) add(row[ecol], ncol ? row[ncol] : '');
    } catch {
      /* table may not exist */
    }
  }
  return [...map].map(([email, name]) => ({ email, name }));
}

async function sendResend(key: string, from: string, to: string, html: string, text: string, unsub: string): Promise<{ ok: boolean; detail: string }> {
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to, subject: SUBJECT, html, text, headers: { 'List-Unsubscribe': `<${unsub}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' } }),
  });
  const body = await r.text();
  return { ok: r.ok, detail: r.ok ? 'sent' : `HTTP ${r.status} ${body.slice(0, 140)}` };
}

export async function sendLaunch(argv: string[]): Promise<void> {
  const loop = 'email-launch';
  const testIdx = argv.findIndex((a) => a === '--test');
  const test = testIdx >= 0 ? argv[testIdx + 1] : undefined;
  const doSend = argv.includes('--send');
  const exArg = argv.includes('--exclude') ? (argv[argv.indexOf('--exclude') + 1] ?? '') : '';
  const e = env();

  if (!existsSync(resolve(EMAIL_DIR, 'launch-email.html')) || !existsSync(resolve(EMAIL_DIR, 'launch-email.txt'))) throw new Error('launch-email.html/.txt missing');
  const htmlTpl = readFileSync(resolve(EMAIL_DIR, 'launch-email.html'), 'utf8');
  const textTpl = readFileSync(resolve(EMAIL_DIR, 'launch-email.txt'), 'utf8');
  const RESEND = e.RESEND_API_KEY, FROM = e.EMAIL_FROM, ADDR = e.BUSINESS_ADDRESS;
  const UNSUB_BASE = e.UNSUBSCRIBE_BASE || 'mailto:unsubscribe@vedichour.com?subject=unsubscribe';

  const excludes = new Set([...HARD_EXCLUDE, ...exArg.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)]);
  for (const row of db().prepare(`SELECT contact FROM consent_log WHERE suppressed=1`).all() as { contact: string }[]) excludes.add(row.contact.toLowerCase());
  const sent = loadSent();

  if (argv.includes('--seed-narrow')) {
    const base = (e.SUPABASE_URL || e.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, '');
    const key = e.SUPABASE_SERVICE_ROLE_KEY || '';
    for (const path of ['reports?select=user_email&limit=100000', 'newsletter_subscribers?select=email&limit=100000']) {
      try {
        for (const row of await supaRows(base, key, path)) {
          const em = String(row.user_email ?? row.email ?? '').trim().toLowerCase();
          if (em.includes('@') && !HARD_EXCLUDE.includes(em)) sent.add(em);
        }
      } catch {
        /* skip */
      }
    }
    saveSent(sent);
    console.log(`[email] seeded sent.json: ${sent.size} already-sent (reports+newsletter = the original send).`);
    return;
  }

  let recipients: { email: string; name: string }[] = [];
  if (test) {
    recipients = [{ email: test, name: 'there' }];
  } else {
    const base = (e.SUPABASE_URL || e.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, '');
    const key = e.SUPABASE_SERVICE_ROLE_KEY || '';
    if (!base || !key) throw new Error('missing Supabase URL/service key');
    const all = await pullAll(base, key);
    const alreadySent = all.filter((r) => sent.has(r.email)).length;
    recipients = all.filter((r) => !excludes.has(r.email) && !sent.has(r.email));
    console.log(`[email] all sources: ${all.length} unique emails | excluded ${excludes.size} | already-sent ${alreadySent} | TO SEND ${recipients.length}`);
  }

  console.log(`[email] mode: ${test ? `TEST -> ${test}` : doSend ? 'FULL SEND' : 'DRY RUN'}`);
  if (!test && !doSend) {
    console.log('[email] DRY RUN — no emails sent. Add --send to fire.');
    logRun({ loop, status: 'ok', detail: `dry-run, ${recipients.length} to send` });
    return;
  }
  if (isKilled()) {
    console.log(`[email] KILL-SWITCH engaged (${killInfo()?.reason}) — refusing to send.`);
    return;
  }
  const missing = [!RESEND && 'RESEND_API_KEY', !FROM && 'EMAIL_FROM', !ADDR && 'BUSINESS_ADDRESS'].filter(Boolean);
  if (missing.length) throw new Error(`cannot send — missing ${missing.join(', ')}`);

  let ok = 0, failed = 0;
  logRun({ loop, status: 'started', detail: `${recipients.length} recipients` });
  for (const rcpt of recipients) {
    const unsub = UNSUB_BASE.includes('mailto:') ? UNSUB_BASE : `${UNSUB_BASE}${UNSUB_BASE.includes('?') ? '&' : '?'}email=${encodeURIComponent(rcpt.email)}`;
    const fill = (t: string) => t.replace(/\{\{first_name\}\}/g, firstName(rcpt.name)).replace(/\{\{unsubscribe_url\}\}/g, unsub).replace(/\{\{business_address\}\}/g, ADDR!);
    try {
      const res = await sendResend(RESEND!, FROM!, rcpt.email, fill(htmlTpl), fill(textTpl), unsub);
      if (res.ok) {
        ok++;
        if (!test) {
          sent.add(rcpt.email);
          saveSent(sent);
        }
      } else {
        failed++;
        console.error(`[email] FAIL ${rcpt.email}: ${res.detail}`);
      }
    } catch (err: any) {
      failed++;
      console.error(`[email] ERROR ${rcpt.email}: ${String(err?.message ?? err).slice(0, 120)}`);
    }
    await sleep(650);
  }
  console.log(`[email] done — sent ${ok}, failed ${failed}.`);
  logRun({ loop, status: 'ok', detail: `sent ${ok}, failed ${failed}` });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  sendLaunch(process.argv.slice(2)).catch((e) => {
    console.error(String(e?.stack ?? e));
    process.exit(1);
  });
}
