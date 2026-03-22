/**
 * Format ephemeris `planet_positions` (from /generate-daily-grid) for LLM system/user prompts.
 * Whole-sign houses are counted from natal lagna (e.g. Cancer = H1).
 * Also: fixed yoga meanings, best choghadiya window, Rahu Kaal day flag.
 */

export type PlanetEntry = { sign?: string; house?: number; degree?: number };

export type PlanetPositionsPayload = {
  reference?: string;
  lagna_sign?: string;
  planets?: Record<string, PlanetEntry>;
} | null | undefined;

const GRAHA_ORDER = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'] as const;

/** Panchang yoga name → fixed interpretive meaning (do not let the model invent). */
export const YOGA_MEANINGS: Record<string, string> = {
  Vishkambha: 'obstacle at foundation — avoid new starts, review existing work only',
  Priti: 'affection and harmony — excellent for relationships and partnerships',
  Ayushman: 'long life and vitality — good for health matters and long-term plans',
  Saubhagya: 'good fortune — auspicious generally, favors wealth and gains',
  Shobhana: 'brilliance and beauty — good for creative and aesthetic work',
  Atiganda: 'great obstacle — highly inauspicious, avoid important decisions',
  Sukarma: 'virtuous action — moderate positive, good for charitable works',
  Dhriti: 'steadiness and resolve — good for completing ongoing work',
  Shula: 'pain and trouble — mixed, proceed carefully with caution',
  Ganda: 'knot/danger — inauspicious for new beginnings',
  Vriddhi: 'growth and increase — auspicious for business and expansion',
  Dhruva: 'fixed and stable — excellent for permanent works and foundations',
  Vyaghata: 'striking obstacle — avoid confrontations and risky ventures',
  Harshana: 'joy, delight, happiness — auspicious for celebrations, social occasions, and creative expression',
  Vajra: 'thunderbolt — powerful but dangerous, double-edged energy',
  Siddhi: 'success and accomplishment — very favorable for completing important tasks',
  Vyatipata: 'calamity — highly inauspicious, one of the worst yogas',
  Variyan: 'comfort and ease — gentle positive energy, good for rest',
  Parigha: 'barrier and obstruction — avoid starting new projects',
  Shiva: 'auspicious and divine — excellent for spiritual and religious work',
  Siddha: 'proven success — very favorable for all undertakings',
  Sadhya: 'accomplishable — moderate positive, goals within reach',
  Shubha: 'auspicious — generally favorable for most activities',
  Shukla: 'bright and pure — good for learning and intellectual work',
  Brahma: 'divine creation — excellent for learning, teaching, and creative work',
  Indra: 'victory and power — good for leadership, authority, and competitive tasks',
  Vaidhriti: 'separation — inauspicious, avoid travel and new beginnings',
};

function normalizeYogaLookupKey(raw: string | undefined | null): string {
  if (!raw || !String(raw).trim()) return '';
  return String(raw).split('→')[0].split('/')[0].trim();
}

export function getYogaMeaning(yogaName: string): string {
  const key = normalizeYogaLookupKey(yogaName);
  if (!key) return 'moderately auspicious — proceed with awareness';
  if (YOGA_MEANINGS[key]) return YOGA_MEANINGS[key];
  const found = Object.keys(YOGA_MEANINGS).find((k) => k.toLowerCase() === key.toLowerCase());
  if (found) return YOGA_MEANINGS[found];
  const first = key.split(/\s+/)[0];
  if (YOGA_MEANINGS[first]) return YOGA_MEANINGS[first];
  return 'moderately auspicious — proceed with awareness';
}

export function formatYogaInterpretationBlock(yogaName: string): string {
  const display = normalizeYogaLookupKey(yogaName) || String(yogaName || 'Unknown').trim() || 'Unknown';
  const meaning = getYogaMeaning(yogaName);
  return `TODAY'S YOGA: ${display}
MEANING: ${meaning}

STRICT RULE: The yoga meaning above is fixed and verified. Do not reinterpret it. Use this exact meaning when discussing the yoga.`;
}

export type BestSlotLike = {
  display_label?: string;
  score?: number;
  dominant_choghadiya?: string;
} | null;

export function pickBestScoringSlot<
  T extends { score?: number; display_label?: string; dominant_choghadiya?: string },
