/**
 * Feature flag for V2 guidance output.
 * When enabled, new reports include SlotGuidanceV2 and DayBriefingV2 fields.
 * Old reports without these fields continue to render normally.
 *
 * Set REPORT_OUTPUT_V2=true in environment to enable.
 * Defaults to true for clean additive rollout.
 */
export function isV2GuidanceEnabled(): boolean {
  if (typeof process !== 'undefined' && process.env?.REPORT_OUTPUT_V2 === 'false') {
    return false;
  }
  return true;
}
