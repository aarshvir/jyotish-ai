import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import type { PostHog } from 'posthog-js';
import { createServer } from 'node:http';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { mkdtempSync } from 'node:fs';

function storage() {
  const values = new Map<string, string>();
  return {
    values,
    get length() { return values.size; },
    key: (index: number) => Array.from(values.keys())[index] ?? null,
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => { values.set(key, value); }),
    removeItem: vi.fn((key: string) => { values.delete(key); }),
  };
}

let local: ReturnType<typeof storage>;
let session: ReturnType<typeof storage>;
let cookies: Map<string, string>;
let cookieWrites: string[];
let location: { origin: string; hostname: string; protocol: string; pathname: string; search: string; hash: string };
let browser: EventTarget & Record<string, unknown>;

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', 'public-test-project-token');
  vi.stubEnv('NEXT_PUBLIC_GA_ID', 'G-TEST0001');
  local = storage();
  session = storage();
  cookies = new Map();
  cookieWrites = [];
  location = { origin: 'https://www.vedichour.com', hostname: 'www.vedichour.com', protocol: 'https:', pathname: '/', search: '', hash: '' };
  browser = Object.assign(new EventTarget(), { localStorage: local, sessionStorage: session, location }) as unknown as EventTarget & Record<string, unknown>;
  vi.stubGlobal('window', browser);
  vi.stubGlobal('localStorage', local);
  vi.stubGlobal('sessionStorage', session);
  vi.stubGlobal('navigator', { doNotTrack: '0', globalPrivacyControl: false });
  const document = {
    referrer: 'https://private.example/report/token?birth_date=1992-06-15',
    get cookie() { return Array.from(cookies, ([key, value]) => key + '=' + value).join('; '); },
    set cookie(value: string) {
      cookieWrites.push(value);
      const pair = value.split(';')[0];
      const index = pair.indexOf('=');
      const name = pair.slice(0, index);
      if (/Max-Age=0/.test(value)) cookies.delete(name);
      else cookies.set(name, pair.slice(index + 1));
    },
  };
  vi.stubGlobal('document', document);
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true })));
});