>(slots: T[] | undefined | null): { display_label: string; score: number; dominant_choghadiya: string } | null {
  if (!slots?.length) return null;
  const best = slots.reduce((b, s) => (Number(s?.score) > Number(b?.score) ? s : b), slots[0]);
  return {
    display_label: String(best?.display_label ?? ''),
    score: typeof best?.score === 'number' ? best.score : Number(best?.score) || 0,
    dominant_choghadiya: String(best?.dominant_choghadiya ?? ''),
  };
}

export function formatBestActionWindowBlock(best: BestSlotLike): string {
  if (!best?.display_label) {
    return `BEST ACTION WINDOW TODAY:
Time: (not provided)
Score: —
Choghadiya: —

STRICT RULE: If slot data in the request includes scores, use the single highest-scoring slot's display_label and dominant_choghadiya as the primary window. This window MUST be mentioned by name in your STRATEGY section when data exists.`;
  }
  return `BEST ACTION WINDOW TODAY:
Time: ${best.display_label}
Score: ${best.score}
Choghadiya: ${best.dominant_choghadiya}

STRICT RULE: This window MUST be mentioned by name in your STRATEGY section. It is the primary recommendation of this report. Do not recommend a different time as the primary window.`;
}

export function formatRahuKaalDayBlock(isRahuKaalActive: boolean): string {
  const line1 = isRahuKaalActive
    ? 'RAHU KAAL TODAY: ACTIVE — caution required'
    : 'RAHU KAAL TODAY: Not active';
  const line2 = isRahuKaalActive
    ? 'STRICT RULE: Warn against important decisions during Rahu Kaal.'
    : '';
  return [line1, line2].filter(Boolean).join('\n');
}

export function isRahuKaalWindowDefined(rahu_kaal?: { start?: string; end?: string }): boolean {
  return Boolean(String(rahu_kaal?.start ?? '').trim() && String(rahu_kaal?.end ?? '').trim());
}

/** One forecast day: positions + yoga + best slot + Rahu Kaal (for daily batch sections, hourly, anchor month, etc.). */
export function formatDayCommentaryAnchorBlocks(opts: {
  planet_positions?: PlanetPositionsPayload;
  dateLabel: string;
  yogaName?: string;
  slots?: Array<{ display_label?: string; score?: number; dominant_choghadiya?: string }>;
  rahu_kaal?: { start?: string; end?: string };
}): string {
  const pos = formatActualPlanetaryPositionsBlock(opts.planet_positions, { dateLabel: opts.dateLabel });
  const yogaB = formatYogaInterpretationBlock(opts.yogaName ?? '');
  const best = pickBestScoringSlot(opts.slots);
  const bestB = formatBestActionWindowBlock(best);
  const rahuB = formatRahuKaalDayBlock(isRahuKaalWindowDefined(opts.rahu_kaal));
  return [pos, yogaB, bestB, rahuB].join('\n\n');
}

export type DayAnchorInput = {
  date?: string;
  planet_positions?: PlanetPositionsPayload;
  panchang?: { yoga?: string };
  slots?: Array<{ display_label?: string; score?: number; dominant_choghadiya?: string }>;
  rahu_kaal?: { start?: string; end?: string };
};

export function formatMultipleDaysCommentaryAnchors(days: DayAnchorInput[]): string {
  const parts = (days ?? [])
    .filter((d) => d?.date)
    .map((d) =>
      formatDayCommentaryAnchorBlocks({
        planet_positions: d.planet_positions,
        dateLabel: d.date!,
        yogaName: d.panchang?.yoga,
        slots: d.slots,
        rahu_kaal: d.rahu_kaal,
      })
    );
  if (parts.length === 0) return formatActualPlanetaryPositionsBlock(null);
  return parts.join('\n\n---\n\n');
}

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

/** @deprecated Prefer formatMultipleDaysCommentaryAnchors when yoga/slots/rahu are available. */
export function formatMultipleDaysPlanetPositions(
  days: Array<{ date?: string; planet_positions?: PlanetPositionsPayload }>
): string {
  return formatMultipleDaysCommentaryAnchors(
    (days ?? []).map((d) => ({
      date: d.date,
      planet_positions: d.planet_positions,
    }))
  );
}
