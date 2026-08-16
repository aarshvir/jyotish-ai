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
    sessionStorage.setItem(ONBOARD_DRAFT_KEY, JSON.stringify(d));
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
