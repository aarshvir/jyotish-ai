/**
 * Format ephemeris `planet_positions` (from /generate-daily-grid) for LLM system/user prompts.
 * Whole-sign houses are counted from natal lagna (e.g. Cancer = H1).
 */

export type PlanetEntry = { sign?: string; house?: number; degree?: number };

export type PlanetPositionsPayload = {
  reference?: string;
  lagna_sign?: string;
  planets?: Record<string, PlanetEntry>;
} | null | undefined;

const GRAHA_ORDER = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'] as const;

export function formatActualPlanetaryPositionsBlock(
  positions: PlanetPositionsPayload,
  opts?: { dateLabel?: string }
): string {
  if (!positions?.planets) {
    return (
      'ACTUAL PLANETARY POSITIONS FOR THIS DATE:\n' +
      '(Not provided — do not invent graha sign or whole-sign house placements; use only panchang, per-slot transit_lagna fields, hora, choghadiya, and scores.)\n\n' +
      'STRICT RULE: Do NOT invent or assume planetary sign/house placements. If positions are not listed, do not state them.'
    );
  }

  const lagna = positions.lagna_sign ?? 'natal';
  const header = opts?.dateLabel
    ? `ACTUAL PLANETARY POSITIONS (${opts.dateLabel}) — sidereal Lahiri, whole-sign houses from ${lagna} lagna:\n`
    : `ACTUAL PLANETARY POSITIONS FOR THIS DATE — sidereal Lahiri, whole-sign houses from ${lagna} lagna:\n`;

  const lines = GRAHA_ORDER.map((name) => {
    const p = positions.planets![name];
    if (!p || p.sign == null || typeof p.house !== 'number') {
      return `${name} in (not listed) (house —):`;
    }
    return `${name} in ${p.sign} (house ${p.house}):`;
  });

  return (
    header +
    lines.join('\n') +
    '\n\n' +
    'STRICT RULE: Use ONLY these positions for graha signs and whole-sign houses from natal lagna. ' +
    'Do NOT invent or assume any planetary placement. ' +
    'Per-slot transit lagna sign and house appear in slot data — use those for hourly rising-sign context and keep them consistent with this table. ' +
    'If a planet is not listed, do not mention its sign or house.'
  );
}

/** Multiple forecast days (e.g. weeks-synthesis). */
export function formatMultipleDaysPlanetPositions(
  days: Array<{ date?: string; planet_positions?: PlanetPositionsPayload }>
): string {
  const parts = (days ?? [])
    .filter((d) => d?.date)
    .map((d) => formatActualPlanetaryPositionsBlock(d.planet_positions, { dateLabel: d.date! }));
  if (parts.length === 0) return formatActualPlanetaryPositionsBlock(null);
  return parts.join('\n\n---\n\n');
}
