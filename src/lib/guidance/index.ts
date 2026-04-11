/**
 * Guidance module barrel export.
 */
export type {
  GuidanceLabel,
  ActionCategory,
  ReasonTag,
  SlotGuidanceV2,
  DayBriefingV2,
} from './types';

export { ALL_ACTION_CATEGORIES } from './types';

export {
  getCanonicalScoreLabel,
  getGuidanceLabel,
  SCORE_LABEL_THRESHOLDS,
  GUIDANCE_LABEL_MAP,
  getLabelColor,
  getLabelIcon,
  getScoreNumColor,
} from './labels';

export {
  buildSlotGuidance,
  buildDayBriefing,
} from './builder';
export type { SlotGuidanceInput, DayBriefingInput } from './builder';

export { isV2GuidanceEnabled } from './featureFlag';