it.skipIf(process.env.ANALYTICS_CONSENT_BROWSER_TEST !== '1')('browser mocks: 100 events denied, explicit opt-in, withdrawal, and no private URLs', { timeout: 120_000 }, async () => {
  const ts = await import('typescript');
  const { chromium } = await import('playwright');
  const files = [
    'src/lib/analytics/consent.ts', 'src/lib/analytics/useAnalyticsConsent.ts',
    'src/lib/analytics/client.ts', 'src/lib/analytics/events.ts',
    'src/lib/analytics/trackingIds.ts', 'src/lib/env.ts',
    'src/components/analytics/AnalyticsPreferences.tsx', 'src/components/analytics/PostHogProvider.tsx',
    'src/components/analytics/GoogleAnalytics.tsx', 'src/components/analytics/MetaPixel.tsx',
    'src/components/analytics/FirstTouch.tsx', 'src/components/analytics/RefCapture.tsx',
    'src/components/shared/Navbar.tsx', 'src/components/shared/Footer.tsx',
    'src/components/shared/LaunchBanner.tsx', 'src/app/privacy/page.tsx',
  ];
  const registry = Object.fromEntries(files.map(file => [file, ts.transpileModule(readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText]));
  const postcss = (await import('postcss')).default;
  const tailwind = (await import('tailwindcss')).default;
  const config = (await import('../../tailwind.config')).default;
  const css = await postcss([tailwind({ ...config, content: files.map(file => ({ raw: readFileSync(file, 'utf8'), extension: 'tsx' })) })])
    .process(readFileSync('src/app/globals.css', 'utf8'), { from: undefined });
  const react = readFileSync('node_modules/react/umd/react.development.js', 'utf8');
  const dom = readFileSync('node_modules/react-dom/umd/react-dom.development.js', 'utf8');
  const app = `
    const process = { env: { NEXT_PUBLIC_POSTHOG_KEY: 'public-browser-fixture', NEXT_PUBLIC_GA_ID: 'G-TEST0001', NEXT_PUBLIC_POSTHOG_HOST: 'https://analytics.example.test' } };
    const sources = ${JSON.stringify(registry)};
    const cache = {};
    const jsx = (type, props, key) => React.createElement(type, { ...props, key });
    let sdkConfig = {};
    let sdkOptedOut = true;
    window.__sdk = { init: 0, optOut: 0, captured: [] };
    const sdk = {
      init: (_key, config) => { sdkConfig = config; window.__sdk.init++; return sdk; },
      set_config: config => { sdkConfig = { ...sdkConfig, ...config }; },
      opt_in_capturing: () => { sdkOptedOut = false; },
      opt_out_capturing: () => { sdkOptedOut = true; window.__sdk.optOut++; },
      stopSessionRecording: () => {},
      capture: (event, props) => {
        if (sdkOptedOut) return;
        const cleaned = sdkConfig.before_send({ event, properties: { ...props, distinct_id: '12345678-1234-1234-1234-123456789abc', $referrer: 'https://private.example/?birth_date=1992-06-15', name: 'Private Person' } });
        if (!cleaned) return;
        window.__sdk.captured.push(cleaned);
        fetch('https://analytics.example.test/e', { ...sdkConfig.fetch_options, method: 'POST', body: JSON.stringify(cleaned) }).catch(() => {});
      },
    };
    function load(file) {
      if (cache[file]) return cache[file].exports;
      const module = { exports: {} };
      cache[file] = module;
      const require = id => {
        if (id === 'react') return React;
        if (id === 'react/jsx-runtime') return { jsx, jsxs: jsx, Fragment: React.Fragment };
        if (id === 'next/link') return ({ href, children, ...props }) => React.createElement('a', { href, ...props }, children);
        if (id === 'next/navigation') return { usePathname: () => window.location.pathname };
        if (id === 'lucide-react') return new Proxy({}, { get: (_target, name) => name === '__esModule' ? true : () => React.createElement('svg', { width: 16, height: 16, 'aria-hidden': true }) });
        if (id === 'posthog-js') return { __esModule: true, default: sdk };
        const base = id.startsWith('@/') ? 'src/' + id.slice(2) : new URL(id, 'https://fixture/' + file).pathname.slice(1);
        const path = ['', '.ts', '.tsx'].map(ext => base + ext).find(path => sources[path]);
        if (!path) throw new Error('Unknown fixture import ' + id);
        return load(path);
      };
      new Function('require', 'module', 'exports', sources[file])(require, module, module.exports);
      return module.exports;
    }
    const provider = load('src/components/analytics/PostHogProvider.tsx');
    const client = load('src/lib/analytics/client.ts');
    const Page = load('src/app/privacy/page.tsx').default;
    const Google = load('src/components/analytics/GoogleAnalytics.tsx').GoogleAnalytics;
    const Meta = load('src/components/analytics/MetaPixel.tsx').MetaPixel;
    const FirstTouch = load('src/components/analytics/FirstTouch.tsx').default;
    const Referral = load('src/components/analytics/RefCapture.tsx').default;
    window.__action = () => {
      provider.track('calculator_result', { tool: 'fullchart', birth_date: '1992-06-15', name: 'Private Person', url: window.location.href });
      client.trackEvent('quiz_answer', { step_index: 2, value: 'private_name', email: 'private@example.test' }, { force: true });
    };
    window.__initialize = () => provider.initializePostHog();
    ReactDOM.createRoot(document.getElementById('app')).render(
      React.createElement(provider.PostHogProvider, null, React.createElement(Page), React.createElement(Google), React.createElement(Meta), React.createElement(FirstTouch), React.createElement(Referral))
    );
  `;
  const html = '<!doctype html><html><head><style>' + css.css + '</style></head><body><div id="app"></div><script>' +
    [react, dom, app].join('\n').replace(/<\/script/gi, '<\\/script') + '</script></body></html>';
  const server = createServer((_request, response) => { response.setHeader('Content-Type', 'text/html'); response.end(html); });
  await new Promise<void>(resolve => { server.listen(0, '127.0.0.1', resolve); });
  const port = (server.address() as { port: number }).port;
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const screenshotDir = mkdtempSync(join(tmpdir(), 'vedic-consent-browser-'));
  try {
    for (const width of [375, 1280]) {
      const context = await browser.newContext({ viewport: { width, height: 900 } });
      const requests: { url: string; body: string; referrer?: string }[] = [];
      await context.route('**/*', route => {
        const request = route.request();
        if (request.url().includes('/api/track') || request.url().includes('/api/events') || request.url().includes('analytics.example.test')) {
          requests.push({ url: request.url(), body: request.postData() ?? '', referrer: request.headers().referer });
          return route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
        }
        if (new URL(request.url()).hostname === '127.0.0.1') return route.continue();
        return route.abort();
      });
      const page = await context.newPage();
      const errors: string[] = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto('http://127.0.0.1:' + port + '/privacy', { waitUntil: 'networkidle' });
      await page.locator('#analytics-preferences').waitFor();
      await page.evaluate(() => { for (let index = 0; index < 100; index++) (window as unknown as { __action: () => void }).__action(); });
      expect(requests).toEqual([]);
      expect(await page.evaluate(() => ({ local: localStorage.length, session: sessionStorage.length, cookies: document.cookie }))).toEqual({ local: 0, session: 0, cookies: '' });
      expect(await page.evaluate(() => (window as unknown as { __sdk: { init: number } }).__sdk.init)).toBe(0);
      const checkbox = page.getByRole('checkbox', { name: /Usage analytics/ });
      await checkbox.check();
      expect(requests).toEqual([]);
      await page.getByRole('button', { name: 'Save choice' }).click();
      await page.waitForFunction(() => (window as unknown as { __sdk: { init: number } }).__sdk.init === 1);
      await page.evaluate(() => (window as unknown as { __action: () => void }).__action());
      await page.waitForTimeout(100);
      expect(requests.some(request => request.url.includes('/api/track') && request.body.includes('calculator_result'))).toBe(true);
      expect(requests.some(request => request.url.includes('/api/events') && request.body.includes('quiz_answer'))).toBe(true);
      expect(requests.some(request => request.url.includes('analytics.example.test'))).toBe(true);
      await page.evaluate(async () => {
        history.replaceState({}, '', '/privacy?birth_date=1992-06-15&email=private@example.test');
        await (window as unknown as { __initialize: () => Promise<void> }).__initialize();
        (window as unknown as { __action: () => void }).__action();
        localStorage.setItem('sb-auth-token', 'retain-auth');
        localStorage.setItem('vh_calculator_v1', 'retain-draft');
        document.cookie = 'sb-auth-cookie=retain; Path=/';
      });
      await page.waitForTimeout(100);
      expect(JSON.stringify(requests)).not.toMatch(/1992-06-15|Private Person|private_name|private@example.test/);
      expect(requests.every(request => !request.referrer)).toBe(true);
      await page.getByRole('button', { name: 'Turn off optional tracking' }).click();
      await page.waitForTimeout(100);
      const count = requests.length;
      await page.evaluate(() => { for (let index = 0; index < 100; index++) (window as unknown as { __action: () => void }).__action(); });
      await page.waitForTimeout(100);
      expect(requests).toHaveLength(count);
      expect(await page.evaluate(() => ({ auth: localStorage.getItem('sb-auth-token'), draft: localStorage.getItem('vh_calculator_v1'), sid: localStorage.getItem('vh_sid'), cookies: document.cookie })))
        .toEqual({ auth: 'retain-auth', draft: 'retain-draft', sid: null, cookies: 'sb-auth-cookie=retain' });
      expect(await page.evaluate(() => (window as unknown as { __sdk: { optOut: number } }).__sdk.optOut)).toBeGreaterThan(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
      expect(errors).toEqual([]);
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(100);
      await page.screenshot({ path: join(screenshotDir, 'privacy-' + width + '.png'), fullPage: true });
      console.log('PASS isolated React browser ' + width + ': 100 default events denied; explicit choice only; withdrawal denies another 100; no private URL/body/referrer; auth/draft preserved');
      await context.close();
    }
    console.log('Privacy browser screenshots: ' + screenshotDir);
  } finally {
    await browser.close();
    await new Promise<void>(resolve => { server.close(() => resolve()); server.closeAllConnections(); });
  }
});

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.restoreAllMocks(); });

