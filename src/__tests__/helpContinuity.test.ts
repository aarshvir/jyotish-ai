import { describe, expect, it } from 'vitest';
import { clearDeviceDrafts } from '@/components/help/deviceDrafts';
import { CALCULATOR_STORAGE_KEY } from '@/lib/tools/storage';
import { ONBOARD_DRAFT_KEY } from '@/lib/onboard/draft';
import { findHelpArticle, helpArticles, searchHelpArticles } from '@/components/help/articles';

function storage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    get length() { return data.size; },
    key(index: number) { return Array.from(data.keys())[index] ?? null; },
    getItem(key: string) { return data.get(key) ?? null; },
    removeItem(key: string) { data.delete(key); },
  };
}

describe('narrow device-draft clearing', () => {
  it('clears calculator, quiz and onboard drafts while preserving auth, payment and unrelated keys', () => {
    const session = storage({ [ONBOARD_DRAFT_KEY]: 'draft', vh_quiz_state_v1: 'answers', ziina_report_id: 'existing-report', 'sb-auth-token': 'session', unrelated: 'keep' });
    const local = storage({ [CALCULATOR_STORAGE_KEY]: 'birth-record', 'vh_q_state_v1:first': 'answers', 'vh_q_state_v1:second': 'answers', 'sb-auth-token': 'session', vh_currency: 'AED', 'vh_q_state_v10:unrelated': 'keep' });
    expect(clearDeviceDrafts(() => session, () => local)).toEqual({ cleared: 5, failed: false });
    for (const key of [ONBOARD_DRAFT_KEY, 'vh_quiz_state_v1']) expect(session.getItem(key)).toBeNull();
    for (const key of [CALCULATOR_STORAGE_KEY, 'vh_q_state_v1:first', 'vh_q_state_v1:second']) expect(local.getItem(key)).toBeNull();
    expect(session.getItem('ziina_report_id')).toBe('existing-report');
    expect(session.getItem('sb-auth-token')).toBe('session');
    expect(session.getItem('unrelated')).toBe('keep');
    expect(local.getItem('sb-auth-token')).toBe('session');
    expect(local.getItem('vh_currency')).toBe('AED');
    expect(local.getItem('vh_q_state_v10:unrelated')).toBe('keep');
  });

  it('does not claim success when storage access is denied', () => {
    const denied = () => { throw new DOMException('Denied', 'SecurityError'); };
    expect(clearDeviceDrafts(denied, denied)).toEqual({ cleared: 0, failed: true });
  });

  it('clears accessible local drafts even when session storage is denied', () => {
    const local = storage({ [CALCULATOR_STORAGE_KEY]: 'draft', 'vh_q_state_v1:a': 'draft' });
    expect(clearDeviceDrafts(() => { throw new Error('Denied'); }, () => local)).toEqual({ cleared: 2, failed: true });
    expect(local.length).toBe(0);
  });

  it('reports a failed removal and continues clearing other draft keys', () => {
    const local = storage({ [CALCULATOR_STORAGE_KEY]: 'birth-record', 'vh_q_state_v1:a': 'draft' });
    const remove = local.removeItem;
    local.removeItem = key => { if (key === CALCULATOR_STORAGE_KEY) throw new Error('Denied'); remove(key); };
    expect(clearDeviceDrafts(() => storage(), () => local)).toEqual({ cleared: 1, failed: true });
    expect(local.getItem(CALCULATOR_STORAGE_KEY)).toBe('birth-record');
    expect(local.getItem('vh_q_state_v1:a')).toBeNull();
  });

  it('handles no drafts and repeated clearing truthfully', () => {
    const local = storage({ [CALCULATOR_STORAGE_KEY]: 'draft' });
    expect(clearDeviceDrafts(() => storage(), () => local)).toEqual({ cleared: 1, failed: false });
    expect(clearDeviceDrafts(() => storage(), () => local)).toEqual({ cleared: 0, failed: false });
  });
});

describe('task-based help', () => {
  it.each(['free-birth-chart', 'birth-time', 'choose-city', 'chart-terms', 'compatibility', 'edit-save-clear', 'existing-reports', 'sign-in', 'unavailable-offers', 'calculation-and-interpretation', 'privacy', 'troubleshooting', 'report-processing'])('covers %s with a real next action', slug => {
    const article = findHelpArticle(slug);
    expect(article).toBeDefined();
    expect(article!.sections.length).toBeGreaterThan(0);
    expect(article!.action.href).toMatch(/^\/(free-kundli|sample-report|synastry|dashboard|login|chart-privacy)([?#]|$)/);
  });
  it('has unique routes and no dangling related articles', () => {
    expect(new Set(helpArticles.map(article => article.slug)).size).toBe(helpArticles.length);
    for (const article of helpArticles) for (const slug of article.related) expect(findHelpArticle(slug)).toBeDefined();
    expect(findHelpArticle('not-a-real-task')).toBeUndefined();
  });
  it.each([[' UNKNOWN ', 'birth-time'], ['guna', 'compatibility'], ['password', 'sign-in'], ['nakshatra', 'chart-terms'], ['rectification', 'birth-time'], ['time zone', 'choose-city'], ['retrieve', 'existing-reports'], ['deterministic', 'calculation-and-interpretation']])('searches %s', (query, slug) => {
    expect(searchHelpArticles(query).map(article => article.slug)).toContain(slug);
  });
  it('searches multiple words, filters by topic, and has a real empty state', () => {
    expect(searchHelpArticles('birth time', 'Birth details').some(article => article.slug === 'birth-time')).toBe(true);
    expect(searchHelpArticles('', 'Account').every(article => article.category === 'Account')).toBe(true);
    expect(searchHelpArticles('zyx-no-such-task')).toEqual([]);
    expect(searchHelpArticles('')).toHaveLength(helpArticles.length);
  });
});
