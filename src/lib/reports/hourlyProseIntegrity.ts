export interface HourlyProseSlot {
  slot_index?: number;
  commentary?: string;
  guidance_v2?: {
    summary_plain?: string;
  };
}

/**
 * A successful model batch must cover every requested slot exactly once with
 * substantive prose. Callers use this before treating HTTP 200 as complete.
 */
export function hasCompleteHourlyProse(
  slots: HourlyProseSlot[] | undefined,
  expectedSlotIndexes: number[],
): boolean {
  if (!slots || slots.length !== expectedSlotIndexes.length) return false;

  const expected = new Set(expectedSlotIndexes);
  if (expected.size !== expectedSlotIndexes.length) return false;

  const seen = new Set<number>();
  for (const slot of slots) {
    const slotIndex = slot.slot_index;
    if (
      typeof slotIndex !== 'number' ||
      !expected.has(slotIndex) ||
      seen.has(slotIndex) ||
      (slot.commentary ?? '').trim().length < 25
    ) {
      return false;
    }
    seen.add(slotIndex);
  }

  return seen.size === expected.size;
}

/**
 * Reports created by the broken marker can say `ai_prose: true` while some
 * slots still contain the deterministic guidance copied during assembly.
 */
export function containsDeterministicHourlyFallback(
  slots: HourlyProseSlot[] | undefined,
): boolean {
  return (slots ?? []).some((slot) => {
    const commentary = (slot.commentary ?? '').trim();
    const deterministic = (slot.guidance_v2?.summary_plain ?? '').trim();
    return Boolean(commentary && deterministic && commentary === deterministic);
  });
}
