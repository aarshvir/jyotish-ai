import type { FixClass, Severity, Verdict } from './policy';

/** One defect, anchored to a moment in the reel. */
export interface Finding {
  /** "3.4s" or "9.3-24.5s". Free text — reviewers anchor however they can. */
  timestamp: string;
  severity: Severity;
  issue: string;
  fix: string;
  /** Assigned in synthesis, not by the reviewer. */
  fixClass?: FixClass;
  /** Which lens raised it (filled in by the runner). */
  lens?: string;
  /** internal | gpt | deterministic */
  stage?: string;
}

/** One reviewer's complete pass over the reel. */
export interface LensReport {
  lens: string;
  stage: 'internal' | 'gpt' | 'deterministic';
  /** cli/model that produced it, e.g. "codex" or "claude". */
  source: string;
  verdict: Verdict;
  findings: Finding[];
  oneLiner: string;
  /** false = the pass itself failed; its verdict must not count as a "ship". */
  ok: boolean;
  error?: string;
  costUsd: number;
  durationMs: number;
}

export interface ReviewBundle {
  slug: string;
  runId: string;
  createdAt: string;
  verdict: Verdict;
  reason: string;
  lenses: LensReport[];
  findings: Finding[];
  counts: Record<Severity, number>;
  costUsd: number;
  degraded: string[];
  fixQueue: Finding[];
  reviewPath: string;
}

const SEV = new Set(['blocker', 'major', 'minor', 'nit']);
const VERDICTS = new Set(['ship', 'ship_with_notes', 'block']);

/** Pull the first JSON object out of a CLI's chatty stdout. */
export function extractJson(raw: string): any | null {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidates = [fenced?.[1], raw].filter(Boolean) as string[];
  for (const c of candidates) {
    const start = c.indexOf('{');
    if (start < 0) continue;
    // Walk to the matching brace so trailing prose can't break the parse.
    let depth = 0;
    let inStr = false;
    let esc = false;
    for (let i = start; i < c.length; i++) {
      const ch = c[i];
      if (esc) { esc = false; continue; }
      if (ch === '\\') { esc = true; continue; }
      if (ch === '"') { inStr = !inStr; continue; }
      if (inStr) continue;
      if (ch === '{') depth++;
      else if (ch === '}' && --depth === 0) {
        try { return JSON.parse(c.slice(start, i + 1)); } catch { break; }
      }
    }
  }
  return null;
}

/** Coerce whatever a reviewer returned into a well-formed LensReport. Never throws. */
export function normalizeReport(
  raw: any,
  meta: { lens: string; stage: LensReport['stage']; source: string; durationMs: number; costUsd?: number },
): LensReport {
  const verdict = VERDICTS.has(String(raw?.verdict)) ? (raw.verdict as Verdict) : 'ship_with_notes';
  const findings: Finding[] = Array.isArray(raw?.findings)
    ? raw.findings.slice(0, 25).map((f: any) => ({
        timestamp: String(f?.timestamp ?? 'n/a').slice(0, 40),
        severity: (SEV.has(String(f?.severity)) ? f.severity : 'minor') as Severity,
        issue: String(f?.issue ?? '').slice(0, 400).trim(),
        fix: String(f?.fix ?? '').slice(0, 400).trim(),
        lens: meta.lens,
        stage: meta.stage,
      })).filter((f: Finding) => f.issue)
    : [];
  return {
    lens: meta.lens,
    stage: meta.stage,
    source: meta.source,
    verdict,
    findings,
    oneLiner: String(raw?.oneLiner ?? '').slice(0, 240).trim() || '(no summary returned)',
    ok: true,
    costUsd: meta.costUsd ?? 0,
    durationMs: meta.durationMs,
  };
}

export function failedReport(
  meta: { lens: string; stage: LensReport['stage']; source: string; durationMs: number },
  error: string,
): LensReport {
  return {
    ...meta,
    verdict: 'ship_with_notes',
    findings: [],
    oneLiner: `PASS FAILED — ${error.slice(0, 160)}`,
    ok: false,
    error: error.slice(0, 400),
    costUsd: 0,
  };
}

/** The exact JSON contract every reviewer must return. Shared so all 9 lenses agree. */
export const JSON_CONTRACT = `Return STRICT JSON and nothing else — no prose before or after:
{"lens":"<your lens name>","verdict":"ship|ship_with_notes|block","findings":[{"timestamp":"<e.g. 12.4s or 9.3-11.0s>","severity":"blocker|major|minor|nit","issue":"<what is wrong, concretely>","fix":"<the specific change that fixes it>"}],"oneLiner":"<one sentence verdict, <=20 words>"}

Rules for findings:
- EVERY finding MUST carry a timestamp in seconds. "n/a" is only allowed for a whole-reel issue.
- severity "blocker" means DO NOT PUBLISH. Use it only for a real defect a viewer would notice or an owner hard-rule violation.
- Be specific. "Captions could be better" is useless; "caption band at 18.5s is narrower than the page text behind it, so page words leak at both edges" is useful.
- If the reel is clean on your lens, return "ship" with an empty findings array. Do not invent defects.`;
