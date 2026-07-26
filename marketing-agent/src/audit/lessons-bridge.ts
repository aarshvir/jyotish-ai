import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { db, ROOT } from '../db/index';

/**
 * LAW §4 — mistakes may not repeat. Every owner rejection and every high-severity review
 * finding becomes a lesson.
 *
 * src/lessons.ts is owned by a sibling agent and may land after this file. So: import it
 * dynamically, tolerate its absence, and NEVER lose a lesson — anything we cannot hand over
 * is appended to data/lessons-pending.jsonl for the lessons store to absorb later.
 */

export interface LessonInput {
  source: 'owner' | 'gpt_review' | 'internal_audit';
  severity: string;
  scope: string;
  rule: string;
  evidence: string;
}

/**
 * src/lessons.ts constrains severity to critical|high|medium|low and scope to
 * script|visual|voice|capture|caption. Our review vocabulary is different, so translate —
 * an off-contract row would insert but then never come back from activeLessons(scope).
 */
export function toLessonSeverity(sev: string): 'critical' | 'high' | 'medium' | 'low' {
  if (/blocker|critical/i.test(sev)) return 'critical';
  if (/major|high/i.test(sev)) return 'high';
  if (/minor|medium/i.test(sev)) return 'medium';
  return 'low';
}

export function toLessonScope(text: string): 'script' | 'visual' | 'voice' | 'capture' | 'caption' {
  const t = text.toLowerCase();
  if (/voice|narrat|timbre|tts|audio|loudness|lufs|silence/.test(t)) return 'voice';
  if (/caption|subtitle|band|typograph|font|legib/.test(t)) return 'caption';
  if (/captur|screencap|pricing|checkout|payment|url|page/.test(t)) return 'capture';
  if (/script|dialogue|word|line|jargon|copy|hook|cta/.test(t)) return 'script';
  return 'visual';
}

const PENDING = resolve(ROOT, 'data', 'lessons-pending.jsonl');

function spill(entry: LessonInput, why: string): void {
  try {
    mkdirSync(resolve(ROOT, 'data'), { recursive: true });
    appendFileSync(PENDING, `${JSON.stringify({ ...entry, _spilled_at: new Date().toISOString(), _why: why })}\n`);
  } catch {
    /* last resort: the console line below is the record */
  }
}

/** File a lesson. Resolves to how it was stored: 'store' | 'pending'. */
export async function addLessonSafe(entry: LessonInput): Promise<'store' | 'pending'> {
  for (const spec of ['../lessons', '../lessons.js', '../lessons.ts']) {
    try {
      const mod: any = await import(/* @vite-ignore */ spec);
      const fn = mod?.addLesson ?? mod?.default?.addLesson;
      if (typeof fn === 'function') {
        await fn(entry);
        return 'store';
      }
    } catch {
      /* not landed yet, or a different shape — try the next specifier */
    }
  }
  spill(entry, 'src/lessons.ts unavailable');
  return 'pending';
}

export interface ActiveLesson {
  id?: number | string;
  scope?: string;
  severity?: string;
  rule: string;
  evidence?: string;
  /** Optional explicit regex — when present the lesson is mechanically checkable as-is. */
  pattern?: string;
}

