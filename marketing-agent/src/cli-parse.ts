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
    const key = tok.slice(2);
    const next = rest[i + 1];
    if (BOOLEAN_FLAGS.has(key) || !next || next.startsWith('--')) {
      flags[key] = 'true';
    } else {
      flags[key] = rest[++i];
    }
  }
  return { flags, text: pos.join(' '), pos };
}
