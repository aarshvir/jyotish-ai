import { writeFileSync, existsSync, mkdirSync, readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { brain } from '../brain/index';
import { lint } from '../policy/linter';
import { isKilled, killInfo } from '../safety/killswitch';
import { db, logRun, enqueueApproval, ROOT } from '../db/index';
import { writeHeartbeat } from '../scheduler/heartbeat';
import { BRAND_BRIEF } from '../brand';

const OUT = resolve(ROOT, 'output', 'outreach');

const PARTNERS = [
  { key: 'astrology-creators', audience: 'astrology content creators on Instagram and YouTube' },
  { key: 'wellness-coaches', audience: 'wellness and spiritual coaches' },
  { key: 'wedding-planners', audience: 'wedding planners and matchmakers' },
  { key: 'podcast-hosts', audience: 'spirituality podcast and YouTube hosts' },
  { key: 'newsletter-writers', audience: 'astrology and mindfulness newsletter writers' },
];

const QUESTIONS = [
  'How do I find an auspicious time (muhurat) for something important?',
  'What is my nakshatra and how do I find it?',
  'Is Manglik dosha really a big deal for marriage?',
  'What is the difference between Vedic and Western astrology?',
  'What is a dasha period and how does it affect me?',
  "I don't know my exact birth time — can I still get a useful reading?",
  'Are astrology apps accurate, or is it made up?',
  'How does Kundli matching / Gun Milan actually work?',
];

const emailPrompt = (p: { audience: string }) => `${BRAND_BRIEF}

Write a short, honest B2B partnership cold email from VedicHour to ${p.audience}.
Offer: a free Pro account, a custom audience discount code (pattern PARTNERNAME10), and a revenue share.
Human, specific, <=130 words. Use placeholders [First name] and [their work] for personalization. CAN-SPAM compliant: end with a one-line unsubscribe note and a [Physical address] placeholder. No hype, no claims.
Output STRICT JSON: {"subject":"...","body":"..."}`;

const qaPrompt = (q: string) => `${BRAND_BRIEF}

Write a genuinely helpful, value-first answer to this question for Reddit/Quora: "${q}"
Lead with real help; only the FINAL sentence may softly mention VedicHour, and only where it truly fits. Also give a "no_link" version with no brand mention at all (for communities that ban self-promotion). <=180 words each.
Output STRICT JSON: {"answer_with_mention":"...","answer_no_link":"..."}`;

function parseJsonBlock(raw: string): any | null {
  const m = raw.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    return JSON.parse(m[0]);
  } catch {
    return null;
  }
}

async function store(id: string, kind: string, payload: any, lintText: string) {
  const verdict = await lint(lintText);
  const entry = { id, kind, ...payload, linter: verdict.verdict, linter_reason: verdict.reason, status: verdict.verdict === 'pass' ? 'ready' : verdict.verdict === 'flag' ? 'needs_review' : 'blocked' };
  writeFileSync(resolve(OUT, `${id}.json`), JSON.stringify(entry, null, 2));
  db().prepare(`INSERT INTO content_library (asset, type, product, script_source, status, meta) VALUES (?,?,?,?,?,?)`)
    .run(resolve(OUT, `${id}.json`), 'outreach', kind, `outreach:${id}`, entry.status === 'ready' ? 'ready' : entry.status === 'blocked' ? 'archived' : 'flagged', JSON.stringify({ id, kind, status: entry.status }));
  if (verdict.verdict === 'flag') enqueueApproval({ item: `Outreach: ${id}`, lane: 'B', linter_verdict: 'flag', linter_reason: verdict.reason, channel: 'outreach' });
  return entry.status;
}

/** L7-prep + off-page — generate cold-email + Reddit/Quora value banks (draft only, no sending). */
export async function runOutreach(): Promise<void> {
  const loop = 'outreach';
  if (isKilled()) {
    console.log(`[outreach] KILL-SWITCH engaged (${killInfo()?.reason}) — skipping.`);
    logRun({ loop, status: 'killed', detail: killInfo()?.reason ?? 'kill-switch' });
    return;
  }
  logRun({ loop, status: 'started' });
  mkdirSync(OUT, { recursive: true });
  const done = new Set(readdirSync(OUT).filter((f) => f.endsWith('.json')).map((f) => f.replace(/\.json$/, '')));
  let made = 0;

  for (const p of PARTNERS) {
    const id = `email-${p.key}`;
    if (done.has(id)) continue;
    try {
      const res = await brain(emailPrompt(p), { tier: 'code', loop });
      const j = parseJsonBlock(res.text);
      if (!j) throw new Error('parse');
      const st = await store(id, 'cold-email', { audience: p.audience, subject: String(j.subject ?? '').trim(), body: String(j.body ?? '').trim() }, `${j.subject}\n${j.body}`);
      made++;
      console.log(`[outreach] ${id} → ${st}`);
    } catch (e: any) {
      console.error(`[outreach] ${id} failed: ${String(e?.message ?? e).slice(0, 120)}`);
    }
  }

  for (let i = 0; i < QUESTIONS.length; i++) {
    const id = `qa-${i + 1}`;
    if (done.has(id)) continue;
    try {
      const res = await brain(qaPrompt(QUESTIONS[i]), { tier: 'code', loop });
      const j = parseJsonBlock(res.text);
      if (!j) throw new Error('parse');
      const st = await store(id, 'reddit-quora', { question: QUESTIONS[i], answer_with_mention: String(j.answer_with_mention ?? '').trim(), answer_no_link: String(j.answer_no_link ?? '').trim() }, `${j.answer_with_mention}`);
      made++;
      console.log(`[outreach] ${id} → ${st}`);
    } catch (e: any) {
      console.error(`[outreach] ${id} failed: ${String(e?.message ?? e).slice(0, 120)}`);
    }
  }

  console.log(`[outreach] ${PARTNERS.length} emails + ${QUESTIONS.length} Q&As (${made} new) → output/outreach/. Draft only — no sending.`);
  logRun({ loop, status: 'ok', detail: `${made} new` });
  writeHeartbeat(loop, `${made} outreach drafts`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runOutreach().catch((e) => {
    console.error(e?.stack ?? e);
    process.exit(1);
  });
}
