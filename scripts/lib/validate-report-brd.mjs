/**
 * BRD-shaped report validation (shared by test-report-e2e.mjs and test-report-e2e-matrix.mjs).
 */

export const REQUIRED_DAYS = 7;
export const REQUIRED_SLOTS = 18;
export const REQUIRED_MONTHS = 12;
export const REQUIRED_WEEKS = 6;
export const MIN_COMMENTARY_CHARS = 40;
export const MAX_FALLBACK_REPETITION_RATE = 0.5;
export const MAX_DAY_SCORE_DRIFT = 2;

/**
 * @param {Record<string, unknown> | null | undefined} report
 * @returns {{ errors: string[]; warnings: string[] }}
 */
export function validateReport(report) {
  const errors = [];
  const warnings = [];

  function err(msg) {
    errors.push(msg);
  }
  function warn(msg) {
    warnings.push(msg);
  }

  if (!report || typeof report !== 'object') {
    err('report is null or not an object');
    return { errors, warnings };
  }

  if (!report.nativity) {
    err('nativity section missing');
  } else {
    if (!report.nativity.lagna_analysis?.trim()) err('nativity.lagna_analysis is empty');
    else if (report.nativity.lagna_analysis.trim().length < MIN_COMMENTARY_CHARS)
      warn(`nativity.lagna_analysis very short (${report.nativity.lagna_analysis.trim().length} chars)`);

    if (!report.nativity.current_dasha_interpretation?.trim())
      err('nativity.current_dasha_interpretation is empty');
  }

  if (!report.synthesis) {
    err('synthesis section missing');
  } else {
    if (!report.synthesis.opening_paragraph?.trim()) err('synthesis.opening_paragraph is empty');
  }

  if (!Array.isArray(report.months)) {
    err('months is not an array');
  } else if (report.months.length !== REQUIRED_MONTHS) {
    err(`months: expected ${REQUIRED_MONTHS}, got ${report.months.length}`);
  } else {
    report.months.forEach((m, i) => {
      if (!m.month?.trim()) err(`months[${i}]: month label empty`);
      if (typeof m.score !== 'number') err(`months[${i}]: score missing`);
      if (!m.commentary?.trim()) err(`months[${i}]: commentary empty`);
      else if (m.commentary.includes('generating — refresh'))
        warn(`months[${i}]: still shows fallback placeholder text`);
    });
  }

  if (!Array.isArray(report.weeks)) {
    err('weeks is not an array');
  } else if (report.weeks.length !== REQUIRED_WEEKS) {
    err(`weeks: expected ${REQUIRED_WEEKS}, got ${report.weeks.length}`);
  } else {
    report.weeks.forEach((w, i) => {
      if (!w.week_label?.trim()) err(`weeks[${i}]: week_label empty`);
      if (typeof w.score !== 'number') err(`weeks[${i}]: score missing`);
      if (!w.commentary?.trim() && !w.synthesis?.trim())
        warn(`weeks[${i}]: commentary/synthesis text empty`);
    });
  }

  if (!Array.isArray(report.days) || report.days.length === 0) {
    err('days array is empty or missing');
  } else {
    if (report.days.length !== REQUIRED_DAYS) warn(`days: expected ${REQUIRED_DAYS}, got ${report.days.length}`);

    report.days.forEach((day, di) => {
      const dp = `days[${di}] (${day.date ?? '?'})`;

      if (!day.date?.match(/^\d{4}-\d{2}-\d{2}$/)) err(`${dp}: date invalid "${day.date}"`);
      if (!day.overview?.trim()) err(`${dp}: overview empty`);
      if (typeof day.day_score !== 'number') err(`${dp}: day_score missing`);

      if (!Array.isArray(day.slots)) {
        err(`${dp}: slots missing`);
        return;
      }
      if (day.slots.length !== REQUIRED_SLOTS)
        err(`${dp}: expected ${REQUIRED_SLOTS} slots, got ${day.slots.length}`);

      if (day.slots.length === REQUIRED_SLOTS) {
        const mean = day.slots.reduce((s, sl) => s + (sl.score ?? 0), 0) / REQUIRED_SLOTS;
        const drift = Math.abs(day.day_score - Math.round(mean));
        if (drift > MAX_DAY_SCORE_DRIFT)
          warn(`${dp}: day_score ${day.day_score} drifts ${drift}pts from slot mean (${mean.toFixed(1)})`);
      }

      const coms = day.slots.map((s) => (s.commentary ?? '').trim()).filter(Boolean);
      if (coms.length >= 3) {
        const unique = new Set(coms);
        const repRate = 1 - unique.size / coms.length;
        if (repRate > MAX_FALLBACK_REPETITION_RATE)
          warn(
            `${dp}: ${Math.round(repRate * 100)}% of slot commentaries are identical — fallback leak`,
          );
      }

      day.slots.forEach((slot, si) => {
        const sp = `${dp} slot[${si}]`;

        if (slot.slot_index !== si) err(`${sp}: slot_index ${slot.slot_index} !== ${si}`);
        if (!slot.display_label?.trim()) err(`${sp}: display_label empty`);

        if (!slot.commentary?.trim()) err(`${sp}: commentary empty`);
        else if (slot.commentary.trim().length < MIN_COMMENTARY_CHARS)
          warn(`${sp}: commentary very short (${slot.commentary.trim().length} chars)`);

        if (!slot.commentary_short?.trim()) warn(`${sp}: commentary_short empty`);

        if (typeof slot.score !== 'number') err(`${sp}: score missing`);

        const validStart = slot.start_iso && !isNaN(Date.parse(slot.start_iso));
        const validEnd = slot.end_iso && !isNaN(Date.parse(slot.end_iso));
        if (!validStart) err(`${sp}: start_iso invalid "${slot.start_iso}"`);
        if (!validEnd) err(`${sp}: end_iso invalid "${slot.end_iso}"`);
        if (validStart && validEnd && Date.parse(slot.end_iso) <= Date.parse(slot.start_iso))
          err(`${sp}: end_iso not after start_iso`);

        if (slot.is_rahu_kaal) {
          const c = (slot.commentary ?? '').toLowerCase();
          const initiationMatch = c.match(/\b(start|launch|sign|commit|initiate|begin new)\b/);
          if (initiationMatch) {
            const before = c.slice(
              Math.max(0, c.indexOf(initiationMatch[0]) - 30),
              c.indexOf(initiationMatch[0]),
            );
            if (!/\b(do not|don't|avoid|never|stop)\b/.test(before))
              warn(
                `${sp}: Rahu Kaal slot recommends initiation without negation ("${initiationMatch[0]}")`,
              );
          }
        }

        if (slot.label) {
          const s = slot.score ?? 0;
          const rk = !!slot.is_rahu_kaal;
          const expected = rk
            ? 'Avoid'
            : s >= 85
              ? 'Peak'
              : s >= 75
                ? 'Excellent'
                : s >= 65
                  ? 'Good'
                  : s >= 50
                    ? 'Neutral'
                    : s >= 45
                      ? 'Caution'
                      : s >= 35
                        ? 'Difficult'
                        : 'Avoid';
          if (slot.label !== expected)
            warn(`${sp}: label "${slot.label}" doesn't match expected "${expected}" for score ${s}`);
        }
      });
    });
  }

  return { errors, warnings };
}
