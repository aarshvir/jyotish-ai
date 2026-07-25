import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { db, logRun, ROOT } from '../db/index';
import { isKilled, killInfo } from '../safety/killswitch';
import { writeHeartbeat } from '../scheduler/heartbeat';

/** Read the web app's .env.local (we never copy secrets into this project). */
function appEnv(): Record<string, string> {
  const f = resolve(ROOT, '..', '.env.local');
  const out: Record<string, string> = {};
  if (!existsSync(f)) return out;
  for (const line of readFileSync(f, 'utf8').split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (!m || line.trim().startsWith('#')) continue;
    let v = m[2];
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    out[m[1]] = v;
  }
  return out;
}

async function fetchRows(base: string, key: string, path: string): Promise<any[]> {
  const res = await fetch(`${base}/rest/v1/${path}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${(await res.text()).slice(0, 120)}`);
  return (await res.json()) as any[];
}

/**
 * L8 (consent half) — mirror existing Supabase signups into consent_log so every
 * future lifecycle message is backed by a consent row. This ONLY builds the ledger;
 * it sends nothing. Email/WhatsApp sending stays off until Brevo/Resend + WhatsApp
 * Cloud/Twilio are configured.
 */
export async function runConsentSync(): Promise<void> {
  const loop = 'consent-sync';
  if (isKilled()) {
    console.log(`[consent] KILL-SWITCH engaged (${killInfo()?.reason}) — skipping.`);
    logRun({ loop, status: 'killed', detail: killInfo()?.reason ?? 'kill-switch' });
    return;
  }
  logRun({ loop, status: 'started' });

  const env = appEnv();
  const base = (env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, '');
  const key = env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!base || !key) {
    const msg = 'missing SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in ../.env.local';
    console.error(`[consent] ${msg}`);
    logRun({ loop, status: 'error', detail: msg });
    return;
  }

  const upsert = db().prepare(
    `INSERT INTO consent_log (contact, channel, opted_in_at, source, suppressed)
     VALUES (@contact, 'email', @at, @src, 0)
     ON CONFLICT(contact, channel) DO UPDATE SET source = COALESCE(consent_log.source, excluded.source)`,
  );

  const feeds: { table: string; path: string; emailCol: string; src: (r: any) => string }[] = [
    { table: 'newsletter_subscribers', path: 'newsletter_subscribers?select=email,source,created_at&limit=5000', emailCol: 'email', src: (r) => r.source || 'newsletter' },
    { table: 'reports', path: 'reports?select=user_email,created_at&limit=5000', emailCol: 'user_email', src: () => 'report' },
  ];

  try {
    const before = (db().prepare(`SELECT COUNT(*) n FROM consent_log WHERE channel='email'`).get() as { n: number }).n;
    let seen = 0;
    for (const f of feeds) {
      let rows: any[] = [];
      try {
        rows = await fetchRows(base, key, f.path);
      } catch (e: any) {
        console.warn(`[consent] skipped ${f.table}: ${e.message}`);
        continue;
      }
      const tx = db().transaction((rs: any[]) => {
        for (const r of rs) {
          const contact = String(r[f.emailCol] ?? '').trim().toLowerCase();
          if (!contact.includes('@')) continue;
          seen++;
          upsert.run({ contact, at: r.created_at ?? null, src: f.src(r) });
        }
      });
      tx(rows);
      console.log(`[consent] ${f.table}: ${rows.length} rows`);
    }
    const after = (db().prepare(`SELECT COUNT(*) n FROM consent_log WHERE channel='email'`).get() as { n: number }).n;
    console.log(`[consent] synced ${seen} signup rows → consent_log: +${after - before} new, ${after} email contacts total.`);
    console.log('[consent] Sending is OFF (no Brevo/Resend, no WhatsApp/Twilio). This loop builds the consent ledger only.');
    logRun({ loop, status: 'ok', detail: `+${after - before} new, ${after} total email consents` });
    writeHeartbeat(loop, `${after} email consents`);
  } catch (e: any) {
    const msg = String(e?.message ?? e);
    console.error(`[consent] failed: ${msg}`);
    logRun({ loop, status: 'error', detail: msg.slice(0, 200) });
    writeHeartbeat(loop, `error: ${msg.slice(0, 80)}`);
  }
}