function fromDb(): ActiveLesson[] {
  try {
    const d = db();
    const t = d.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='lessons'`).get();
    if (!t) return [];
    const cols = (d.prepare(`PRAGMA table_info(lessons)`).all() as any[]).map((c) => String(c.name));
    const where = cols.includes('status') ? `WHERE status='active'` : cols.includes('active') ? `WHERE active=1` : '';
    return (d.prepare(`SELECT * FROM lessons ${where}`).all() as any[]).map((r) => ({
      id: r.id,
      scope: r.scope,
      severity: r.severity,
      rule: String(r.rule ?? r.lesson ?? ''),
      evidence: r.evidence,
      pattern: r.pattern ?? undefined,
    })).filter((l) => l.rule);
  } catch {
    return [];
  }
}

function fromPendingFile(): ActiveLesson[] {
  if (!existsSync(PENDING)) return [];
  try {
    return readFileSync(PENDING, 'utf8')
      .split(/\r?\n/)
      .filter(Boolean)
      .map((l) => { try { return JSON.parse(l); } catch { return null; } })
      .filter(Boolean)
      .map((r: any) => ({ scope: r.scope, severity: r.severity, rule: String(r.rule ?? ''), evidence: r.evidence }))
      .filter((l) => l.rule);
  } catch {
    return [];
  }
}

/**
 * Every active lesson, from whichever source exists: the sibling module first, then the
 * shared `lessons` table, then our own spill file. De-duplicated by rule text.
 */
export async function activeLessons(): Promise<ActiveLesson[]> {
  let out: ActiveLesson[] = [];
  for (const spec of ['../lessons', '../lessons.js', '../lessons.ts']) {
    try {
      const mod: any = await import(/* @vite-ignore */ spec);
      const fn = mod?.activeLessons ?? mod?.listLessons ?? mod?.getLessons ?? mod?.lessons;
      const rows = typeof fn === 'function' ? await fn() : Array.isArray(fn) ? fn : null;
      if (Array.isArray(rows)) {
        out = rows.map((r: any) => ({
          id: r.id, scope: r.scope, severity: r.severity,
          rule: String(r.rule ?? r.lesson ?? r.text ?? ''), evidence: r.evidence, pattern: r.pattern,
        })).filter((l) => l.rule);
        break;
      }
    } catch {
      /* fall through */
    }
  }
  const all = [...out, ...fromDb(), ...fromPendingFile()];
  const seen = new Set<string>();
  return all.filter((l) => {
    const k = l.rule.trim().toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/**
 * Turn a lesson into a forbidden-substring check, when it can be one.
 *
 * A lesson is mechanically checkable if it carries an explicit `pattern`, or if it forbids
 * something it names in quotes/backticks ("never say `Swiss Ephemeris`"). Anything else is
 * surfaced to the human/agent as a warning rather than guessed at — a wrong auto-block would
 * cost more trust than a missed one.
 */
export function lessonMatcher(l: ActiveLesson): { re: RegExp; label: string } | null {
  if (l.pattern) {
    try { return { re: new RegExp(l.pattern, 'i'), label: `pattern /${l.pattern}/` }; } catch { /* bad regex */ }
  }
  // A lesson that REQUIRES a phrase must never become a rule FORBIDDING it. The 2026-07-26 CTA
  // ruling ("every reel must end by saying VedicHour.com") was first filed with the mandated
  // phrase in quotes; harvested as a banned substring it would have blocked every creative that
  // obeyed the owner — the exact inversion of the lesson. A requirement is asserted by a
  // deterministic gate (SPOKEN_SITE in the two preflights), never by substring matching here.
  if (/\b(must|always|required|has to|have to)\b/i.test(l.rule)) return null;

  const negative = /\b(never|no|avoid|don'?t|do not|ban(ned)?|forbid(den)?|stop)\b/i.test(l.rule);
  if (!negative) return null;

  // Quoted text is a BANNED PHRASE only in a copy lesson. In any other scope the quotes are
  // evidence — a caption fragment, a UI string, a timestamp — and turning them into a forbidden
  // substring blocks the reel for saying the very words it is supposed to say.
  //
  // Real case, 2026-07-26: the review auto-filed 'Remove the caption overlap; end "SCORE, AUR EK"
  // before "LINE - KIS" appears' (scope: reel, a TIMING rule, already fixed in buildAss). The
  // next pre-flight blocked the creative because its script contains those words. A lesson about
  // when a caption leaves the screen must never become a rule about what the presenter may say.
  const copyScope = !l.scope || l.scope === 'script';
  let terms = copyScope ? [...l.rule.matchAll(/[`"“']([^`"”']{3,60})[`"”']/g)].map((m) => m[1].trim()) : [];

  // A copy lesson often names its forbidden terms in a plain list: "never Swiss Ephemeris,
  // Lahiri, ayanamsa or sidereal". Harvest those too — but only for script/copy lessons, where
  // a literal substring match is safe. Anything vaguer stays a warning for a human to read.
  if (!terms.length && l.scope === 'script') {
    const after = /\bnever\s+([^.;]+)/i.exec(l.rule)?.[1] ?? '';
    terms = after
      .split(/,| or | and /i)
      .map((t) => t.trim().replace(/[.)]$/, ''))
      .filter((t) => t.length >= 4 && t.length <= 40 && /^[\w' -]+$/.test(t));
  }
  if (!terms.length) return null;
  const alt = terms.map((q) => q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  return { re: new RegExp(`\\b(${alt})\\b`, 'i'), label: terms.map((q) => `"${q}"`).join(', ') };
}

/**
 * Scopes whose lessons are already asserted by a dedicated deterministic rule in
 * src/audit/preflight.ts. Re-warning about them just buries the real signal.
 */
export const SCOPES_ENFORCED_BY_RULE: Record<string, string> = {
  voice: 'voice-plan',
  capture: 'capture-target',
  script: 'jargon + brand-safety',
};
