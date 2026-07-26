import { BANNED_CAPTURE, jargonHits } from './policy';
import type { Finding, LensReport } from './types';
import type { ReelArtifacts } from './artifacts';

/**
 * The deterministic backstop that runs alongside the nine LLM passes.
 *
 * Reviewers are persuadable; regexes are not. Every owner hard rule that can be proven from
 * the rendered artifacts is asserted here, so the gate still catches them when a model is
 * having a generous day — or when the CLIs are down entirely.
 */
export function hardRules(a: ReelArtifacts): LensReport {
  const f: Finding[] = [];
  const add = (x: Omit<Finding, 'lens' | 'stage'>) => f.push({ ...x, lens: 'hard-rules', stage: 'deterministic' });

  // 1. Mid-reel voice / timbre switch (owner hard rule).
  const nativeVoice = /native voice/i.test(a.audioReport);
  const narrated = (a.creative?.shots ?? []).filter((s: any) => typeof s?.vo === 'string' && s.vo.trim());
  const presenterSpeaks = (a.creative?.shots ?? []).some((s: any) => s?.dialogue);
  if ((nativeVoice || presenterSpeaks) && narrated.length) {
    const at = /s2 (\d+(?:\.\d+)?)-/.exec(a.shotBoundaries)?.[1] ?? '?';
    add({
      timestamp: `${at}s`,
      severity: 'blocker',
      issue: `VOICE SWITCH: the reel opens on the presenter's native in-shot voice and then hands over to a separate synthetic narrator (${narrated.length} narrated shot(s), voice "${a.creative?.voice ?? 'default edge-tts'}"). Two different voices in one reel.`,
      fix: 'Rewrite so the presenter speaks the lines on camera (Veo native audio) — CLAUDE.md §2: eliminating narration is cheaper AND better than buying better TTS.',
    });
  }
  if (/neerja|edge-?tts/i.test(String(a.creative?.voice ?? '')) && narrated.length) {
    add({
      timestamp: 'n/a',
      severity: 'blocker',
      issue: `SYNTHETIC NARRATOR: narration voice "${a.creative?.voice}" is an edge-tts neural voice — banned in ads.`,
      fix: 'Presenter dialogue on camera, or an approved Sarvam Bulbul v3 male voice.',
    });
  }

  // 2. Payment surface in a product shot (owner hard rule).
  const surfaces: { where: string; text: string }[] = [
    ...(a.publish?.shots ?? []).map((s: any) => ({ where: `rendered shot ${s.id}`, text: String(s.label ?? '') })),
    ...(a.creative?.shots ?? []).map((s: any, i: number) => ({ where: `creative shots[${i}].capture.url`, text: String(s?.capture?.url ?? '') })),
  ];
  for (const s of surfaces) {
    if (!s.text) continue;
    if (BANNED_CAPTURE.test(s.text) || /\bpricing\b|\bcheckout\b|\bpayment\b/i.test(s.text)) {
      const rendered = s.where.startsWith('rendered');
      add({
        timestamp: 'n/a',
        severity: rendered ? 'blocker' : 'major',
        issue: `PAYMENT SURFACE in a product shot — ${s.where}: "${s.text}". Scrolls must show the REPORT, never a pricing/checkout page.`,
        fix: 'Re-capture against the report (hour slots + what-to-do-when).',
      });
    }
  }

  // 3. Jargon in the publish copy (on-screen jargon is the vision lenses' job).
  const copy: [string, string][] = [
    ['caption', String(a.publish?.caption ?? '')],
    ['youtubeTitle', String(a.publish?.youtubeTitle ?? '')],
    ['description', String(a.publish?.description ?? '')],
    ['hashtags', (a.publish?.hashtags ?? []).join(' ')],
  ];
  for (const [where, text] of copy) {
    for (const h of jargonHits(text)) {
      add({
        timestamp: 'n/a',
        severity: 'major',
        issue: `JARGON "${h.term}" in publish ${where}.`,
        fix: `Rewrite in plain English; delete "${h.term}".`,
      });
    }
  }

  // 4. Loudness — the platforms normalise to about -14..-16 LUFS; drifting is audible.
  const lufs = Number(/"input_i"\s*:\s*"(-?[\d.]+)"/.exec(a.audioReport)?.[1]);
  if (Number.isFinite(lufs) && Math.abs(lufs + 16) > 1.5) {
    add({
      timestamp: 'n/a',
      severity: 'major',
      issue: `Mix measures ${lufs} LUFS integrated, ${Math.abs(lufs + 16).toFixed(1)} dB off the -16 LUFS target.`,
      fix: 'Re-run the two-pass loudnorm in finish() — $0 re-assembly.',
    });
  }

  // 5. Dead air.
  for (const m of a.audioReport.matchAll(/silence_start:\s*([\d.]+)[\s\S]{0,120}?silence_duration:\s*([\d.]+)/g)) {
    const start = Number(m[1]);
    const dur = Number(m[2]);
    if (dur >= 1.0 && start + dur < a.durationSec - 0.5) {
      add({
        timestamp: `${start.toFixed(1)}-${(start + dur).toFixed(1)}s`,
        severity: 'minor',
        issue: `${dur.toFixed(2)}s of dead air mid-reel — short-form viewers drop on silence.`,
        fix: 'Tighten the shot transition or duck a licensed music bed under the gap (media/music/).',
      });
    }
  }

  // 6. Narration that does not fit its shot.
  for (const m of a.audioReport.matchAll(/(\w+) VO ([\d.]+)s in an? ([\d.]+)s shot -> tail margin (-?[\d.]+)s/g)) {
    if (Number(m[4]) < 0) {
      add({
        timestamp: 'n/a',
        severity: 'blocker',
        issue: `Shot ${m[1]}: ${m[2]}s of narration in a ${m[3]}s shot — the line is cut mid-sentence.`,
        fix: `Extend ${m[1]} to at least ${(Number(m[2]) + 0.3).toFixed(1)}s or cut words from the line.`,
      });
    }
  }

  // 7. Length + the render pipeline's own verification problems.
  if (a.durationSec > 45) {
    add({ timestamp: 'n/a', severity: 'minor', issue: `${a.durationSec}s is long for short-form (ranks best under ~45s).`, fix: 'Trim a beat.' });
  }
  for (const p of a.publish?.verification?.problems ?? []) {
    add({ timestamp: 'n/a', severity: 'major', issue: `render verification: ${p}`, fix: 'Re-render or re-encode to spec.' });
  }

  const blocker = f.some((x) => x.severity === 'blocker');
  return {
    lens: 'hard-rules (deterministic)',
    stage: 'deterministic',
    source: 'regex',
    verdict: blocker ? 'block' : f.length ? 'ship_with_notes' : 'ship',
    findings: f,
    oneLiner: blocker
      ? `${f.filter((x) => x.severity === 'blocker').length} owner hard-rule violation(s) proven from the artifacts.`
      : f.length ? `${f.length} measurable defect(s), none blocking.` : 'All deterministic checks clean.',
    ok: true,
    costUsd: 0,
    durationMs: 0,
  };
}
