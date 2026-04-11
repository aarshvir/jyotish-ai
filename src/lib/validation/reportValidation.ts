/**
 * reportValidation.ts
 *
 * Runtime validation of the canonical ReportData contract.
 * V2: includes semantic consistency checks in addition to structural validation.
 *
 * This module is pure TypeScript — it imports only from types.ts and labels.ts
 * and has no dependencies on React, Next.js, or any API layer.
 */

import type { ReportData, DayForecast, HoraSlot } from '@/lib/agents/types';
import { getCanonicalScoreLabel } from '@/lib/guidance/labels';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function isValidIso(s: string | undefined | null): boolean {
  if (!s) return false;
  const ms = Date.parse(s);
  return Number.isFinite(ms);
}

function isoMs(s: string): number {
  return Date.parse(s);
}

function validateSlotIso(slot: HoraSlot, prefix: string): string[] {
  const errs: string[] = [];

  if (!isValidIso(slot.start_iso)) {
    errs.push(`${prefix}: start_iso "${slot.start_iso}" is not a valid ISO date`);
  }
  if (!isValidIso(slot.end_iso)) {
    errs.push(`${prefix}: end_iso "${slot.end_iso}" is not a valid ISO date`);
  }
  if (!isValidIso(slot.midpoint_iso)) {
    errs.push(`${prefix}: midpoint_iso "${slot.midpoint_iso}" is not a valid ISO date`);
  }

  if (isValidIso(slot.start_iso) && isValidIso(slot.end_iso)) {
    const startMs = isoMs(slot.start_iso);
    const endMs = isoMs(slot.end_iso);

    if (endMs <= startMs) {
      errs.push(
        `${prefix}: end_iso "${slot.end_iso}" is not after start_iso "${slot.start_iso}" (reversed or zero-length interval)`
      );
    }

    if (isValidIso(slot.midpoint_iso)) {
      const midMs = isoMs(slot.midpoint_iso);
      if (midMs <= startMs || midMs >= endMs) {
        errs.push(
          `${prefix}: midpoint_iso "${slot.midpoint_iso}" is not strictly between start_iso and end_iso`
        );
      }
    }
  }

  return errs;
}

function validateSlotLabelOrder(slot: HoraSlot, prevSlot: HoraSlot | undefined, prefix: string): string[] {
  const errs: string[] = [];

  if (!slot.display_label?.trim()) {
    errs.push(`${prefix}: display_label is empty`);
    return errs;
  }

  if (prevSlot && isValidIso(prevSlot.start_iso) && isValidIso(slot.start_iso)) {
    if (isoMs(slot.start_iso) < isoMs(prevSlot.start_iso)) {
      errs.push(
        `${prefix}: slot start_iso "${slot.start_iso}" is before previous slot start_iso "${prevSlot.start_iso}" — slots must be ascending`
      );
    }
  }

  return errs;
}

// ---------------------------------------------------------------------------
// Semantic validation helpers (V2)
// ---------------------------------------------------------------------------

const INITIATION_WORDS = /\b(start|launch|sign|commit|initiate|begin new|open new|negotiate)\b/i;
const STRONG_ACTION_WORDS = /\b(act decisively|seize|bold move|go all.?in|maximum effort|push hard)\b/i;

