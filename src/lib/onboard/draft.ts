/**
 * Shared onboard form draft. Written before Ziina checkout (so a cancelled
 * payment restores the form) and by free calculator tools (so a visitor who
 * just computed a Kundli does not re-type birth details on /onboard).
 */
export const ONBOARD_DRAFT_KEY = 'vh_onboard_draft';

export type OnboardDraftPlan = 'free' | '7day' | 'monthly' | 'annual';

export interface OnboardDraft {
  name: string;
  birthDate: string;
  birthTime: string;
  birthCity: string;
  birthLat?: number | null;
  birthLng?: number | null;
  reportType: OnboardDraftPlan;
  promoCode: string;
  /** The question they typed last time — the hook their report answers. Older drafts lack it. */
  personalContext?: string;
}

/** Fields the onboard form restores from a draft. Keep in sync with write sites. */
export type OnboardDraftFormSlice = {
  name: string;
  birthDate: string;
  birthTime: string;
  birthCity: string;
  birthLat: number | null;
  birthLng: number | null;
  reportType: OnboardDraftPlan;
  personalContext: string;
};

/**
 * Persist a draft including the question. Google OAuth and Ziina both full-page
 * navigate away; the return path auto-continues from this object, so dropping
 * personalContext silently generates (or charges for) a report that never
 * answers what they typed.
 */
export function buildOnboardDraft(d: OnboardDraft): OnboardDraft {
  return {
    name: d.name,
    birthDate: d.birthDate,
    birthTime: d.birthTime,
    birthCity: d.birthCity,
    birthLat: d.birthLat ?? null,
    birthLng: d.birthLng ?? null,
    reportType: d.reportType,
    promoCode: d.promoCode,
    personalContext: d.personalContext ?? '',
  };
}

/** Overlay a draft onto the form without clobbering fields the visitor already typed. */
export function mergeOnboardDraft<T extends OnboardDraftFormSlice>(prev: T, draft: OnboardDraft): T {
  return {
    ...prev,
    name: prev.name || draft.name || '',
    birthDate: prev.birthDate || draft.birthDate || '',
    birthTime: prev.birthTime || draft.birthTime || '',
    birthCity: prev.birthCity || draft.birthCity || '',
    birthLat: prev.birthLat ?? draft.birthLat ?? prev.birthLat,
    birthLng: prev.birthLng ?? draft.birthLng ?? prev.birthLng,
    reportType: draft.reportType || prev.reportType,
    personalContext: prev.personalContext || draft.personalContext || '',
  };
}

export function readOnboardDraft(): OnboardDraft | null {
  try {
    const raw = typeof window !== 'undefined' ? sessionStorage.getItem(ONBOARD_DRAFT_KEY) : null;
    if (!raw) return null;
    return JSON.parse(raw) as OnboardDraft;
  } catch {
    return null;
  }
}

export function writeOnboardDraft(d: OnboardDraft): void {
  try {
    sessionStorage.setItem(ONBOARD_DRAFT_KEY, JSON.stringify(buildOnboardDraft(d)));
  } catch {
    /* private mode / quota */
  }
}

export function clearOnboardDraft(): void {
  try {
    sessionStorage.removeItem(ONBOARD_DRAFT_KEY);
  } catch {
    /* ignore */
  }
}
