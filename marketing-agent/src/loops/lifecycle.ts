import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { brain } from '../brain/index';
import { lint } from '../policy/linter';
import { isKilled, killInfo } from '../safety/killswitch';
import { db, logRun, enqueueApproval, ROOT } from '../db/index';
import { writeHeartbeat } from '../scheduler/heartbeat';
import { BRAND, BRAND_BRIEF, utm } from '../brand';

const LIFE = resolve(ROOT, 'output', 'lifecycle');

interface Step {
  id: string;
  channel: 'email' | 'whatsapp';
  trigger: string;
  intent: string;
  link: string;
}

const STEPS: Step[] = [
  { id: 'welcome', channel: 'email', trigger: 'on free-Kundli signup', intent: 'Warm welcome; what VedicHour is (a private, modern Vedic timing dashboard in plain English); invite them to pull their free Kundli.', link: BRAND.links.freeKundli },
  { id: 'value-read-your-chart', channel: 'email', trigger: 'day 2 after signup', intent: 'Teach: read your chart in this order (Lagna, Moon nakshatra, current dasha, 10th, 7th). Useful, no pressure.', link: BRAND.links.freeKundli },
  { id: 'value-your-day-is-18-horas', channel: 'email', trigger: 'day 4 after signup', intent: 'Explain the 18 planetary hours (horas) as clearer/heavier windows; soft invite to the hour-by-hour forecast.', link: BRAND.links.pricing },
  { id: 'cart-abandon', channel: 'email', trigger: 'started a report but did not complete checkout', intent: 'Gentle nudge to finish; reassure value; mention NEWUSER30 for 30% off the first paid report.', link: BRAND.links.onboard },
  { id: 'post-purchase-crosssell', channel: 'email', trigger: 'after a purchase', intent: 'Thank them; suggest the complementary product (Kundli buyer -> Matchmaking or Forecast) as a next step.', link: BRAND.links.synastry },
  { id: 'weekly-timing', channel: 'email', trigger: 'weekly broadcast to opted-in users', intent: 'A short "your timing this week" note framed as reflection/planning; one calm idea + invite to check their grid.', link: BRAND.links.freeKundli },
  { id: 'whatsapp-welcome', channel: 'whatsapp', trigger: 'on WhatsApp opt-in', intent: 'Short welcome suitable as an approved WhatsApp template; what to expect; how to get their free Kundli.', link: BRAND.links.freeKundli },
];

function prompt(s: Step): string {
  const fmt =
    s.channel === 'email'
      ? 'Give a subject line (<=55 chars) and a short body (<=140 words).'
      : 'Give a short WhatsApp message (<=60 words) suitable as an approved business template.';
  return `${BRAND_BRIEF}

Write a lifecycle ${s.channel} message for VedicHour.
Trigger: ${s.trigger}
Goal: ${s.intent}
${fmt} Calm, warm, plain-English. End the body with the tagline "${BRAND.taglineClose}" then on a new line the disclaimer: "${BRAND.disclaimer}". Do NOT include any URL (the link is attached separately).

Output STRICT JSON, nothing else:
{"subject":"...","body":"..."}`;
}

function parseJsonBlock(raw: string): any | null {
  const m = raw.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    return JSON.parse(m[0]);
  } catch {
    return null;
  }
}

/** L8 (content half) — generate the lifecycle email/WhatsApp sequence copy. Sends nothing. */
export async function runLifecycle(): Promise<void> {
  const loop = 'lifecycle';
  if (isKilled()) {
    console.log(`[lifecycle] KILL-SWITCH engaged (${killInfo()?.reason}) — skipping.`);
    logRun({ loop, status: 'killed', detail: killInfo()?.reason ?? 'kill-switch' });
    return;
  }
  logRun({ loop, status: 'started' });
  mkdirSync(LIFE, { recursive: true });
  const done = new Set(readdirSync(LIFE).filter((f) => f.endsWith('.json')).map((f) => f.replace(/\.json$/, '')));
  let made = 0;
  for (const s of STEPS) {
    if (done.has(s.id)) continue;
    try {
      const res = await brain(prompt(s), { tier: 'code', loop });
      const parsed = parseJsonBlock(res.text);
      if (!parsed) throw new Error('could not parse lifecycle JSON');
      const body = String(parsed.body ?? '').trim();
      const subject = String(parsed.subject ?? '').trim();
      const verdict = await lint(`${subject}\n${body}`);
      const entry = {
        id: s.id,
        channel: s.channel,
        trigger: s.trigger,
        subject: s.channel === 'email' ? subject : undefined,
        body,
        link: utm(s.link, 'crm', s.channel, 'lifecycle'),
        linter: verdict.verdict,
        linter_reason: verdict.reason,
        status: verdict.verdict === 'pass' ? 'ready' : verdict.verdict === 'flag' ? 'needs_review' : 'blocked',
      };
      writeFileSync(resolve(LIFE, `${s.id}.json`), JSON.stringify(entry, null, 2));
      db().prepare(`INSERT INTO content_library (asset, type, product, script_source, status, meta) VALUES (?,?,?,?,?,?)`)
        .run(resolve(LIFE, `${s.id}.json`), 'lifecycle', s.channel, `lifecycle:${s.id}`, entry.status === 'ready' ? 'ready' : entry.status === 'blocked' ? 'archived' : 'flagged', JSON.stringify({ id: s.id, channel: s.channel, status: entry.status }));
      if (verdict.verdict === 'flag') enqueueApproval({ item: `Lifecycle ${s.channel}: ${s.id}`, lane: 'B', linter_verdict: 'flag', linter_reason: verdict.reason, channel: s.channel });
      made++;
      console.log(`[lifecycle] ${s.id} (${s.channel}) → ${entry.status}`);
    } catch (e: any) {
      console.error(`[lifecycle] ${s.id} failed: ${String(e?.message ?? e).slice(0, 140)}`);
    }
  }
  console.log(`[lifecycle] ${STEPS.length} steps (${made} new) → output/lifecycle/. Sending stays OFF (no Brevo/Resend, no WhatsApp/Twilio).`);
  logRun({ loop, status: 'ok', detail: `${made} new steps` });
  writeHeartbeat(loop, `${STEPS.length} steps`);
}

// allow `tsx src/loops/lifecycle.ts` to run directly
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runLifecycle().catch((e) => {
    console.error(e?.stack ?? e);
    process.exit(1);
  });
}