function validateSlotSemantics(slot: HoraSlot, prefix: string): string[] {
  const warnings: string[] = [];
  const commentary = (slot.commentary ?? '').toLowerCase();
  const score = slot.score ?? 50;
  const expectedLabel = getCanonicalScoreLabel(score, slot.is_rahu_kaal);

  // Score-label mismatch
  if (slot.label && slot.label !== expectedLabel) {
    warnings.push(
      `${prefix}: label "${slot.label}" does not match canonical label "${expectedLabel}" for score ${score} (isRahuKaal=${slot.is_rahu_kaal})`
    );
  }

  // Rahu Kaal slots should never recommend initiation
  if (slot.is_rahu_kaal && INITIATION_WORDS.test(commentary)) {
    const match = commentary.match(INITIATION_WORDS);
    if (match && !/\b(do not|don't|avoid|never|stop)\b/i.test(commentary.slice(Math.max(0, (match.index ?? 0) - 30), match.index))) {
      warnings.push(
        `${prefix}: Rahu Kaal slot recommends initiation ("${match[0]}") without preceding negation`
      );
    }
  }

  // Very low scores should not sound excellent
  if (score < 35 && STRONG_ACTION_WORDS.test(commentary)) {
    warnings.push(
      `${prefix}: low score (${score}) slot uses strong action language`
    );
  }

  return warnings;
}

function validateDayScoreInvariant(day: DayForecast, prefix: string): string[] {
  const warnings: string[] = [];
  if (!day.slots || day.slots.length !== 18) return warnings;

  const slotScores = day.slots.map((s) => s.score ?? 0);
  const mean = slotScores.reduce((a, b) => a + b, 0) / 18;
  const expected = Math.round(mean);

  if (Math.abs(day.day_score - expected) > 1) {
    warnings.push(
      `${prefix}: day_score ${day.day_score} does not match rounded mean of 18 slots (${expected})`
    );
  }

  return warnings;
}

function validateFallbackRepetition(day: DayForecast, prefix: string): string[] {
  const warnings: string[] = [];
  if (!day.slots || day.slots.length === 0) return warnings;

  const commentaries = day.slots.map((s) => (s.commentary ?? '').trim()).filter(Boolean);
  if (commentaries.length < 3) return warnings;

  // Check for identical commentaries
  const unique = new Set(commentaries);
  const repetitionRate = 1 - unique.size / commentaries.length;
  if (repetitionRate > 0.5) {
    warnings.push(
      `${prefix}: ${Math.round(repetitionRate * 100)}% of slot commentaries are identical — likely fallback leakage`
    );
  }

  return warnings;
}

function validateSlots(slots: HoraSlot[], dayDate: string): string[] {
  const errs: string[] = [];
  const prefix = `Day ${dayDate}`;

  if (slots.length !== 18) {
    errs.push(`${prefix}: expected 18 slots, got ${slots.length}`);
  }

  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i];
    const sp = `${prefix} slot[${i}]`;

    if (!slot.commentary?.trim()) {
      errs.push(`${sp}: commentary is empty`);
    }
    if (!slot.commentary_short?.trim()) {
      errs.push(`${sp}: commentary_short is empty`);
    }
    if (slot.slot_index !== i) {
      errs.push(`${sp}: slot_index is ${slot.slot_index}, expected ${i}`);
    }

    errs.push(...validateSlotIso(slot, sp));
    errs.push(...validateSlotLabelOrder(slot, i > 0 ? slots[i - 1] : undefined, sp));
  }

  return errs;
}

function validateDay(day: DayForecast): string[] {
  const errs: string[] = [];
  const prefix = `Day ${day.date}`;

  if (!day.overview?.trim()) {
    errs.push(`${prefix}: overview is empty`);
  }

  errs.push(...validateSlots(day.slots ?? [], day.date));

  return errs;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Validates a ReportData object against the canonical contract.
 * Returns an array of human-readable error strings.
 */
export function validateReportData(report: ReportData): string[] {
  const errors: string[] = [];

  if (!report.nativity?.lagna_analysis?.trim()) {
    errors.push('nativity.lagna_analysis is empty');
  }

  if (!Array.isArray(report.months) || report.months.length !== 12) {
    errors.push(
      `months: expected length 12, got ${Array.isArray(report.months) ? report.months.length : 'non-array'}`
    );
  }

  if (!Array.isArray(report.weeks) || report.weeks.length !== 6) {
    errors.push(
      `weeks: expected length 6, got ${Array.isArray(report.weeks) ? report.weeks.length : 'non-array'}`
    );
  }

  if (!Array.isArray(report.days) || report.days.length === 0) {
    errors.push('days: array is empty or missing');
  } else {
    for (const day of report.days) {
      errors.push(...validateDay(day));
    }
  }

  if (!report.synthesis?.opening_paragraph?.trim()) {
    errors.push('synthesis.opening_paragraph is empty');
  }

  return errors;
}

/**
 * V2 semantic validation — returns warnings (not hard errors) for:
 * - score-label mismatches
 * - Rahu Kaal slots recommending initiation
 * - weak slots using strong action language
 * - day_score not matching mean of 18 slots
 * - excessive fallback repetition
 */
export function validateReportSemantics(report: ReportData): string[] {
  const warnings: string[] = [];

  if (!Array.isArray(report.days)) return warnings;

  for (const day of report.days) {
    const prefix = `Day ${day.date}`;

    // Day score invariant
    warnings.push(...validateDayScoreInvariant(day, prefix));

    // Fallback repetition
    warnings.push(...validateFallbackRepetition(day, prefix));

    // Per-slot semantic checks
    if (day.slots) {
      for (let i = 0; i < day.slots.length; i++) {
        warnings.push(...validateSlotSemantics(day.slots[i], `${prefix} slot[${i}]`));
      }
    }
  }

  return warnings;
}

/**
 * Throws if any contract violations are found.
 */
export function assertReportData(report: ReportData): void {
  const errors = validateReportData(report);
  if (errors.length > 0) {
    throw new Error(
      `ReportData contract violations (${errors.length}):\n` +
        errors.map((e) => `  • ${e}`).join('\n')
    );
  }
}