async function modules() {
  return {
    consent: await import('@/lib/analytics/consent'),
    provider: await import('@/components/analytics/PostHogProvider'),
    client: await import('@/lib/analytics/client'),
    firstTouch: await import('@/components/analytics/FirstTouch'),
    referral: await import('@/components/analytics/RefCapture'),
  };
}

function fakeSdk(onInit?: () => void) {
  let config: Record<string, unknown> = {};
  const sent: Record<string, unknown>[] = [];
  const sdk = {
    init: vi.fn((_key: string, options: Record<string, unknown>) => { config = options; onInit?.(); return sdk; }),
    opt_in_capturing: vi.fn(),
    opt_out_capturing: vi.fn(),
    set_config: vi.fn(),
    stopSessionRecording: vi.fn(),
    capture: vi.fn((event: string, properties: Record<string, unknown>) => {
      const before = config.before_send as (event: { event: string; properties: Record<string, unknown> }) => Record<string, unknown> | null;
      const payload = before({ event, properties: {
        ...properties, distinct_id: '12345678-1234-1234-1234-123456789abc', token: 'legacy',
        $referrer: 'https://private.example/?email=secret', birth_date: '1992-06-15',
        $initial_current_url: 'https://private.example/report/secret-token?name=Private',
      } });
      if (payload) sent.push(payload);
    }),
  };
  return { sdk: sdk as unknown as PostHog, spies: sdk, sent, config: () => config };
}

