import { describe, it, expect } from 'vitest';
import { buildOnboardDraft, mergeOnboardDraft, type OnboardDraft, type OnboardDraftFormSlice } from '@/lib/onboard/draft';

const QUESTION = 'When is the best window to switch jobs this year?';

const draft: OnboardDraft = {
  name: 'Priya',
  birthDate: '1992-03-14',
  birthTime: '06:30:00',
  birthCity: 'Mumbai',
  birthLat: 19.076,
  birthLng: 72.8777,
  reportType: '7day',
  promoCode: 'NEWUSER30',
  personalContext: QUESTION,
};

const emptyForm: OnboardDraftFormSlice = {
  name: '',
  birthDate: '',
  birthTime: '',
  birthCity: '',
  birthLat: null,
  birthLng: null,
  reportType: 'free',
  personalContext: '',
};

describe('onboard draft — the question must survive Google / Ziina round-trips', () => {
  it('buildOnboardDraft persists the question even when callers omit it', () => {
    const { personalContext: _drop, ...withoutQuestion } = draft;
    expect(buildOnboardDraft(withoutQuestion).personalContext).toBe('');
    expect(buildOnboardDraft(draft).personalContext).toBe(QUESTION);
  });

  it('mergeOnboardDraft restores the question onto an empty form (Google ?resume=1)', () => {
    const restored = mergeOnboardDraft(emptyForm, draft);
    expect(restored.personalContext).toBe(QUESTION);
    expect(restored.birthDate).toBe('1992-03-14');
    expect(restored.birthLat).toBe(19.076);
    expect(restored.reportType).toBe('7day');
  });

  it('does not clobber a question the visitor already typed', () => {
    const typed = mergeOnboardDraft({ ...emptyForm, personalContext: 'Keep this' }, draft);
    expect(typed.personalContext).toBe('Keep this');
  });

  it('treats a missing personalContext on an older draft as empty, not undefined', () => {
    const { personalContext: _drop, ...legacy } = draft;
    expect(mergeOnboardDraft(emptyForm, legacy).personalContext).toBe('');
  });
});
