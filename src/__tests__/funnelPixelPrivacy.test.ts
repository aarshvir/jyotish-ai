import { afterEach, expect, it, vi } from 'vitest';
import { pixelEvent, type EventContext } from '@/lib/funnel/events';
import { setAnalyticsConsent } from '@/lib/analytics/consent';

afterEach(() => vi.unstubAllGlobals());

it('keeps retained advertising SDKs inert before choice, after usage opt-in and after withdrawal', () => {
  const pixel = vi.fn();
  const values = new Map<string, string>();
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key), length: 0, key: () => null };
  const browser = Object.assign(new EventTarget(), { fbq: pixel, localStorage: storage, sessionStorage: storage, location: { hostname: 'www.vedichour.com', pathname: '/', protocol: 'https:' } });
  vi.stubGlobal('window', browser);
  vi.stubGlobal('document', { cookie: '' });
  vi.stubGlobal('navigator', { globalPrivacyControl: false, doNotTrack: '0' });
  const context: EventContext = { sessionId: 'synthetic-session', slug: 'example', lang: 'en', geo: null, flags: {} };
  for (const choice of [null, true, false]) {
    if (choice !== null) setAnalyticsConsent(choice);
    for (const event of ['Lead', 'CompleteRegistration', 'InitiateCheckout'] as const) pixelEvent(context, event, 'synthetic');
  }
  expect(pixel).not.toHaveBeenCalled();
});