describe('optional analytics consent', () => {
  it('denies 100 events on both endpoints and attribution storage by default', async () => {
    const { provider, client, consent, firstTouch, referral } = await modules();
    location.search = '?ref=ABC123&utm_source=google&birth_date=1992-06-15&email=private';
    const load = vi.fn();
    for (let index = 0; index < 100; index++) {
      provider.track('calculator_submitted', { tool: 'fullchart' });
      client.trackEvent('quiz_view', { step_index: 1 }, { force: true });
      firstTouch.captureFirstTouch();
      referral.captureReferral();
      client.captureAttribution('start');
      client.getSessionId();
    }
    await provider.initializePostHog(load);
    expect(consent.hasAnalyticsConsent()).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
    expect(load).not.toHaveBeenCalled();
    expect(local.setItem).not.toHaveBeenCalled();
    expect(session.setItem).not.toHaveBeenCalled();
    expect(cookieWrites).toEqual([]);
  });

  it.each(['true', '{}', '{"version":0,"analytics":true}', '{"version":1,"analytics":"true"}', 'broken'])('rejects non-choice consent value %s', async raw => {
    const { consent } = await modules();
    local.values.set(consent.ANALYTICS_CONSENT_KEY, raw);
    expect(consent.hasAnalyticsConsent()).toBe(false);
  });

  it('allows basic events only after choice and strips private data from requests', async () => {
    const { consent, provider, client } = await modules();
    consent.setAnalyticsConsent(true);
    location.pathname = '/report/secret-token';
    location.search = '?birth_date=1992-06-15&email=private@example.test';
    provider.track('calculator_result', { tool: 'fullchart', birth_date: '1992-06-15', city: 'Private City', href: '/report/secret-token', text: 'Private Person', reason: 'Private Person' });
    client.trackEvent('quiz_answer', { step_index: 2, value: 'private_name', birth_city: 'Private City', text: 'Private Person' }, { slug: 'private-token' });
    expect(fetch).toHaveBeenCalledTimes(2);
    const calls = vi.mocked(fetch).mock.calls;
    const first = JSON.parse(calls[0][1]!.body as string);
    const second = JSON.parse(calls[1][1]!.body as string);
    expect(first).toEqual({ name: 'calculator_result', path: '/account', props: { tool: 'fullchart' } });
    expect(second).toMatchObject({ name: 'quiz_answer', path: '/account', attribution: { landing: '/account' }, props: { step_index: 2 } });
    expect(JSON.stringify(calls)).not.toMatch(/secret-token|1992-06-15|Private Person|private_name|private@example|birth_city/);
    expect(calls.every(call => call[1]?.referrerPolicy === 'no-referrer')).toBe(true);
  });

  it('writes only bounded first-touch/referral cookies after consent', async () => {
    const { consent, firstTouch, referral } = await modules();
    consent.setAnalyticsConsent(true);
    location.pathname = '/q/private-token';
    location.search = '?utm_source=Private%20Person&utm_medium=email&utm_campaign=birth1992&ref=ABC123';
    firstTouch.captureFirstTouch();
    referral.captureReferral();
    const touch = JSON.parse(decodeURIComponent(cookies.get('vh_first_touch')!));
    expect(touch).toMatchObject({ s: 'other', m: 'email', c: '', r: '', l: '/quiz' });
    expect(cookies.get('vh_ref')).toBe('ABC123');
    expect(cookieWrites.every(value => value.includes('Max-Age=2592000'))).toBe(true);
    expect(cookieWrites.join('')).not.toMatch(/Private|birth1992|private-token/);
  });

  it('rejects malformed referral identifiers instead of converting private text into a code', async () => {
    const { consent, referral } = await modules();
    consent.setAnalyticsConsent(true);
    location.search = '?ref=private%40example.test';
    referral.captureReferral();
    expect(cookieWrites).toEqual([]);
  });

  it('withdraws synchronously and clears only known optional keys', async () => {
    const { consent, provider, client } = await modules();
    consent.setAnalyticsConsent(true);
    for (const key of ['vh_sid', 'vh_attr_v1', 'ph_test_posthog', '__ph_opt_in_out_project', '_ga_TEST']) local.values.set(key, 'optional');
    for (const key of ['vh_session_started', 'vh_dropoff_shown_v1']) session.values.set(key, 'optional');
    local.values.set('sb-auth-token', 'auth');
    local.values.set('vh_calculator_v1', 'birth draft');
    session.values.set('vh_onboard_draft', 'task draft');
    for (const key of ['vh_ref', 'vh_first_touch', '_fbp', '_ga', 'sb-auth-cookie']) cookies.set(key, key);
    consent.setAnalyticsConsent(false);
    for (let index = 0; index < 100; index++) { provider.track('page_view'); client.trackEvent('quiz_view', {}, { force: true }); }
    expect(fetch).not.toHaveBeenCalled();
    expect(Array.from(local.values.keys()).sort()).toEqual([consent.ANALYTICS_CONSENT_KEY, 'sb-auth-token', 'vh_calculator_v1'].sort());
    expect(Array.from(session.values.keys())).toEqual(['vh_onboard_draft']);
    expect(Array.from(cookies.keys())).toEqual(['sb-auth-cookie']);
  });

  it('disables replay/autocapture/identification and replaces SDK URL properties', async () => {
    const { consent, provider } = await modules();
    consent.setAnalyticsConsent(true);
    const fake = fakeSdk();
    await provider.initializePostHog(async () => ({ default: fake.sdk }));
    expect(fake.config()).toMatchObject({ persistence: 'memory', disable_persistence: true, autocapture: false, capture_pageview: false, capture_pageleave: false, disable_session_recording: true, person_profiles: 'never', save_referrer: false, save_campaign_params: false, advanced_disable_flags: true, disable_external_dependency_loading: true, request_batching: false, disable_beacon: true, api_transport: 'fetch', fetch_options: { referrerPolicy: 'no-referrer', keepalive: false } });
    expect(fake.spies.opt_in_capturing).toHaveBeenCalledWith({ captureEventName: false });
    expect(fake.sent).toHaveLength(1);
    expect(fake.sent[0]).toMatchObject({ event: '$pageview', properties: { $current_url: 'https://www.vedichour.com/', $pathname: '/' } });
    expect(JSON.stringify(fake.sent)).not.toMatch(/Private|secret-token|1992-06-15|referrer|initial_current/);
    consent.setAnalyticsConsent(false);
    expect((fake.config().fetch_options as RequestInit).signal?.aborted).toBe(true);
    expect(fake.spies.opt_out_capturing).toHaveBeenCalled();
    expect(fake.spies.stopSessionRecording).toHaveBeenCalled();
    provider.track('page_view');
    expect(fake.sent).toHaveLength(1);
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each(['/account/private', '/report/private', '/q/private', '/free-kundli'])('does not initialize the external SDK on %s', async pathname => {
    const { consent, provider } = await modules();
    consent.setAnalyticsConsent(true);
    location.pathname = pathname;
    const load = vi.fn();
    await provider.initializePostHog(load);
    expect(load).not.toHaveBeenCalled();
  });

  it.each(['?birth_date=1992-06-15&name=Private', '?token=private'])('does not load external analytics on a query-bearing public page %s', async search => {
    const { consent, provider } = await modules();
    consent.setAnalyticsConsent(true);
    location.search = search;
    const load = vi.fn();
    await provider.initializePostHog(load);
    expect(load).not.toHaveBeenCalled();
  });

  it('cannot reactivate from an import promise after withdrawal and a newer opt-in', async () => {
    const { consent, provider } = await modules();
    consent.setAnalyticsConsent(true);
    const fake = fakeSdk();
    let resolve!: (value: { default: PostHog }) => void;
    const pending = provider.initializePostHog(() => new Promise(done => { resolve = done; }));
    consent.setAnalyticsConsent(false);
    consent.setAnalyticsConsent(true);
    resolve({ default: fake.sdk });
    await pending;
    expect(fake.spies.init).not.toHaveBeenCalled();
    expect(fake.spies.opt_in_capturing).not.toHaveBeenCalled();
    expect(fake.sent).toEqual([]);
  });

  it('stops an SDK if withdrawal occurs inside initialization', async () => {
    const { consent, provider } = await modules();
    consent.setAnalyticsConsent(true);
    const fake = fakeSdk(() => consent.setAnalyticsConsent(false));
    await provider.initializePostHog(async () => ({ default: fake.sdk }));
    expect(fake.spies.opt_in_capturing).not.toHaveBeenCalled();
    expect(fake.spies.opt_out_capturing).toHaveBeenCalled();
    expect(fake.sent).toEqual([]);
  });

  it('supports an explicit tab-only choice when storage is blocked, never inferred consent', async () => {
    const { consent } = await modules();
    local.getItem.mockImplementation(() => { throw new Error('denied'); });
    local.setItem.mockImplementation(() => { throw new Error('denied'); });
    expect(consent.hasAnalyticsConsent()).toBe(false);
    expect(consent.setAnalyticsConsent(true)).toEqual({ enabled: true, persistent: false });
    expect(consent.hasAnalyticsConsent()).toBe(true);
    consent.setAnalyticsConsent(false);
    expect(consent.hasAnalyticsConsent()).toBe(false);
  });

  it('does not promise successful removal when writes succeed but removal fails', async () => {
    const { consent } = await modules();
    local.values.set('vh_sid', 'old');
    local.removeItem.mockImplementation(() => { throw new Error('blocked removal'); });
    expect(() => consent.setAnalyticsConsent(false)).not.toThrow();
    expect(consent.hasAnalyticsConsent()).toBe(false);
    expect(local.values.get('vh_sid')).toBe('old');
    const source = readFileSync('src/components/analytics/AnalyticsPreferences.tsx', 'utf8');
    expect(source).toContain('where the browser permits');
    expect(source).not.toContain('Known optional tracking storage cleared');
  });

  it.each([{ doNotTrack: '1' }, { globalPrivacyControl: true }])('respects browser privacy signals %j', async signal => {
    const { consent, provider, client } = await modules();
    vi.stubGlobal('navigator', signal);
    expect(consent.setAnalyticsConsent(true).enabled).toBe(false);
    provider.track('page_view');
    client.trackEvent('quiz_view');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('responds to cross-tab withdrawal', async () => {
    const { consent } = await modules();
    consent.setAnalyticsConsent(true);
    const cleanup = vi.fn();
    consent.registerAnalyticsCleanup(cleanup);
    const change = vi.fn();
    const unsubscribe = consent.subscribeAnalyticsConsent(change);
    local.values.set(consent.ANALYTICS_CONSENT_KEY, '{"version":1,"analytics":false}');
    const event = new Event('storage');
    Object.defineProperty(event, 'key', { value: consent.ANALYTICS_CONSENT_KEY });
    browser.dispatchEvent(event);
    expect(consent.hasAnalyticsConsent()).toBe(false);
    expect(cleanup).toHaveBeenCalled();
    expect(change).toHaveBeenCalled();
    unsubscribe();
  });

  it('aborts pending optional first-party requests on withdrawal', async () => {
    const { consent, provider } = await modules();
    consent.setAnalyticsConsent(true);
    vi.mocked(fetch).mockImplementation(() => new Promise(() => {}));
    provider.track('page_view');
    const signal = vi.mocked(fetch).mock.calls[0][1]!.signal!;
    expect(signal.aborted).toBe(false);
    consent.setAnalyticsConsent(false);
    expect(signal.aborted).toBe(true);
  });

  it('keeps GA and Meta disabled and revokes legacy loaded SDKs', async () => {
    const { consent } = await modules();
    const google = await import('@/components/analytics/GoogleAnalytics');
    const meta = await import('@/components/analytics/MetaPixel');
    const gtag = vi.fn();
    const fbq = Object.assign(vi.fn(), { queue: [['track', 'PageView']] });
    browser.gtag = gtag;
    browser.fbq = fbq;
    consent.setAnalyticsConsent(true);
    google.disableGoogleAnalytics();
    meta.disableMetaPixel();
    meta.fbqTrack('Purchase', { birth_date: '1992-06-15' });
    expect(browser['ga-disable-G-TEST0001']).toBe(true);
    expect(gtag).toHaveBeenCalledWith('consent', 'update', expect.objectContaining({ analytics_storage: 'denied', ad_storage: 'denied' }));
    expect(fbq).toHaveBeenCalledTimes(1);
    expect(fbq).toHaveBeenCalledWith('consent', 'revoke');
    expect(fbq.queue).toEqual([]);
    expect(fetch).not.toHaveBeenCalled();
    expect(readFileSync('src/components/analytics/MetaPixel.tsx', 'utf8')).not.toMatch(/<Script|<img|<noscript/);
    expect(readFileSync('src/components/analytics/GoogleAnalytics.tsx', 'utf8')).not.toContain('<Script');
  });

  it('does not solicit automatic drop-off feedback or pretend it was received', async () => {
    const prompt = await import('@/components/analytics/DropoffPrompt');
    expect(prompt.canShowDropoff('paywall_exit')).toBe(false);
    expect(prompt.DropoffPrompt({ context: 'paywall_exit', onClose: vi.fn() })).toBeNull();
    const { consent } = await modules();
    consent.setAnalyticsConsent(true);
    expect(prompt.canShowDropoff('paywall_exit')).toBe(false);
    expect(prompt.DropoffPrompt({ context: 'paywall_exit', onClose: vi.fn() })).toBeNull();
    expect(session.setItem).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('uses code-backed privacy wording and exposes existing data controls', () => {
    const source = readFileSync('src/app/privacy/page.tsx', 'utf8');
    expect(source).toContain('<AnalyticsPreferences />');
    expect(source).toContain('seven-day');
    expect(source).toContain('OpenAI, Anthropic, xAI (Grok), then DeepSeek');
    expect(source).toContain('OpenStreetMap Nominatim');
    expect(source).toContain('href="/account"');
    expect(source).toContain('href="/chart-privacy"');
    expect(source).not.toMatch(/No advertising or third-party tracking cookies|all bound by data processing|do not use it for model training|7 years|within 30 days|encrypted storage/);
  });
});
