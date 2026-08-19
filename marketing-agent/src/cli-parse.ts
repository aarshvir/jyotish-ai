/**
 * Shared argv parser for the marketing CLI.
 *
 * Boolean flags must NOT consume the next token. Otherwise
 * `loop:render -- --estimate the-18-hours-presenter` treats the slug as the
 * value of `--estimate` and silently prices a different creative.
 */
export const BOOLEAN_FLAGS = new Set([
  'estimate',
  'dry',
  'keep',
  'resume',
  'skip-sense',
  'allow-paid',
]);

export function parse(rest: string[]): { flags: Record<string, string>; text: string; pos: string[] } {
  const flags: Record<string, string> = {};
  const pos: string[] = [];
  for (let i = 0; i < rest.length; i++) {
    const tok = rest[i];
    if (!tok.startsWith('--')) {
      pos.push(tok);
      continue;
    }
    // `--key=value` is the form every other CLI on earth accepts, and omitting it was a MONEY
    // TRAP: `--resume=true` parsed as a flag literally named "resume=true", so `opts.resume`
    // was undefined, resume silently stayed OFF, and a render re-bought $2.70 of clips that
    // were already on disk (2026-08-19). Silent misreads of spend-affecting flags are exactly
    // what CLAUDE.md §1 exists to prevent, so both forms are accepted and an unknown flag is
    // reported rather than ignored.
    let key = tok.slice(2);
    let inlineValue: string | null = null;
    const eq = key.indexOf('=');
    if (eq > 0) {
      inlineValue = key.slice(eq + 1);
      key = key.slice(0, eq);
    }
    if (inlineValue !== null) {
      flags[key] = inlineValue;
      continue;
    }
    const next = rest[i + 1];
    if (BOOLEAN_FLAGS.has(key) || !next || next.startsWith('--')) {
      flags[key] = 'true';
    } else {
      flags[key] = rest[++i];
    }
  }
  return { flags, text: pos.join(' '), pos };
}
