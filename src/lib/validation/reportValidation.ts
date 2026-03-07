/**
 * reportValidation.ts
 *
 * Runtime validation of the canonical ReportData contract.
 * This module is pure TypeScript — it imports only from types.ts and has
 * no dependencies on React, Next.js, or any API layer.
 *
 * Usage:
 *   const errors = validateReportData(report);
 *   if (errors.length > 0) console.error('Report contract violations:', errors);
 */

import type { ReportData, DayForecast, HoraSlot } from '@/lib/agents/types';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Returns true when s is a string that parses to a finite Date. */
function isValidIso(s: string | undefined | null): boolean {
  if (!s) return false;
  const ms = Date.parse(s);
  return Number.isFinite(ms);
}

/** Parse an ISO string to ms-since-epoch; returns NaN on failure. */
function isoMs(s: string): number {
  return Date.parse(s);
}

/**
 * Validate a single HoraSlot's ISO timestamp invariants.
 * This is the primary interval validation — display_label parsing is secondary.
 */
function validateSlotIso(slot: HoraSlot, prefix: string): string[] {
  const errs: string[] = [];

  // start_iso must be a valid date
  if (!isValidIso(slot.start_iso)) {
    errs.push(`${prefix}: start_iso "${slot.start_iso}" is not a valid ISO date`);
  }

  // end_iso must be a valid date
  if (!isValidIso(slot.end_iso)) {
    errs.push(`${prefix}: end_iso "${slot.end_iso}" is not a valid ISO date`);
  }

  // midpoint_iso must be a valid date
  if (!isValidIso(slot.midpoint_iso)) {
    errs.push(`${prefix}: midpoint_iso "${slot.midpoint_iso}" is not a valid ISO date`);
  }

  // Only do relational checks when all three parsed correctly
  if (isValidIso(slot.start_iso) && isValidIso(slot.end_iso)) {
    const startMs = isoMs(slot.start_iso);
    const endMs = isoMs(slot.end_iso);

    // end must be strictly after start
    if (endMs <= startMs) {
      errs.push(
        `${prefix}: end_iso "${slot.end_iso}" is not after start_iso "${slot.start_iso}" (reversed or zero-length interval)`
      );
    }

    // midpoint must be strictly between start and end
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

/**
 * Secondary display_label sanity check (non-primary — supplements ISO check).
 * Only flags obvious label problems; does not replace timestamp validation.
 */
function validateSlotLabelOrder(slot: HoraSlot, prevSlot: HoraSlot | undefined, prefix: string): string[] {
  const errs: string[] = [];

  if (!slot.display_label?.trim()) {
    errs.push(`${prefix}: display_label is empty`);
    return errs;
  }

  // If we have ISO timestamps, use them to verify ascending order rather than
  // parsing the label string.
  if (prevSlot && isValidIso(prevSlot.start_iso) && isValidIso(slot.start_iso)) {
    if (isoMs(slot.start_iso) < isoMs(prevSlot.start_iso)) {
      errs.push(
        `${prefix}: slot start_iso "${slot.start_iso}" is before previous slot start_iso "${prevSlot.start_iso}" — slots must be ascending`
      );
    }
  }

  return errs;
}

function validateSlots(slots: HoraSlot[], dayDate: string): string[] {
  const errs: string[] = [];
  const prefix = `Day ${dayDate}`;

  // INVARIANT: exactly 18 slots
  if (slots.length !== 18) {
    errs.push(`${prefix}: expected 18 slots, got ${slots.length}`);
  }

  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i];
    const sp = `${prefix} slot[${i}]`;

    // commentary must not be empty
    if (!slot.commentary?.trim()) {
      errs.push(`${sp}: commentary is empty`);
    }

    // commentary_short must not be empty
    if (!slot.commentary_short?.trim()) {
      errs.push(`${sp}: commentary_short is empty`);
    }

    // slot_index must match array position
    if (slot.slot_index !== i) {
      errs.push(`${sp}: slot_index is ${slot.slot_index}, expected ${i}`);
    }

    // Primary interval validation via ISO timestamps
    errs.push(...validateSlotIso(slot, sp));

    // Secondary: display_label presence + ascending order (uses ISO when available)
    errs.push(...validateSlotLabelOrder(slot, i > 0 ? slots[i - 1] : undefined, sp));
  }

  return errs;
}

function validateDay(day: DayForecast): string[] {
  const errs: string[] = [];
  const prefix = `Day ${day.date}`;

  // overview must not be empty
  if (!day.overview?.trim()) {
    errs.push(`${prefix}: overview is empty`);
  }

  // validate slots
  errs.push(...validateSlots(day.slots ?? [], day.date));

  return errs;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Validates a ReportData object against the canonical contract.
 *
 * Returns an array of human-readable error strings.
 * An empty array means the report passes all invariant checks.
 */
export function validateReportData(report: ReportData): string[] {
  const errors: string[] = [];

  // ── Nativity ──────────────────────────────────────────────────────────────
  if (!report.nativity?.lagna_analysis?.trim()) {
    errors.push('nativity.lagna_analysis is empty');
  }

  // ── Months ────────────────────────────────────────────────────────────────
  if (!Array.isArray(report.months) || report.months.length !== 12) {
    errors.push(
      `months: expected length 12, got ${Array.isArray(report.months) ? report.months.length : 'non-array'}`
    );
  }

  // ── Weeks ─────────────────────────────────────────────────────────────────
  if (!Array.isArray(report.weeks) || report.weeks.length !== 6) {
    errors.push(
      `weeks: expected length 6, got ${Array.isArray(report.weeks) ? report.weeks.length : 'non-array'}`
    );
  }

  // ── Days ──────────────────────────────────────────────────────────────────
  if (!Array.isArray(report.days) || report.days.length === 0) {
    errors.push('days: array is empty or missing');
  } else {
    for (const day of report.days) {
      errors.push(...validateDay(day));
    }
  }

  // ── Synthesis ─────────────────────────────────────────────────────────────
  if (!report.synthesis?.opening_paragraph?.trim()) {
    errors.push('synthesis.opening_paragraph is empty');
  }

  return errors;
}

/**
 * Throws if any contract violations are found.
 * Useful in server-side code where you want a hard failure rather than
 * a silent degraded render.
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
