import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'docs/audits/customer-experience-overhaul/2026-10-15');
const baseline = 'dfb774a972430790fa565dfe5d4529c2e5d3796f';
const args = process.argv.slice(2);
let check = false, postPath = null;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--check') check = true;
  else if (args[i] === '--post') {
    assert(!postPath && args[i + 1] && !args[i + 1].startsWith('--'), '--post requires one verification receipt path');
    postPath = args[++i];
  } else assert.fail(`Unsupported argument: ${args[i]}`);
}
const dimensions = [
  ['purpose', 15], ['fit', 10], ['action', 10], ['result', 15], ['effort', 15],
  ['continuity', 10], ['pricing', 10], ['visual', 5], ['trust', 5], ['recovery', 5],
];
assert.equal(dimensions.reduce((n, [, w]) => n + w, 0), 100);
const protocol = readFileSync(path.join(out, 'SCORING.md'), 'utf8');
for (const [id, weight] of dimensions) {
  const row = protocol.split(/\r?\n/).find((line) => line.startsWith(`| ${id} |`));
  assert(row, `Missing protocol dimension ${id}`);
  assert.equal(Number(row.split('|')[3].trim()), weight, `Protocol weight differs for ${id}`);
}
assert(protocol.includes('Rubric frozen') && protocol.includes('Unknown = blank score'));

const sourceCache = new Map();
function source(p) {
  if (!sourceCache.has(p)) sourceCache.set(p, execFileSync('git', ['show', `${baseline}:${p}`], { cwd: root, encoding: 'utf8', maxBuffer: 8e6, stdio: ['ignore','pipe','ignore'] }));
  return sourceCache.get(p);
}
const registry = [
  ['E01', 'src/components/landing/Hero.tsx', 'See today', 'Free-windows CTA on homepage'],
  ['E02', 'src/lib/pricing.ts', "UNLOCK_FREE_HREF = '/free-kundli'", 'Free CTA targets calculator; subscription definitions'],
  ['E03', 'src/components/tools/ChartTool.tsx', 'doshas_locked', 'Calculator facts, default noon, email lock, transient result and session handoff'],
  ['E04', 'src/components/forms/BirthDetailsInput.tsx', 'stay accurate', 'Noon shortcut overstates time-independent precision; first city result selected'],
  ['E05', 'src/app/api/tools/chart/route.ts', 'birth_time: string', 'API accepts time without precision metadata; facts endpoint'],
  ['E06', 'src/app/api/tools/chart/route.ts', "source: 'calculator_dosha'", 'Email reveal writes newsletter subscriber record'],
  ['E07', 'src/lib/onboard/draft.ts', 'sessionStorage.setItem', 'Session-only onboarding input draft; not calculator result retrieval'],
  ['E08', 'src/app/start/_Quiz.tsx', 'Pre-fill from', 'Quiz progress restore and latest-report renewal prefill'],
  ['E09', 'src/app/pricing/page.tsx', 'Nothing is charged automatically', 'Manual renewal copy and public subscription pricing'],
  ['E10', 'src/lib/priceBook.ts', "ACTIVE_PRICE_SET: PriceSetId = 'recommended'", 'Active recommended price set; older cost assumptions remain documentation'],
  ['E11', 'src/app/api/ziina/create-intent/route.ts', 'SUBSCRIPTION_ONLY', 'Retired one-time sales rejected; configuration and ownership guards'],
  ['E12', 'src/app/api/user/charts/route.ts', 'requireAuth(request)', 'Account-scoped saved charts; table failures become empty arrays'],
  ['E13', 'src/app/api/account/export/route.ts', 'requireAuth(req)', 'Owner-scoped data export API; no execution here'],
  ['E14', 'src/app/api/account/delete/route.ts', 'DELETE_INCOMPLETE', 'Explicit confirmation and core cleanup failure handling; not transactional'],
  ['E15', 'src/app/methodology/page.tsx', 'has not been tested for predicting events', 'Public method and interpretive-limit disclosure'],
  ['E16', 'src/lib/seo/aiVisibility.ts', 'PRIVATE_PATHS', 'Crawler boundaries and assistant text; full-results claim conflicts with lock'],
  ['E17', 'src/components/analytics/PostHogProvider.tsx', 'mask_all_text: true', 'Source instrumentation and masking; event delivery not verified'],
  ['E18', 'src/app/login/_LoginForm.tsx', 'handlePasswordReset', 'Authentication, recovery and preserved next route'],
  ['E19', 'src/components/report/GeneratingScreen.tsx', 'highWaterMarkRef', 'Progress display with telemetry and feedback; not completion proof'],
  ['E20', 'src/app/not-found.tsx', '404', 'Baseline route inventory has no help page; generic not-found fallback'],
  ['E21', 'src/app/kundali/KundaliForm.tsx', '401/402', 'Full compute attempted then facts teaser; form/result not restored'],
  ['E22', 'src/app/synastry/SynastryForm.tsx', 'KOOTAS', 'Two birth-detail forms; free total then subscriber factor breakdown'],
  ['E23', 'src/app/chart-privacy/page.tsx', 'Only if you tick the second box', 'Quiz notice separates service email and optional marketing'],
  ['E24', 'src/components/landing/Testimonials.tsx', 'Sample prose', 'Excerpts labelled samples, not customer research'],
  ['E25', 'src/app/api/now/route.ts', 'DUBAI_TZ_MIN', 'Timing endpoint current-location/timezone fallback requires verification'],
  ['E26', 'src/components/shared/ShareResult.tsx', 'share', 'Browser sharing source; privacy/content behavior requires testing'],
  ['E27', 'src/app/api/report/pdf/route.tsx', 'requireAuth', 'Authenticated PDF adapter; rendering/delivery unverified'],
  ['E28', 'src/app/api/reports/[id]/calendar/route.ts', 'GET', 'Calendar export adapter; timezone delivery unverified'],
  ['E29', 'src/app/(app)/dashboard/page.tsx', 'Request account deletion', 'Dashboard uses email deletion path despite API implementation'],
  ['E30', 'src/content/blog/kundli-without-birth-time.ts', 'birth time', 'Existing time-uncertainty education; article-to-tool consistency required'],
  ['E31', 'src/app/privacy/page.tsx', 'Your Rights', 'General policy lists processors, rights and browser cookie choices; claims are not verified compliance'],
  ['E32', 'src/app/hora/page.tsx', 'How long is a hora?', 'Public hora definition distinguishes sunrise-based hora from clock hour'],
  ['E33', 'src/app/what-we-never-say/page.tsx', 'A guarantee of any outcome', 'Public refusal boundary for consequential outcomes'],
  ['E34', 'src/app/sample-report/page.tsx', 'Sample Report: A Full 30-Day Forecast', 'Actual public sample route and output import, not a testimonial'],
];
const evidence = new Map();
for (const [id, p, marker, claim] of registry) {
  const s = source(p);
  const lines = s.split(/\r?\n/);
  const index = lines.findIndex((line) => line.includes(marker));
  assert(index >= 0, `${id}: anchor absent: ${p}: ${marker}`);
  evidence.set(id, { id, anchor: `${baseline}:${p}:${index + 1}`, marker, claim, sha256: createHash('sha256').update(s).digest('hex'), type: 'baseline-source' });
}
const baselineFiles = execFileSync('git', ['ls-tree', '-r', '--name-only', baseline, 'src/app'], { cwd: root, encoding: 'utf8' }).split(/\r?\n/);
assert(!baselineFiles.some((p) => /(?:\([^/]+\)\/)?help\/page\./.test(p)), 'Revisit baseline help absence');
evidence.set('U01', { id: 'U01', anchor: 'not-executed:rendered-accessibility', claim: 'No complete visual, screen-reader, zoom, motion or accessibility evaluation' });
evidence.set('U02', { id: 'U02', anchor: 'not-executed:account-provider-result', claim: 'Runtime account, paid result, export or provider operation not executed for this scenario' });
evidence.set('U03', { id: 'U03', anchor: 'owner-brief:section-12', claim: 'UAE licence/permit and provider eligibility unresolved; no activation authority' });
const browserPath = 'artifacts/customer-experience/before/journeys.json';
const browser = JSON.parse(readFileSync(path.join(root, browserPath), 'utf8'));
assert.equal(browser.journeys.length, 29);
assert.equal(browser.journeys.filter((j) => j.passed).length, 27);
assert.equal(browser.counts.realUsers, 0);
const api = browser.journeys.find((j) => j.id === 'before-public-chart-api');
assert.equal(api.status, 200);
assert.equal(api.body.doshas_locked, true);
assert.equal(api.body.doshas, null);
for (const width of [1440, 390]) {
  const j = browser.journeys.find((j) => j.id === `before-${width}-/free-kundli`);
  assert.deepEqual(j.timeDefaults, ['12:00']);
  assert.equal(browser.journeys.find((j) => j.id === `before-${width}-/help`).status, 404);
}
const browserDigest = createHash('sha256').update(readFileSync(path.join(root, browserPath))).digest('hex');
for (const [id, selector, claim] of [
  ['B01', 'before-public-chart-api', 'One fictional public chart API returned facts and locked null doshas; not reference-calculation validation'],
  ['B02', 'before-{1440,390}-/free-kundli', 'Initial time observed 12:00 at both tested widths'],
  ['B03', 'before-{1440,390}-/help', 'Help route returned 404 at both tested widths'],
  ['B04', 'journeys[type=public-route-navigation]', '28 route navigations, 26 basic passes; no full funnel completion or accessibility proof'],
]) evidence.set(id, { id, anchor: `${browserPath}#${selector}`, claim, sha256: browserDigest, type: 'executed-browser-primary', executed_at: browser.executedAt });

const task = (intent, entry, intended, success, kind) => ({ intent, entry, intended, success, kind });
const state = (name, device, visit, information, constraint, flags = [], channel = null) => ({ name, device, visit, information, constraint, flags, channel });
const context = (id, group, name, awareness, privacy, states, tasks) => ({ id, group, name, awareness, privacy, states, tasks });
const contexts = [
  context('A01', 'A', 'Curious novice choosing a first action', 'unaware of Vedic terms', 'avoid an unnecessary account', [
    state('Direct visitor with exact records', 'desktop', 'first', 'exact date/time/city', 'five minutes; unfamiliar vocabulary', [], 'direct'),
    state('Friend-referred phone visitor', 'mobile', 'first', 'date/city; time unknown', 'two minutes; wants a safe first step', ['uncertain', 'short'], 'friend'),
    state('Social referral expecting instant windows', 'mobile', 'first', 'exact date/time/city', 'one minute; prior promise of free daily timing', ['windows', 'short'], 'social-hypothetical'),
    state('Same-tab return after interruption', 'desktop', 'returning', 'previous calculator inputs in session draft', 'resume without retyping', ['refresh']),
  ], [
    task('offer', '/', 'Identify what VedicHour gives free before entering details', 'Distinguish calculated facts from personalized paid timing', 'discover'),
    task('first-chart', '/free-kundli', 'Start a first chart without creating an account', 'See required inputs and receive chart facts', 'facts'),
    task('vocabulary', '/free-kundli', 'Understand the difference between Lagna and Moon sign', 'Explain both labels without confusing them with a sun sign', 'facts'),
    task('example', '/sample-report', 'Inspect an example before providing birth data', 'Recognize sample context and actual output format', 'sample'),
    task('next-action', '/', 'Choose between a chart fact and a full forecast', 'Reach the relevant tool without mistaking a subscription for free timing', 'discover'),
  ]),
  context('A02', 'A', 'Self-reflection reader exploring calculated facts', 'problem aware; beginner', 'keep reflection private', [
    state('Complete records and quiet session', 'desktop', 'first', 'exact date/time/city', 'ten minutes for self-reflection'),
    state('Approximate time from family', 'mobile', 'first', 'date/city and two-hour time range', 'avoid false precision', ['uncertain']),
    state('Storage-restricted browsing', 'mobile', 'first', 'exact date/time/city', 'do not retain personal details', ['private', 'storage']),
    state('Return after a week', 'desktop', 'returning', 'previous anonymous calculation; no active tab', 'retrieve earlier facts', ['newsession']),
  ], [
    task('first-chart', '/free-kundli', 'Read the five-field chart snapshot for reflection', 'Separate calculated placements from interpretation', 'facts'),
    task('moon', '/moon-sign-calculator', 'Find sidereal Moon sign rather than Western sun sign', 'Read a named Moon sign with its interpretive limits', 'facts'),
    task('nakshatra', '/nakshatra-finder', 'Read a birth star and pada as distinct fields', 'Understand what star and subdivision refer to', 'facts'),
    task('dasha', '/vimshottari-dasha-calculator', 'Locate the current major and minor life period', 'Read dated periods without treating them as guaranteed events', 'facts'),
    task('correction', '/free-kundli', 'Correct a birth city after seeing unexpected chart facts', 'Recalculate using the corrected city and replace stale output', 'facts'),
  ]),
  context('A03', 'A', 'Incomplete or uncertain birth details', 'aware of chart but missing records', 'no pressure to invent information', [
    state('No birth time available', 'mobile', 'first', 'date and city only', 'explicitly reject silently assumed noon', ['uncertain']),
    state('Approximate evening time', 'desktop', 'first', 'date/city and 18:00-20:00 range', 'see sensitivity rather than exact claim', ['uncertain']),
    state('Ambiguous birthplace name', 'desktop', 'first', 'exact date/time; city shared by two countries', 'choose the intended country', ['city']),
    state('Birth date not available yet', 'mobile', 'returning', 'city and time; date missing', 'preserve what is known and explain what is required', ['missing', 'refresh']),
  ], [
    task('moon', '/moon-sign-calculator', 'Check whether Moon sign can be stated with current information', 'Show uncertainty when an unverified time could affect the sign', 'facts'),
    task('nakshatra', '/nakshatra-finder', 'Find whether a birth-star subdivision is supported by available detail', 'Do not imply a stable pada without sensitivity evidence', 'facts'),
    task('first-chart', '/free-kundli', 'Request a chart summary with incomplete details', 'Explain which fields cannot responsibly be calculated', 'facts'),
    task('dasha', '/vimshottari-dasha-calculator', 'Request a dated period sequence despite uncertain inputs', 'Qualify period precision and avoid invented dates', 'facts'),
    task('lagna', '/lagna-calculator', 'Ask for an ascendant when the exact input is not established', 'Require or qualify exact time rather than using default noon', 'facts'),
  ]),
  context('A04', 'A', 'Experienced chart reader checking method consistency', 'solution aware; Vedic terminology fluent', 'share no account data during comparison', [
    state('Second-tool comparison', 'desktop', 'first', 'exact chart records and a Lahiri reference', 'check like-for-like methods'),
    state('Boundary birth minute', 'desktop', 'first', 'exact time close to an ascendant boundary', 'precision and timezone must be explicit', ['boundary']),
    state('Corrected source record on return', 'mobile', 'returning', 'new birth time replaces earlier calculation', 'avoid stale placements', ['refresh']),
    state('Method-first creator referral', 'tablet', 'first', 'date/city and uncertain time', 'cannot accept generic accuracy claim', ['uncertain'], 'professional-creator'),
  ], [
    task('method', '/methodology', 'Identify the ayanamsa and house system for comparison', 'Find Lahiri and whole-sign assumptions without claiming predictive proof', 'method'),
    task('lagna', '/lagna-calculator', 'Compare ascendant degree against a reference chart', 'Expose the degree and qualify unvalidated numerical parity', 'facts'),
    task('dasha', '/vimshottari-dasha-calculator', 'Compare major/minor period boundary dates', 'Make date sequence readable and state calculation assumptions', 'facts'),
    task('chart-depth', '/free-kundli', 'Look for all planetary house placements beyond the snapshot', 'Understand the scope difference between facts and a deep reading', 'deep'),
    task('correction', '/free-kundli', 'Repeat a calculation after switching reference birthplace', 'Use corrected location rather than stale coordinates', 'facts'),
  ]),
  context('A05', 'A', 'Skeptical visitor comparing credibility and scope', 'comparison aware; skeptical', 'inspect policies before disclosure', [
    state('Branded search on desktop', 'desktop', 'first', 'no birth details supplied yet', 'evaluate product scope first', [], 'branded-search'),
    state('Assistant recommendation hypothesis', 'mobile', 'first', 'exact date/time/city', 'check claims rather than trust referral', ['assistant']),
    state('Pricing bookmark return', 'desktop', 'returning', 'previous offer remembered; no account', 'distinguish current from legacy pricing', ['newsession']),
    state('Privacy-first social visitor', 'mobile', 'first', 'date/city; no email permission', 'do not trade email for an allegedly free result', ['private'], 'social-hypothetical'),
  ], [
    task('method', '/methodology', 'Check whether computed astronomy is confused with prediction accuracy', 'Find explicit limitation and calculation/AI distinction', 'method'),
    task('example', '/sample-report', 'Check whether a showcased reading is a customer testimonial', 'Recognize example labels rather than fabricated social proof', 'sample'),
    task('availability', '/pricing', 'Distinguish free facts, account features and paid availability', 'See what is available now and no eligibility assumption', 'pricing'),
    task('effort-expectation', '/', 'Check the claimed time to obtain a useful first result', 'Know inputs and output before relying on a minute estimate', 'discover'),
    task('privacy', '/chart-privacy', 'Check what saving a chart permits and how to refuse marketing', 'Separate service-link consent from optional marketing consent', 'privacy'),
  ]),
  context('B01', 'B', 'Quick everyday timing reader', 'timing problem aware', 'reuse only permitted details', [
    state('Free first-time meeting planner', 'mobile', 'first', 'exact date/time/city', 'one minute to choose a call window', ['windows', 'short']),
    state('Subscriber same-device return', 'desktop', 'returning', 'existing account and forecast', 'avoid repeating birth details', ['account']),
    state('Reader travelling to another timezone', 'mobile', 'returning', 'saved chart; changed current city', 'do not reuse birth-city timezone', ['account', 'travel']),
    state('Slow mobile connection', 'mobile', 'first', 'exact date/time/city', 'two minutes; intermittent loading', ['slow', 'short']),
  ], [
    task('daily-timing', '/', 'Find a personally relevant window for a routine call today', 'Do not confuse free chart facts with personal hourly timing', 'forecast'),
    task('daily-timing', '/dashboard', 'Read the current-hour summary of an existing forecast', 'Show chart/date/timezone context and current window', 'saved'),
    task('day-choice', '/sample-report', 'Compare two hourly bands before starting a forecast', 'See sample status and understand score meaning', 'sample'),
    task('date-context', '/dashboard', 'Confirm whether displayed timing applies to today or an older report', 'Expose date range and renewal status without assuming currentness', 'saved'),
    task('timing-method', '/hora', 'Understand why hora and a clock hour are not always the same', 'Read explanation then find the appropriate product action', 'method'),
  ]),
  context('B02', 'B', 'Career or decision reflection without guaranteed outcomes', 'problem aware; motivated', 'do not disclose employer or salary', [
    state('Interview preparation on phone', 'mobile', 'first', 'exact date/time/city; no account', 'three minutes; needs reflection not certainty'),
    state('Subscribed month-planning return', 'desktop', 'returning', 'saved report and account', 'compare weekly and monthly context', ['account']),
    state('Ambiguous source time', 'desktop', 'first', 'date/city; time recalled approximately', 'avoid precise advice from uncertain inputs', ['uncertain']),
    state('Anxious ad-referred visitor', 'mobile', 'first', 'exact chart records', 'hypothetical ad promises a good moment now', ['windows', 'short']),
  ], [
    task('career-reflection', '/start', 'Request timing reflection for an interview without employer details', 'Keep questions proportionate and avoid job-outcome guarantees', 'forecast'),
    task('weekly-context', '/sample-report', 'Inspect how a week-level theme differs from a single hourly rating', 'Understand scale and sample limitations', 'sample'),
    task('monthly-context', '/pricing', 'Check whether a month outlook fits a one-off career question', 'Understand subscription scope without pressure to purchase', 'pricing'),
    task('dasha', '/vimshottari-dasha-calculator', 'Read the current period as reflective career context', 'Do not treat a dated period as proof of employment outcome', 'facts'),
    task('safe-boundary', '/methodology', 'Check whether timing can substitute for financial advice on quitting', 'Explicitly rule out authoritative financial advice', 'method'),
  ]),
  context('B03', 'B', 'Returning reader retrieving and taking output away', 'product aware; prior use', 'private reports must stay owner-scoped', [
    state('Active account on original desktop', 'desktop', 'returning', 'authenticated account; saved report', 'retrieve without re-entry', ['account']),
    state('New phone with expired session', 'mobile', 'returning', 'remembered login and saved URL', 'sign in and preserve the intended destination', ['account', 'expired', 'crossdevice']),
    state('Anonymous old calculator bookmark', 'desktop', 'returning', 'prior free facts; tab closed days ago', 'recover previous result without account', ['newsession']),
    state('Export on unreliable connection', 'mobile', 'returning', 'account and completed saved report', 'do not duplicate generation on retry', ['account', 'slow']),
  ], [
    task('retrieve', '/dashboard', 'Find the most recent completed forecast', 'Retrieve an owner-scoped report with identifiable date range', 'saved'),
    task('retrieve-chart', '/dashboard', 'Find a previously saved standalone Kundali', 'List the correct chart rather than an empty-state caused by table failure', 'saved'),
    task('pdf', '/dashboard', 'Download a reading for offline review', 'Generate a readable PDF for the owned completed report', 'export'),
    task('calendar', '/dashboard', 'Add a chosen timing window to a calendar', 'Export correctly zoned owned events without regenerating the report', 'calendar'),
    task('auth-recovery', '/login', 'Recover access after forgetting a password', 'Request a reset and return to the intended private result', 'auth'),
  ]),
  context('B04', 'B', 'Returning reader correcting reusable information', 'product aware', 'retain only chosen profile fields', [
    state('Signed-in changed birth record', 'desktop', 'returning', 'saved profile and corrected birth minute', 'avoid reuse of stale input', ['account', 'refresh']),
    state('Changed current location while travelling', 'mobile', 'returning', 'saved birth data; current city changed', 'separate natal coordinates from timing location', ['account', 'travel']),
    state('First use with reusable records', 'desktop', 'first', 'exact date/time/city in another tool', 'understand optional saving before account setup'),
    state('Shared-device sign-out and return', 'mobile', 'returning', 'prior account; no storage permission', 'no personal data left for another user', ['private', 'storage', 'expired']),
  ], [
    task('profile-correction', '/dashboard', 'Update default birth details used by onboarding', 'Reuse the corrected values and expose which report remains unchanged', 'account'),
    task('city-correction', '/free-kundli', 'Recompute facts after correcting country of birth', 'Discard stale coordinates and explain the new result', 'facts'),
    task('renewal', '/start', 'Start a fresh period without repeating permitted birth inputs', 'Prefill prior details but allow correction before generation', 'forecast'),
    task('location', '/dashboard', 'Check the timezone used for current-hour reading', 'Display the chosen current city/offset rather than silently defaulting', 'saved'),
    task('data-control', '/dashboard', 'Remove or change reusable details instead of deleting the account', 'Understand persistence scope and available correction controls', 'account'),
  ]),
  context('B05', 'B', 'Interrupted report generation and renewal recovery', 'product aware; stuck', 'no repeated charge or unrelated data disclosure', [
    state('Provider timeout during existing report', 'desktop', 'returning', 'account and pending report ID', 'recover from wait without starting a duplicate', ['account', 'timeout']),
    state('Refresh after progress appeared', 'mobile', 'returning', 'known report ID and active account', 'preserve progress and route', ['account', 'refresh']),
    state('Session expiry during wait', 'mobile', 'returning', 'pending result URL; expired login', 'reauthenticate without discarding context', ['account', 'expired']),
    state('Uncertain historical checkout return', 'desktop', 'returning', 'owned report ID; payment confirmation unknown', 'inspect status only; never initiate another charge', ['account', 'payment']),
  ], [
    task('generation-recovery', '/dashboard', 'Find a pending report after leaving its waiting screen', 'Resume the owned report rather than recreate it', 'recovery'),
    task('generation-status', '/dashboard', 'Understand whether generation failed or is still running', 'Show actionable status without confusing telemetry with progress', 'recovery'),
    task('auth-recovery', '/login', 'Restore access to the interrupted report', 'Preserve a safe intended report destination across login', 'auth'),
    task('payment-status', '/dashboard', 'Resolve a historical uncertain checkout state without paying again', 'Read/reconcile status with ownership and no duplicate sale', 'payment'),
    task('support', '/help', 'Find task-specific help for a stuck report', 'Reach a working help page with recovery instructions', 'help'),
  ]),
  context('C01', 'C', 'Consenting partners exploring compatibility', 'problem aware; beginner', 'partner birth data requires permission', [
    state('Two complete consenting records', 'desktop', 'first', 'both exact dates/times/cities; permission granted', 'understand score before deeper analysis'),
    state('One partner time unknown', 'mobile', 'first', 'two dates/cities; only one exact time', 'no blanket precision claim', ['uncertain']),
    state('One partner not yet consenting', 'desktop', 'first', 'own record only; partner record not authorized', 'inspect an example without entering third-party data', ['partnerprivacy']),
    state('Return to earlier saved matching result', 'mobile', 'returning', 'account and saved pair result', 'retrieve without entering both sets again', ['account']),
  ], [
    task('compatibility', '/synastry', 'Calculate a free compatibility total for a permitted pair', 'Show free score without implying relationship certainty', 'partner'),
    task('factor-breakdown', '/synastry', 'Identify which eight factors contribute to the total', 'Distinguish available total from subscriber-only factors', 'partner'),
    task('safe-boundary', '/methodology', 'Check whether a compatibility score guarantees a marriage outcome', 'Find a clear interpretive rather than deterministic life-outcome boundary', 'method'),
    task('partner-input', '/synastry', 'Correct only the second partner city before recalculation', 'Keep first partner details and replace stale second coordinates', 'partner'),
    task('retrieve-pair', '/dashboard', 'Locate an earlier saved pair reading', 'Retrieve only owned saved relationship data', 'saved'),
  ]),
  context('C02', 'C', 'Specific chart-factor search visitor', 'specific-factor aware', 'no surprise email capture', [
    state('Problem-search exact-input visitor', 'desktop', 'first', 'exact date/time/city', 'wants the searched factor only'),
    state('Privacy-conscious factor visitor', 'mobile', 'first', 'exact record; declines email', 'free means no undisclosed address gate', ['private']),
    state('Unknown-time factor visitor', 'mobile', 'first', 'date/city only', 'expect uncertainty appropriate to factor', ['uncertain']),
    state('Returning factor checker', 'desktop', 'returning', 'previous calculator result; new browser session', 'retrieve rather than enter again', ['newsession']),
  ], [
    task('manglik', '/manglik-dosha-calculator', 'Check the Manglik verdict promised by the entry page', 'Get a qualified verdict without an undisclosed marketing gate', 'verdict'),
    task('sade-sati', '/sade-sati-calculator', 'Check the current Sade Sati phase', 'Use a current Saturn transit and explain pending data honestly', 'verdict'),
    task('kaal-sarp', '/kaal-sarp-dosha-calculator', 'Check whether the Kaal Sarp condition is reported', 'Distinguish a calculated flag from a frightening prediction', 'verdict'),
    task('moon', '/moon-sign-calculator', 'Find Moon sign from a factor-specific search result', 'Reach the requested fact rather than a long unrelated quiz', 'facts'),
    task('factor-breakdown', '/synastry', 'Understand whether a Nadi factor can be inspected for two records', 'Explain free score versus locked factor-level analysis', 'partner'),
  ]),
  context('C03', 'C', 'Anxious family or relationship reader', 'problem aware; anxious', 'private concerns and no coercive disclosure', [
    state('Low-score concern from family', 'mobile', 'first', 'two permitted exact records', 'needs non-frightening context, not pressure'),
    state('Urgent relationship certainty request', 'mobile', 'first', 'own exact record only', 'cannot treat astrology as proof of infidelity', ['short']),
    state('Missing time and fearful terminology', 'desktop', 'first', 'date/city only; worried about doshas', 'no fabricated certainty', ['uncertain']),
    state('Returning reader unwilling to give email', 'desktop', 'returning', 'previous anonymous calculation', 'do not imply risk to force reveal', ['private', 'newsession']),
  ], [
    task('compatibility', '/synastry', 'Read a low total without treating it as a prohibition on marriage', 'Receive proportionate interpretation and no guaranteed outcome', 'partner'),
    task('manglik', '/manglik-dosha-calculator', 'Interpret a dosha label without a threat or forced disclosure', 'See contextual limits instead of fear-based conversion', 'verdict'),
    task('safe-boundary', '/what-we-never-say', 'Check whether the platform can prove infidelity or death timing', 'Decline consequential certainty and offer a safe scope explanation', 'method'),
    task('safe-boundary', '/methodology', 'Check whether a reading should replace medical advice about pregnancy', 'State that medical decisions are outside authoritative astrology scope', 'method'),
    task('support', '/help', 'Find help interpreting an upsetting relationship reading', 'Reach proportionate task-based support without a sales detour', 'help'),
  ]),
  context('C04', 'C', 'Depth-seeking relationship or natal reader', 'advanced solution aware', 'owned detailed readings must remain private', [
    state('First deep-reading evaluation', 'desktop', 'first', 'complete own record', 'understand paid scope before account effort'),
    state('Subscriber detailed return', 'desktop', 'returning', 'account and completed natal reading', 'use existing reading rather than regenerate', ['account']),
    state('Unknown-time advanced exploration', 'tablet', 'first', 'date/city and approximate time', 'cannot silently infer divisional-chart precision', ['uncertain']),
    state('Phone comparison after desktop session', 'mobile', 'returning', 'account and reference output on another device', 'recover context across devices', ['account', 'crossdevice']),
  ], [
    task('chart-depth', '/kundali', 'Inspect whether divisional charts are available beyond free facts', 'Distinguish actual free facts from subscriber natal analysis', 'deep'),
    task('chart-depth', '/kundali', 'Inspect whether yoga interpretations expose calculated inputs', 'Separate detected chart factor from generated explanation', 'deep'),
    task('factor-breakdown', '/synastry', 'Explore a full eight-factor compatibility reading', 'Understand entitlement and evidence for factors rather than only a total', 'partner'),
    task('dasha', '/vimshottari-dasha-calculator', 'Read life-period sequence alongside a relationship question', 'Avoid turning dates into assured marriage events', 'facts'),
    task('pdf', '/dashboard', 'Take a detailed owned reading to a private offline review', 'Export owned content without exposing a public result URL', 'export'),
  ]),
  context('C05', 'C', 'Relationship reader checking correction and sharing', 'product aware', 'sharing must be a deliberate choice', [
    state('Exact records and share permission', 'desktop', 'first', 'consenting pair; exact inputs', 'preview what is shared'),
    state('Storage-disabled private review', 'mobile', 'first', 'own exact record; no persistent permission', 'do not claim work is saved', ['storage', 'private']),
    state('Changed second-person source detail', 'desktop', 'returning', 'account and corrected partner time', 'avoid silently modifying historic reading', ['account', 'refresh']),
    state('Old shared link on a new device', 'mobile', 'returning', 'received result URL without an owner session', 'do not expose private pair records', ['crossdevice', 'expired']),
  ], [
    task('share', '/free-kundli', 'Share a selected chart fact without all birth details', 'Preview minimal public text and avoid private record links', 'share'),
    task('share', '/synastry', 'Understand what a compatibility sharing action would expose', 'Do not assume a share control or permission merely from the score', 'partner'),
    task('correction', '/synastry', 'Correct one partner birth time after a free total is displayed', 'Allow a safe recalculation and explain that totals may change', 'partner'),
    task('retrieve-pair', '/dashboard', 'Retrieve an earlier saved pair without changing its source record', 'Keep historic versus newly calculated results distinguishable', 'saved'),
    task('privacy', '/privacy', 'Find deletion or correction options for relationship data', 'Explain account controls and third-party data responsibility', 'privacy'),
  ]),
  context('X01', 'X', 'Privacy, consent and personal-data controls', 'varies; privacy conscious', 'explicit retention and recipient choices', [
    state('Anonymous privacy-first visitor', 'desktop', 'first', 'own exact record; no email permission', 'minimum data before first result', ['private']),
    state('Shared phone with blocked storage', 'mobile', 'first', 'date/city; time unknown', 'no residual personal details', ['private', 'storage', 'uncertain']),
    state('Account holder exercising data control', 'desktop', 'returning', 'owned account and charts', 'discover export/correction/deletion', ['account']),
    state('Marketing-consent withdrawn return', 'mobile', 'returning', 'previous saved chart; marketing declined', 'keep service and marketing choices separate', ['private', 'newsession']),
  ], [
    task('privacy', '/chart-privacy', 'Find the optional marketing choice before saving a quiz chart', 'Keep chart-link consent separate and allow skipping', 'privacy'),
    task('manglik', '/manglik-dosha-calculator', 'Obtain an allegedly free verdict without consenting to marketing', 'Do not insert a newsletter record merely for disclosure', 'verdict'),
    task('data-export', '/dashboard', 'Find and request an owner-scoped account data export', 'Offer discoverable export with complete owned data', 'account'),
    task('account-deletion', '/dashboard', 'Find a controlled account-deletion process', 'Explain confirmation, retained records and partial-failure semantics', 'account'),
    task('tracking-control', '/privacy', 'Understand analytics processing before entering birth details', 'Explain data recipients and meaningful choices without raw data capture', 'privacy'),
  ]),
  context('X02', 'X', 'Accessibility and comprehension constraints', 'novice; assistance needs vary', 'no disability profiling required', [
    state('Screen-reader-only interaction', 'desktop', 'first', 'exact birth records', 'semantic fields and announced asynchronous changes', ['screenreader']),
    state('Keyboard at 200 percent zoom', 'desktop', 'first', 'exact birth records', 'focus order and visible controls without clipping', ['zoom']),
    state('Limited English on narrow phone', 'mobile', 'first', 'date/city; familiar Sanskrit terms', 'plain labels and uncertainty without dense prose', ['fluency', 'uncertain']),
    state('Reduced-motion returning reader', 'mobile', 'returning', 'prior account and reading', 'legible output with no required animation', ['account', 'motion']),
  ], [
    task('first-chart', '/free-kundli', 'Complete chart fields using accessible labels and controls', 'Navigate form and submit without pointer or visual assumptions', 'facts'),
    task('city-correction', '/moon-sign-calculator', 'Identify city lookup status and correct a failed location', 'Announce the result/error and permit correction', 'facts'),
    task('example', '/sample-report', 'Read a sample report with clear order and no color-only meaning', 'Understand scores and headings in a nonvisual or zoomed layout', 'sample'),
    task('availability', '/pricing', 'Read free/paid availability without relying on card color', 'Expose offer difference and action labels semantically', 'pricing'),
    task('support', '/help', 'Find accessible help for unfamiliar terms and missing inputs', 'Reach task guidance without an inaccessible detour', 'help'),
  ]),
  context('X03', 'X', 'Device, network and cross-device continuity', 'product or task aware', 'respect device-local scope', [
    state('Narrow phone on slow network', 'mobile', 'first', 'exact date/time/city', 'low-bandwidth form and status feedback', ['slow']),
    state('Desktop refresh during calculation', 'desktop', 'returning', 'entered anonymous chart details', 'keep work across reload', ['refresh']),
    state('Switch from tablet to phone', 'tablet', 'returning', 'previous anonymous result on another device', 'know which data is device-local', ['crossdevice', 'newsession']),
    state('Phone browser offline after entry', 'mobile', 'first', 'exact record entered; network unavailable', 'explain unavailable calculation and retain draft', ['offline']),
  ], [
    task('first-chart', '/free-kundli', 'Calculate facts without losing entered details during device constraints', 'Preserve inputs and identify network versus validation errors', 'facts'),
    task('compatibility', '/synastry', 'Complete two birth-detail sets despite constrained layout or reload', 'Keep both sets and recover appropriately', 'partner'),
    task('retrieve', '/dashboard', 'Retrieve a report after changing device or connection', 'Use account retrieval where possible and label anonymous limits', 'saved'),
    task('example', '/sample-report', 'Inspect an example without waiting for a fresh model generation', 'Deliver labelled public output under network constraints', 'sample'),
    task('support', '/help', 'Find recovery guidance for slow or unavailable calculations', 'Provide usable task guidance rather than only a generic retry', 'help'),
  ]),
  context('X04', 'X', 'Channel promises and deep-link continuity', 'channel-specific; no presumed awareness', 'no tracking choice inferred from referral', [
    state('Educational-article reader', 'desktop', 'first', 'date/city; time unknown', 'retain article context in tool transition', ['article', 'uncertain']),
    state('Hypothetical assistant referral', 'mobile', 'first', 'exact date/time/city', 'expect free full chart from an unverified referral', ['assistant']),
    state('Hypothetical social or paid promise', 'mobile', 'first', 'exact record; no account', 'expect instant free timing without a sales quiz', ['windows', 'short']),
    state('Bookmark to a specific public tool', 'desktop', 'returning', 'old free-result expectation; new session', 'avoid homepage detour and stale availability', ['newsession']),
  ], [
    task('article-bridge', '/blog/kundli-without-birth-time', 'Move from time-uncertainty education to a suitable calculator', 'Preserve uncertainty instead of suggesting precise noon results', 'article'),
    task('first-chart', '/free-kundli', 'Use a tool recommended by a hypothetical assistant', 'Public description matches actual facts and disclosure gates', 'facts'),
    task('availability', '/pricing', 'Evaluate a pricing deep link without seeing the homepage first', 'Understand the free action and unresolved commercial availability', 'pricing'),
    task('example', '/sample-report', 'Open a creator-referred reading example directly', 'Recognize sample data and find an appropriate next action', 'sample'),
    task('manglik', '/manglik-dosha-calculator', 'Follow a problem-search promise directly to a factor verdict', 'Avoid an undisclosed email requirement after entering data', 'verdict'),
  ]),
  context('X05', 'X', 'Interruptions, session expiry and duplicate actions', 'task aware; work in progress', 'no repeated submission or charge', [
    state('Refresh and back after partial input', 'desktop', 'first', 'date and city entered; time not confirmed', 'keep partial work and selected uncertainty', ['refresh', 'uncertain']),
    state('Expired login on a return deep link', 'mobile', 'returning', 'owned saved URL; session expired', 'safe reauthentication preserves destination', ['account', 'expired']),
    state('Duplicate submit on slow connection', 'mobile', 'first', 'complete exact records', 'one active action and honest pending state', ['slow', 'duplicate']),
    state('Accidental tab close; days-later return', 'desktop', 'returning', 'prior anonymous calculation; old bookmark', 'explain what survived and avoid false saved claim', ['newsession']),
  ], [
    task('first-chart', '/free-kundli', 'Recover an interrupted anonymous chart calculation', 'Restore work where supported and label where not saved', 'facts'),
    task('compatibility', '/synastry', 'Avoid duplicate compatibility submissions after an interruption', 'One active request and clear recalculation behavior', 'partner'),
    task('auth-recovery', '/login', 'Return to an owned result after session recovery', 'Use a safe internal destination rather than restart the journey', 'auth'),
    task('renewal', '/start', 'Resume a previously started quiz without restarting every answer', 'Restore permitted progress and allow correction', 'forecast'),
    task('support', '/help', 'Get help distinguishing lost input from failed report generation', 'Reach an actionable recovery path matched to the task', 'help'),
  ]),
];
assert.equal(contexts.length, 20);
assert.equal(new Set(contexts.map((c) => c.id)).size, 20);

// Mechanism-level source judgments. No ID, channel label or random number changes a grade.
const profiles = {
  discover: [[25,'E01|E02','Free hourly promise leads to chart facts'],[50,'E02','Relevant chart entry but timing scope differs'],[25,'E01|E02','CTA promise differs from destination'],[null,'U02','Individual useful outcome not observed'],[75,'E02|E03','Short free chart route exists'],[25,'E03|E07','Calculator result remains component state'],[25,'E01|E02|E06','Free offer differs across surfaces'],[50,'E15|E01','Method limitation exists away from strong headline'],[50,'E03','Generic retry and editable inputs']],
  facts: [[75,'E03','Named fact and labelled inputs'],[75,'E03|E05','Requested chart-fact affordance exists'],[75,'E03','Calculate action and visible result path'],[75,'E03|E05|B01','Source renders named facts; one fictional API execution corroborates presence only'],[75,'E04','Geocoding removes coordinate entry'],[25,'E03|E07','Input handoff is session-only; calculator result does not restore'],[50,'E03|E06','Free facts coexist with gated flags and subscription CTA'],[50,'E04|E15','Calculation separated from interpretation; default precision caveat remains'],[50,'E03|E04','Generic retry plus city correction']],
  sample: [[75,'E24','Output is explicitly an example'],[50,'E24','Sample helps evaluate but is not personalized'],[75,'E01|E24','Public sample reachable without disclosure'],[75,'E24','Concrete labelled excerpt format in source'],[75,'E24','No personal inputs needed'],[25,'E24','Example is not stored personal work'],[75,'E02|E24','Free example distinct from subscriber output'],[75,'E24|E15','Sample context and interpretive limits available'],[50,'E20','No task-based help route at baseline']],
  method: [[75,'E15','Calculation method and limits explicitly described'],[75,'E15','Addresses credibility or safe scope question'],[75,'E15','Named method page and linked calculators'],[75,'E15','Concrete method distinctions are available'],[75,'E15','Public explanation requires no personal input'],[25,'E15','Educational page does not preserve personal work'],[75,'E02|E15','Public method and free tools identifiable'],[75,'E15','Explicit absence of predictive validation'],[50,'E15|E20','Method links exist; task support absent']],
  pricing: [[75,'E09|E02','Free and subscription scope displayed'],[75,'E09','Offer comparison supports an informed choice'],[75,'E09','Free calculator and quiz actions labelled'],[50,'E09','Offer information rather than a personalized result'],[75,'E09','No input needed to compare'],[25,'E09','Offer page is not retrieval'],[50,'E09|E11|U03','Manual renewal copy; eligibility not established'],[50,'E09|U03','Public sale presentation exceeds confirmed eligibility'],[50,'E11','Config and retired-plan errors exist but provider unverified']],
  forecast: [[75,'E02','Hourly subscription purpose described'],[50,'E02|E08','Personal timing available only through longer subscriber path'],[50,'E08','Quiz then account and paywall, not immediate timing'],[null,'U02','Personal forecast runtime not executed'],[50,'E08','Multiple quiz steps and required account'],[50,'E08','Quiz restoration and prefill exist; full return unverified'],[25,'E01|E02|U03','Free-window expectation and unresolved payment eligibility'],[50,'E15|E25','Limits available; timing fallback needs review'],[50,'E19|E18','Progress and auth controls; no executed interrupted forecast']],
  saved: [[75,'E12|E29','Account report/chart retrieval source exists'],[75,'E12','Owned saved-work route addresses return need'],[75,'E12|E29','Dashboard and saved chart list implemented'],[null,'U02','Owned saved result not executed'],[75,'E12|E08','Reuse can reduce re-entry for signed-in reader'],[75,'E12|E08','Account saved charts and renewal prefill exist'],[50,'E02|E09','Access depends on stored work/entitlement'],[75,'E12|E18','Owner-scoped auth route and safe login destination'],[50,'E12','Missing-table errors can look like empty history']],
  partner: [[75,'E22','Two-person total and subscriber breakdown described'],[50,'E22','Free total does not fully explain each requested factor'],[75,'E22','Single compute action with teaser fallback'],[50,'E22','Total visible; breakdown gated'],[50,'E22|E04','Two sets of birth details and sequential requests'],[25,'E22','Local form/teaser state not restored'],[50,'E22|E02','Free total versus subscriber factors named; eligibility unresolved'],[50,'E22|E04','Partner-data and precision limits require stronger control'],[50,'E22','Generic retry; fallback can obscure backend failures']],
  verdict: [[75,'E03','Specific dosha calculator named'],[50,'E03|E06','Requested verdict exists but requires address/auth'],[50,'E03','Calculate then separate email reveal action'],[25,'E03|E06|B01','Verdict withheld from anonymous response; fake blurred yes is not result'],[50,'E03|E04','Extra reveal form after birth fields'],[25,'E03|E07','Transient result and session-only handoff'],[25,'E03|E06','Free/no-login phrasing does not disclose newsletter reveal requirement'],[25,'E06|E23','This gate lacks the quiz separate marketing choice'],[50,'E03','Retry form exists; no task-specific support']],
  deep: [[75,'E21|E02','Natal reading scope described'],[50,'E21','Requested depth is not the free facts teaser'],[50,'E21','Full request falls back to teaser and quiz'],[null,'U02','Detailed generated reading not executed'],[50,'E21','Full compute then teaser; quiz/account path'],[50,'E12|E21','Account charts can persist; anonymous form does not restore'],[50,'E21|E11','Subscription boundary described; availability unresolved'],[50,'E15|E21','Interpretive disclosure exists; precision/health framing require review'],[50,'E21','Generic fallback/retry; backend failure may resemble missing entitlement']],
  privacy: [[75,'E23','Saved-chart notice explains purpose'],[75,'E23|E13|E14','Source describes control and owner APIs'],[50,'E23|E29','Notice and email contacts; account control discoverability partial'],[75,'E23','Specific recipients and service/marketing distinction'],[75,'E23','Public notice before disclosure'],[50,'E23|E07','Retention differs by quiz, calculator and account'],[75,'E23','Skipping save preserves free quiz chart access'],[75,'E23|E13|E14','Separate consent in quiz and owner-scoped APIs'],[50,'E23|E29','Email request and APIs; execution not established']],
  account: [[75,'E29','Account/default-detail scope labelled'],[75,'E13|E14|E29','Source supports owned export/delete/profile controls'],[50,'E29|E13|E14','UI discoverability differs from API capability'],[null,'U02','Export/deletion/profile operation not executed'],[50,'E29','Dashboard settings and email deletion detour'],[75,'E12|E29','Reusable account details and charts exist'],[75,'E29','Data controls are not presented as a paid upgrade'],[75,'E13|E14','Authentication and explicit delete confirmation'],[50,'E14','Partial cleanup error path not a transactional rollback']],
  auth: [[75,'E18','Sign-in and reset affordances named'],[75,'E18','Recovery route matches access problem'],[75,'E18','Reset action and safe next route exist'],[null,'U02','Account authentication and email delivery unexecuted'],[50,'E18','Email/auth round trip remains necessary'],[75,'E18','Internal next destination preserved in source'],[75,'E18','Login is distinct from pricing'],[75,'E18','Safe destination and non-enumerating reset copy'],[75,'E18','Explicit recovery and humanized auth error']],
  recovery: [[50,'E19','Progress telemetry may obscure customer state'],[50,'E19','Status affordance exists; actionable failure recovery partial'],[50,'E19|E29','Waiting and dashboard route exist'],[null,'U02','Interrupted generation not executed'],[50,'E19','Waiting effort and technical progress display'],[50,'E08|E12','Account and quiz persistence; interruption result unknown'],[50,'E02|E11','Access/availability needs contextual clarification'],[50,'E15|E19','Interpretive limits separate from progress reliability'],[50,'E19|E20','Progress and feedback, no dedicated help']],
  payment: [[75,'E11','Payment status and subscription guard logic exists'],[50,'E11|U03','Reconciliation design present; eligibility unresolved'],[50,'E11','Status/ownership paths are backend-heavy'],[null,'U02','Payment status or provider reconciliation never executed'],[50,'E11','Multiple provider and grant dependencies'],[50,'E11','Pending intent and paid guards source-only'],[25,'E09|U03','Commercial offer without resolved eligibility'],[75,'E11','Ownership and duplicate-paid guards in source'],[50,'E11','Configuration errors and pending intent reuse exist']],
  export: [[75,'E27','PDF export adapter present'],[75,'E27','Owned offline export fits task'],[50,'E27|E29','API/source control exists; full UI flow unverified'],[null,'U02','PDF render/delivery not executed'],[50,'E27','Account, completed report and rendering required'],[75,'E12|E27','Owned saved result supports taking content away'],[50,'E02','Exports advertised with subscription'],[75,'E27','Authenticated export source'],[50,'E27','Adapter errors not an observed recovery flow']],
  calendar: [[75,'E28','Calendar export source exists'],[75,'E28','Timing export fits task'],[50,'E28|E29','Full calendar action unexecuted'],[null,'U02','Timezone correctness and delivery not executed'],[50,'E28','Owned completed report and client calendar required'],[75,'E12|E28','Export supports reuse beyond session'],[50,'E02','Export included in subscriber scope'],[50,'E28|E25','Ownership and timezone need verification'],[50,'E28','Adapter existence is not recovery proof']],
  share: [[75,'E26','Sharing affordance source exists'],[75,'E03|E26','Selected fact can be shared'],[75,'E26','Browser share/copy action implemented'],[null,'U02','Shared output/privacy preview not executed'],[75,'E26','Browser share reduces manual transcription'],[25,'E03','Sharing does not persist a private result'],[75,'E03','Sharing not shown as paid upgrade'],[50,'E26','Content and recipient control require execution'],[50,'E26','Browser capability fallback source only']],
  article: [[75,'E30','Missing-time guide directly names the question'],[75,'E30','Relevant educational answer exists'],[50,'E30|E04','Guide-to-tool precision semantics inconsistent'],[75,'E30','Concrete educational content exists'],[75,'E30','No personal input needed to read'],[25,'E30','Public article does not save personal work'],[50,'E30|E02','Tool/offer expectations require alignment'],[50,'E30|E04','Tool reassurance conflicts with uncertainty education'],[50,'E20|E30','Education exists; task-specific help absent']],
  help: [[0,'E20|B03','Requested dedicated help page absent; 404 observed'],[0,'E20|B03','Dedicated task help not available at entry'],[0,'E20|B03','Help entry fails at both tested widths'],[0,'E20|B03','404 instead of requested task answer'],[25,'E20','Customer must find another support route'],[25,'E20','No help state to continue'],[null,'U02','Help-page availability explanation absent'],[null,'U02','No help experience to assess trust'],[0,'E20|B03','No dedicated recovery guidance at this route']],
};
const profileKeys = dimensions.filter(([id]) => id !== 'visual').map(([id]) => id);
for (const p of Object.values(profiles)) assert.equal(p.length, profileKeys.length);
const channels = ['direct', 'branded-search', 'problem-search', 'blog-guide', 'assistant-hypothetical', 'social-hypothetical', 'friend', 'professional-creator', 'paid-ad-hypothetical', 'bookmark', 'deep-link'];
const channelPromise = {
  direct: 'Product identity and first free action', 'branded-search': 'Hypothesized branded Google search; find the named product and actual offer, not verified visibility',
  'problem-search': 'Answer the specific task named in the page', 'blog-guide': 'Continue the educational question into a relevant tool',
  'assistant-hypothetical': 'Hypothesized assistant summary; referral and recommendations unverified',
  'social-hypothetical': 'Hypothesized short demo; no observed social traffic', friend: 'Inspect the recommended tool without presumed expertise',
  'professional-creator': 'Inspect a method or example without presumed endorsement',
  'paid-ad-hypothetical': 'Hypothesized ad promise; no campaign launched', bookmark: 'Return to the saved destination and relevant work',
  'deep-link': 'Understand the requested tool, policy, example or offer without homepage context',
};
const scenarios = [];
const cards = [];
function grade(t, s) {
  const grades = Object.fromEntries(profiles[t.kind].map(([value, ids, rationale], i) => [profileKeys[i], { value, ids, rationale }]));
  const entryEvidence = { '/privacy': 'E31', '/hora': 'E32', '/what-we-never-say': 'E33', '/sample-report': 'E34' }[t.entry];
  if (entryEvidence) for (const key of ['purpose', 'action', 'result', 'trust']) grades[key].ids += `|${entryEvidence}`;
  const has = (flag) => s.flags.includes(flag);
  const set = (key, value, ids, rationale) => { grades[key] = { value, ids, rationale }; };
  const calc = ['facts', 'verdict', 'partner', 'deep'].includes(t.kind);
  if (has('uncertain') && calc) {
    set('fit', 50, 'E04|E05|B02', 'No durable unknown-time semantics; available information limits this task');
    set('result', 25, 'E04|E05|B02', 'Noon does not establish precision for time-sensitive fields');
    set('trust', 25, 'E04|E05|B02', 'Broad accuracy reassurance and default noon exceed known input precision');
  }
  if (has('missing') && calc) {
    set('result', 25, 'E03|E04', 'Required date missing; validation blocks rather than invents a result');
    set('effort', 50, 'E03|E04', 'Obtain missing date; source lacks partial-form calculator restoration');
  }
  if (has('city') && calc) {
    set('fit', 50, 'E04', 'First geocoding match selected; ambiguous birthplace needs confirmation');
    set('trust', 25, 'E04', 'Displayed city does not prove correct country selection');
  }
  if (has('boundary') && calc) set('result', null, 'E05|U02', 'No executed numerical boundary/reference validation');
  if ((has('refresh') || has('newsession') || has('crossdevice')) && calc) {
    set('continuity', 25, 'E03|E07|E21|E22', 'Calculator/form result state not durably restored across this interruption');
    set('effort', 50, 'E03|E21|E22', 'Task may require re-entry after component state is lost');
  }
  if (has('storage') && calc) {
    set('continuity', 25, 'E07', 'Draft writer silently tolerates unavailable storage; not a saved guarantee');
    set('trust', 25, 'E03|E07', 'Saved-on-device statement is not conditional on successful storage');
  }
  if (has('account') && t.kind === 'forecast') {
    set('effort', 75, 'E08', 'Latest report prefill reduces repeated birth-input effort');
    set('continuity', 75, 'E08|E12', 'Quiz restoration and owned report reuse exist in source');
  }
  if (!has('account') && ['saved','export','calendar','account'].includes(t.kind)) {
    set('fit', 50, 'E12|E18', 'Task requires account-owned work; anonymous result is not an account record');
    set('effort', 50, 'E12|E18', 'Authentication and stored work are prerequisites');
    set('continuity', 25, 'E07|E12', 'No owned record is established by the anonymous prior session');
  }
  if (has('expired') && t.kind !== 'help') set('recovery', 50, 'E18|U02', 'Safe next-route source exists; expired-session recovery for this task unexecuted');
  if (has('travel') && ['saved','forecast','calendar'].includes(t.kind)) {
    set('result', null, 'E25|U02', 'Current city/offset and daylight changes not executed for this travelling reader');
    set('trust', 50, 'E25', 'Location fallback and date context need explicit confirmation');
  }
  if (has('private') && t.kind === 'verdict') set('fit', 25, 'E03|E06|B01', 'Declining address blocks the requested anonymous verdict');
  if (has('partnerprivacy') && t.kind === 'partner') set('trust', 25, 'E22', 'Two-person inputs lack an explicit partner permission decision point');
  if (has('windows') && ['discover','forecast'].includes(t.kind)) {
    set('action', 25, 'E01|E02', 'Expected immediate free personal timing is not the calculator destination');
    set('pricing', 25, 'E01|E02', 'Free-window expectation conflicts with subscriber timing scope');
  }
  if (has('short') && ['forecast','partner','deep'].includes(t.kind)) set('effort', 25, 'E08|E21|E22', 'Multi-step or two-person flow exceeds the stated short available session');
  if ((has('slow') || has('timeout')) && calc) set('recovery', 50, 'E03|E21|E22|U02', 'Generic errors exist; network/provider recovery not executed');
  if (has('offline') && calc) {
    set('result', null, 'E03|E21|E22|U02', 'Source fetch depends on network; offline behavior unexecuted');
    set('effort', 25, 'E03|E21|E22', 'No offline calculation or pre-submit durable draft in inspected forms');
  }
  if (has('screenreader') || has('zoom')) {
    if (t.kind !== 'help') {
      set('action', null, 'U01|B04', 'Navigation smoke evidence does not establish keyboard/zoom/screen-reader action clarity');
      set('effort', null, 'U01|B04', 'No executed assistive-technology effort assessment');
    }
  }
  if (has('fluency') && t.kind === 'facts') set('purpose', 50, 'E03|E04', 'Sanskrit labels have partial English equivalents; comprehension not tested');
  grades.visual = { value: null, ids: 'U01|B04', rationale: 'Basic no-overflow navigations do not grade visual quality or accessibility for this scenario' };
  return grades;
}
function metrics(grades, weights = dimensions) {
  let sum = 0, covered = 0, lower = 0, upper = 0;
  const total = weights.reduce((n, [, w]) => n + w, 0);
  for (const [id, weight] of weights) {
    const v = grades[id].value;
    if (v !== null) { sum += weight * v; covered += weight; }
    lower += weight * (v === null ? 0 : Math.max(0, v - 12.5));
    upper += weight * (v === null ? 100 : Math.min(100, v + 12.5));
  }
  return { score: covered ? sum / covered : null, coverage: covered / total, lower: lower / total, upper: upper / total };
}
const fmt = (v) => v === null ? '' : Number(v.toFixed(4));
for (const [ci, c] of contexts.entries()) {
  assert.equal(c.states.length, 4);
  assert.equal(c.tasks.length, 5);
  for (const [ti, t] of c.tasks.entries()) for (const [si, s] of c.states.entries()) {
    const number = scenarios.filter((r) => r.customer_group === c.group).length + 1;
    const id = `${c.group}${String(number).padStart(3, '0')}`;
    let channel = channels[(ci * 5 + ti * 3 + si) % channels.length];
    if (s.flags.includes('article')) channel = 'blog-guide';
    if (s.flags.includes('assistant')) channel = 'assistant-hypothetical';
    if (s.flags.includes('windows')) channel = si % 2 ? 'paid-ad-hypothetical' : 'social-hypothetical';
    if (s.flags.includes('newsession')) channel = 'bookmark';
    if (s.channel) channel = s.channel;
    assert(channels.includes(channel));
    const grades = grade(t, s);
    const ids = [...new Set(Object.values(grades).flatMap((g) => g.ids.split('|')))];
    assert(ids.every((e) => evidence.has(e)), `${id}: undefined evidence`);
    const info = s.information;
    const r = {
      scenario_id: id, customer_group: c.group, context_id: c.id, context_name: c.name,
      relevant_attributes: `${c.name}; ${s.name}; ${s.flags.join('; ') || 'no added constraint'}`,
      arrival_channel: channel,
      channel_variant: channel === 'assistant-hypothetical' ? ['ChatGPT','Claude','Gemini'][ci % 3] : channel === 'social-hypothetical' ? ['Instagram','YouTube','LinkedIn'][ci % 3] : channel === 'branded-search' ? 'Google (hypothesized search, not verified ranking)' : 'no specific platform assumed',
      entry_page: t.entry, awareness_level: c.awareness,
      immediate_need: t.intended, urgency: s.flags.includes('short') ? 'immediate; self-imposed time limit' : 'not emergency; exploratory or return task',
      expectations: `${channelPromise[channel]}; ${t.success}`, device: s.device,
      available_information: info, time_available: s.flags.includes('short') ? '1-2 minutes' : s.flags.includes('slow') ? '5 minutes with delays' : '5-10 minutes',
      privacy_concerns: `${c.privacy}; ${s.flags.includes('private') ? 'explicit disclosure/retention concern' : 'no additional permission assumed'}`,
      first_or_returning_visit: s.visit, intended_task: `${t.intended}; state: ${s.name}; constraint: ${s.constraint}`,
      success_condition: `${t.success}; respect ${s.constraint}`, intent: t.intent, task_kind: t.kind,
      journey_state: s.name, constraint: s.constraint, constraint_flags: s.flags.join('|'),
      promise_before_arrival: channelPromise[channel], landing_understanding: grades.purpose.rationale,
      first_action: grades.action.rationale, required_effort: grades.effort.rationale,
      useful_result: grades.result.rationale, next_action: 'Correct source inputs or inspect an explicitly labelled related tool/example; no payment assumed',
      reason_to_return: ['saved','forecast','account','auth'].includes(t.kind) ? 'Retrieve owned work or refresh dated reflection with chosen reusable details' : 'Check a corrected fact or related explanation; no retention probability inferred',
      evidence_ids: ids.join('|'), source_anchors: ids.map((e) => `${e}=${evidence.get(e).anchor}`).join(' | '),
      assessment_type: 'synthetic-source-audited-heuristic', scenario_browser_executed: 'no',
      browser_evidence_scope: 'B01-B04 are scoped corroboration only; no assertion this scenario was executed',
    };
    scenarios.push(r);
    const m = metrics(grades);
    const card = { scenario_id: id, phase: 'baseline', baseline_commit: baseline, customer_group: c.group,
      context_id: c.id, arrival_channel: channel, intent: t.intent, device: s.device, first_or_returning_visit: s.visit,
      score_type: 'synthetic heuristic; not observed satisfaction', evidence_ids: ids.join('|') };
    for (const [dimension, weight] of dimensions) {
      const g = grades[dimension];
      card[`${dimension}_weight`] = weight;
      card[`${dimension}_score`] = g.value === null ? '' : g.value;
      card[`${dimension}_lower`] = g.value === null ? 0 : Math.max(0, g.value - 12.5);
      card[`${dimension}_upper`] = g.value === null ? 100 : Math.min(100, g.value + 12.5);
      card[`${dimension}_status`] = g.value === null ? 'unknown' : 'heuristic-source-affordance';
      card[`${dimension}_evidence_ids`] = g.ids;
      card[`${dimension}_rationale`] = g.rationale;
      card[`${dimension}_uncertainty`] = g.value === null ? 'unknown; bounds are not confidence intervals' : 'source-only judgment +/-12.5; runtime/user outcome unverified';
      card[`postimplementation_${dimension}_score`] = '';
    }
    Object.assign(card, { observed_weight_score: fmt(m.score), evidence_coverage_pct: fmt(m.coverage * 100),
      full_rubric_lower: fmt(m.lower), full_rubric_upper: fmt(m.upper), full_coverage_score: '',
      postimplementation_status: 'pending-primary-versioned-verification', postimplementation_source_ref: '', postimplementation_score: '',
      real_user_observation: 'none', actual_reviewer_count: 6, reviewer_count_basis: 'primary handoff: six separate AI reviewers including Mendel release/security; twenty role responsibilities, no human reviewers',
      model: 'inherited; resolved runtime model not reported', grades });
    cards.push(card);
  }
}
assert.equal(scenarios.length, 400);
assert.equal(cards.length, 400);
assert.equal(new Set(scenarios.map((r) => r.scenario_id)).size, 400);
assert.equal(new Set(scenarios.map((r) => [r.context_id,r.immediate_need,r.journey_state,r.constraint].join('|'))).size, 400);
assert.equal(new Set(contexts.flatMap((c) => c.tasks.map((t) => t.intended))).size, 100);
const requiredColumns = ['scenario_id','customer_group','relevant_attributes','arrival_channel','entry_page','awareness_level',
  'immediate_need','urgency','expectations','device','available_information','time_available','privacy_concerns',
  'first_or_returning_visit','intended_task','success_condition'];
for (const r of scenarios) for (const key of requiredColumns) assert(r[key] !== undefined && r[key] !== '', `${r.scenario_id}: missing ${key}`);
for (const group of ['A','B','C','X']) assert.equal(scenarios.filter((r) => r.customer_group === group).length, 100);
for (const channel of channels) assert(scenarios.some((r) => r.arrival_channel === channel), `Missing channel: ${channel}`);
for (const card of cards) {
  assert.equal(card.visual_score, '');
  assert.equal(card.postimplementation_score, '');
  for (const [dim] of dimensions) {
    const g = card.grades[dim];
    assert(g.value === null || [0,25,50,75,100].includes(g.value));
    assert.equal(g.value === null, card[`${dim}_status`] === 'unknown');
    assert(g.ids && g.rationale);
  }
  assert(card.full_rubric_lower <= card.full_rubric_upper);
}

const capabilities = [
  ['chart-facts','Free chart facts without account','Named Lagna/Moon/star/dasha fields; no personal forecast','source-working','E03|E05|B01','One fictional API returned facts; end-to-end form/edge-case parity not established','Ephemeris and geocode service; live configuration not inspected'],
  ['birth-time-uncertainty','Calculate honestly when time missing','Noon defaults/shortcut; blanket precision reassurance','partial','E03|E04|E05|B02','No uncertainty metadata or boundary reference proof','Needs explicit precision state across inputs and result'],
  ['birthplace','Locate city automatically','First geocoding match with displayed name; stale coordinate invalidation','partial','E04','Ambiguous-country selection and timezone correctness need execution','External geocode availability unverified'],
  ['dosha-verdicts','Free verdict without surprise gating','Email or auth required; newsletter upsert in reveal path','partial','E03|E06|B01','Anonymous response has locked null doshas; no separate marketing choice in this gate','No lead mutation performed'],
  ['homepage-entry','See today windows free','CTA routes to chart facts instead of personal hourly timing','partial','E01|E02|E03','Promised immediate output differs','Offer copy alignment required'],
  ['examples','Inspect output without input','Samples labelled example/prose rather than customers','source-working','E24|B04','Basic route navigation is not output comprehension test','No model calls needed to inspect samples'],
  ['quiz','Personalized context and resume','Multi-step quiz with restore and latest-report prefill','source-working','E08','Longer than direct calculator; full resumed funnel unexecuted','Auth/profile dependencies unverified'],
  ['anonymous-continuity','Details saved on this device','Successful calculator writes session-only onboarding draft; local result not restored','partial','E03|E07','Not durable result retrieval or cross-device storage; write failures ignored','Browser storage permission required'],
  ['owned-chart-retrieval','Return to saved chart or match','Owner client lists standalone charts; errors mapped to empty arrays','source-working','E12','Schema/ownership/end-to-end dashboard delivery not executed','Supabase schema/configuration unverified'],
  ['forecast','Personal hourly reflection and outlook','Subscriber pipeline/UI present; generated delivery not audited here','unverified','E02|E08|E19|E25','Runtime quality/date/location correctness unknown','Model providers, ephemeris, database and job configuration unknown'],
  ['kundali-reading','Full natal interpretation','Compute then facts teaser; full reading entitlement required','partial','E21|E12','No completed detailed result execution','Model and entitlement configuration unverified'],
  ['compatibility','Free total and full eight-factor reading','Two input sets; free total fallback; subscriber breakdown','partial','E22','No real pair calculation or partner-consent execution','Calculation/provider configuration unverified'],
  ['pricing','Free facts versus monthly/yearly offer','Manual renewal stated; active price set; retired one-time sales guarded','partial','E02|E09|E10|E11','Public commercial availability exceeds resolved eligibility evidence','UAE and provider eligibility unresolved'],
  ['checkout','Purchase if legitimately enabled','Adapter/config checks and ownership guards in baseline; no legal approval gate there','unverified','E11|U03','No checkout activation, provider interaction or approval proved','Local main availability gate reported separately; not baseline source'],
  ['pdf','Owned report PDF export','Authenticated adapter implemented','unverified','E27','Render/delivery/private output not executed','Report completion and rendering runtime required'],
  ['calendar','Timing export','Calendar route exists','unverified','E28|E25','Event date/offset correctness unexecuted','Owned report and calendar client required'],
  ['auth-recovery','Restore account and intended result','Reset, safe next route and humanized errors implemented','source-working','E18','Email/OAuth/expired-session execution not provided','Supabase auth and delivery settings unknown'],
  ['export-data','Obtain own account data','Authenticated owner-scoped API','source-working','E13|E29','Discoverability/completeness/partial query failure unverified','Schema/configuration unknown; no PII query made'],
  ['delete-account','Controlled deletion','Explicit confirmation and core failure handling; dashboard uses email route','partial','E14|E29','Partial deletion is not transactional rollback; complete execution unverified','Isolated synthetic fixture verification required; no real deletion'],
  ['privacy-consent','Control saved-chart marketing','Quiz notice separates chart-link and optional marketing consent','partial','E23|E06','Calculator verdict path does not match quiz choice structure','Consent enforcement not tested across all paths'],
  ['help','Task-based recovery guidance','No dedicated baseline help route; generic not-found','partial','E20|B03','Help 404 observed twice; other FAQ/email support remains','Local implementation pending primary verification'],
  ['analytics','Understand task completion and source','Source calculator events, masks and first-party tracking implemented','source-working','E03|E17','Consent, event delivery and valid denominators unverified; no performance figures','No analytics/customer rows queried'],
  ['search-assistant-readiness','Accurate public discovery content','Metadata, crawler/private boundaries and assistant text present','partial','E16','Free full-results claim conflicts with dosha gate; rankings/referrals unverified','Crawler settings are not indexing or assistant inclusion proof'],
  ['walkthrough','Optional current-interface video','Presenter walkthrough requested, not inspected as delivered','proposed','U02','No continuous recording/caption/mobile playback evidence','Stabilize flow before licensed media production; no purchase authority'],
].map(([capability, customer_promise, actual_behavior, source_availability, ids, gap, dependency]) => ({
  capability, customer_promise, actual_behavior, source_availability, runtime_availability: 'unverified except explicitly scoped B evidence',
  configuration_status: 'unknown; no secret/config inspection', evidence_ids: ids,
  evidence: ids.split('|').map((id) => `${id}=${evidence.get(id).anchor}`).join(' | '), gap, dependency,
  baseline_commit: baseline, postimplementation_status: 'pending-primary-versioned-verification',
}));

function csv(rows) {
  const keys = Object.keys(rows[0]);
  assert(rows.every((r) => Object.keys(r).join('|') === keys.join('|')));
  const quote = (v) => `"${String(v ?? '').replaceAll('"', '""')}"`;
  return [keys.map(quote).join(','), ...rows.map((r) => keys.map((k) => quote(r[k])).join(','))].join('\r\n') + '\r\n';
}
function parseCsv(value) {
  const rows = []; let row = [], field = '', quoted = false;
  for (let i = 0; i < value.length; i++) {
    const ch = value[i];
    if (quoted) {
      if (ch === '"' && value[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(field); field = ''; }
    else if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (ch !== '\r') field += ch;
  }
  assert(!quoted && field === '' && row.length === 0, 'Malformed generated CSV');
  assert(rows.every((r) => r.length === rows[0].length), 'CSV column mismatch');
  return rows;
}
const csvFixture = [{ value: 'comma, quote " and newline\nsecond line', other: '' }];
assert.deepEqual(parseCsv(csv(csvFixture))[1], Object.values(csvFixture[0]));
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
const validDigest = (value) => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
function safeFile(relative, prefixes) {
  assert(typeof relative === 'string' && !relative.includes('\\') && !relative.includes('..') && !path.isAbsolute(relative));
  assert(prefixes.some((prefix) => relative.startsWith(prefix)), `Out-of-scope evidence path: ${relative}`);
  const resolved = realpathSync(path.join(root, relative));
  const inside = path.relative(realpathSync(root), resolved);
  assert(inside && !inside.startsWith('..') && !path.isAbsolute(inside), 'Evidence symlink leaves repository');
  return resolved;
}
function pointerValue(object, pointer) {
  assert(typeof pointer === 'string' && pointer.startsWith('/') && !pointer.startsWith('/stats'), 'Use a specific executed-check JSON pointer, not suite totals');
  return pointer.slice(1).split('/').reduce((value, part) => {
    const key = part.replaceAll('~1', '/').replaceAll('~0', '~');
    assert(value && Object.hasOwn(value, key), `Missing evidence JSON pointer: ${pointer}`);
    return value[key];
  }, object);
}
assert.equal(pointerValue({ runs: [{ 'a/b': 'passed' }] }, '/runs/0/a~1b'), 'passed');
assert.throws(() => pointerValue({ stats: { expected: 2 } }, '/stats/expected'));
assert.throws(() => pointerValue({ runs: [] }, '/runs/4/status'));

// Rules describe changed source affordances, never estimated satisfaction or guaranteed point gains.
const postRules = [
  { id: 'chart-first-entry', needs: ['chart-known'], kinds: ['discover','facts'],
    anchors: [['src/components/landing/Hero.tsx','Create my free chart'],['src/components/tools/ChartTool.tsx','No login, email or card required']],
    updates: { purpose:75, action:75, pricing:75 }, reason:'Chart-first source names the actual free result and removes the prior hourly promise at supported entries' },
  { id:'birth-time-clarity', needs:['unknown-no-api','approximate-provisional'], kinds:['facts','verdict','partner','deep'],
    anchors:[['src/lib/tools/birth.ts','We do not substitute noon'],['src/components/forms/BirthDetailsInput.tsx','Select certainty'],['src/components/tools/ChartTool.tsx','No time interval was checked']],
    updates:{ trust:75, recovery:75 }, reason:'Explicit time certainty and honest refusal/provisional copy; no interval or astronomical accuracy claim' },
  { id:'city-choice', needs:['city-choice-required','city-edit-invalidates'], kinds:['facts','verdict','partner','deep'],
    anchors:[['src/components/forms/BirthDetailsInput.tsx','City matches'],['src/components/forms/BirthDetailsInput.tsx','birth_city_confirmed: false']],
    updates:{ action:75, trust:75 }, reason:'Explicit candidate choice and invalidation replace silent first-match selection' },
  { id:'free-verdict', needs:['anonymous-doshas-no-lead-write'], kinds:['facts','verdict'], excludes:['uncertain','missing','boundary','offline'],
    anchors:[['src/app/api/tools/chart/route.ts','neither collects leads nor changes accounts'],['src/components/tools/ChartTool.tsx','doshaLabel']],
    forbidden:[['src/app/api/tools/chart/route.ts','newsletter_subscribers'],['src/components/tools/ChartTool.tsx','DoshaLock']],
    updates:{ fit:75, result:75, effort:75, pricing:75, trust:75 }, reason:'Supported anonymous facts/verdict path no longer requires email/auth or newsletter insertion; result usefulness is a source affordance' },
  { id:'opt-in-draft-restore', needs:['save-seven-days','refresh-no-extra-api','edit-clears-result','clear-calculator-key'], kinds:['facts','verdict'],
    excludes:['crossdevice','newsession','storage','offline','uncertain','missing','boundary'],
    anchors:[['src/lib/tools/storage.ts','7 * 24 * 60 * 60 * 1000'],['src/components/tools/ChartTool.tsx','setRes(saved.result)'],['src/components/tools/ChartTool.tsx','if (!storageReady || !remember) return']],
    updates:{ continuity:75, effort:75 }, reason:'Opt-in device-local draft/result restores without recomputation in supported conditions; expiry enforced on access, not background deletion' },
  { id:'device-save-control', needs:['no-default-save','clear-calculator-key'], kinds:['facts','verdict'], excludes:['storage','crossdevice'],
    anchors:[['src/components/tools/ChartTool.tsx','useState(false)'],['src/components/tools/ChartTool.tsx','Leave off on a shared device']],
    updates:{ trust:75 }, reason:'Calculator saving is optional and local, with tested clear behavior; this does not establish analytics consent' },
  { id:'retry-retains-input', needs:['synthetic-504-real-retry'], kinds:['facts','verdict'], excludes:['offline','missing','uncertain'],
    anchors:[['src/components/tools/ChartTool.tsx','Your details are unchanged; try again'],['src/components/tools/ChartTool.tsx','requestJson']],
    updates:{ recovery:75 }, reason:'Injected 504 then real retry retains the supported inputs; not evidence all provider failures recover' },
  { id:'commercial-denial', needs:['paid-default-disabled','authenticated-mutation-no-provider-no-write'], kinds:['pricing','payment','forecast','deep'],
    anchors:[['src/lib/commercial/availability.ts',"=== 'true'"],['src/app/api/ziina/create-intent/route.ts','COMMERCIAL_UNAVAILABLE'],['src/app/api/ziina/upgrade/route.ts','COMMERCIAL_UNAVAILABLE']],
    updates:{ trust:75 }, reason:'Default-disabled server mutation guard executes before provider/database writes; UAE eligibility is still unresolved' },
  { id:'unavailable-offer-copy', needs:['unavailable-offer-visible','paid-schema-suppressed'], kinds:['pricing','discover','forecast','deep'],
    anchors:[['src/lib/commercial/availability.ts','New paid readings are currently unavailable'],['src/lib/seo/aiVisibility.ts','if (!checkoutEnabled) return offers']],
    updates:{ pricing:75 }, reason:'Supported availability surfaces explain free/current-owned access separately from unavailable new paid readings' },
  { id:'task-help', needs:['help-route-and-task-search'], kinds:['help'], excludes:['screenreader','zoom'],
    anchors:[['src/app/help/page.tsx','HelpSearch'],['src/app/help/page.tsx','No purchase needed']],
    updates:{ purpose:75, fit:75, action:75, result:75, effort:75, recovery:75 }, reason:'Dedicated task help route/search replaces baseline 404 in checked scope; full accessibility remains unknown' },
  { id:'optional-analytics-control', needs:['analytics-off-optin-withdraw','analytics-private-data-scrub'], kinds:['privacy'],
    anchors:[['src/lib/analytics/consent.ts','if (!hasAnalyticsConsent()) return'],['src/components/analytics/AnalyticsPreferences.tsx','Off unless you choose to enable it']],
    updates:{ trust:75 }, reason:'Tested optional analytics defaults off, supports opt-in/withdrawal and bounds private fields; not general privacy/legal compliance or deletion of sent events' },
  { id:'saved-chart-error-contract', needs:['saved-collections-error-not-empty','saved-refresh-retains-stale'], kinds:['saved'],
    anchors:[['src/app/api/user/charts/route.ts','unavailable.kundali = true'],['src/components/dashboard/AccountDashboard.tsx','SavedChartsPanel']],
    updates:{ recovery:75 }, reason:'Mocked owned-collection and refresh failures are explicit and preserve successful/stale data; no real-account retrieval was executed' },
  { id:'account-operation-integrity', needs:['export-error-not-empty','delete-partial-honest'], kinds:['account'],
    anchors:[['src/app/api/account/export/route.ts','EXPORT_UNAVAILABLE'],['src/app/api/account/delete/route.ts','Some records may already have been removed']],
    updates:{ recovery:75 }, reason:'Isolated mocks verify incomplete exports fail and partial deletion is reported honestly with retry; not a real deletion or transactional rollback' },
  { id:'free-summary-no-generation', needs:['kundali-free-no-full-compute','synastry-free-no-full-compute'], kinds:['partner','deep'], excludes:['uncertain','missing','offline','partnerprivacy'],
    anchors:[['src/app/kundali/KundaliForm.tsx',"requestJson('/api/kundali/teaser'"],['src/app/synastry/SynastryForm.tsx',"requestJson('/api/synastry/teaser'"]],
    updates:{ effort:75, pricing:75 }, reason:'Supported known-input free summaries call teaser only, not a generated full reading; no complete written reading, factor breakdown or entitlement execution claimed' },
];
assert.equal(new Set(postRules.map((r) => r.id)).size,postRules.length);
for (const r of postRules) for (const [dim,score] of Object.entries(r.updates)) {
  assert(dim !== 'visual' && dimensions.some(([id]) => id === dim));
  assert([25,50,75].includes(score), 'Source reassessment is capped at 75, even with task receipts');
}
const allowedAffordances = new Set(postRules.flatMap((r) => r.needs).concat('layout-basic'));
const calculatorSourceDependencies=['src/components/tools/ChartTool.tsx','src/components/forms/BirthDetailsInput.tsx',
  'src/lib/tools/birth.ts','src/lib/tools/chart.ts','src/lib/tools/requests.ts','src/lib/tools/storage.ts',
  'src/app/api/tools/chart/route.ts','src/app/api/geocode/route.ts'];
const postDependencies={
  'chart-first-entry':[...calculatorSourceDependencies,'src/lib/landingCopy.ts'],
  'birth-time-clarity':calculatorSourceDependencies, 'city-choice':calculatorSourceDependencies,
  'free-verdict':calculatorSourceDependencies, 'opt-in-draft-restore':calculatorSourceDependencies,
  'device-save-control':calculatorSourceDependencies, 'retry-retains-input':calculatorSourceDependencies,
  'commercial-denial':['src/lib/commercial/availability.ts','src/app/api/ziina/create-intent/route.ts','src/app/api/ziina/upgrade/route.ts'],
  'unavailable-offer-copy':['src/lib/commercial/availability.ts','src/lib/seo/aiVisibility.ts','src/app/pricing/page.tsx'],
  'task-help':['src/app/help/page.tsx','src/components/help/HelpSearch.tsx','src/components/help/articles.ts'],
  'optional-analytics-control':['src/lib/analytics/consent.ts','src/components/analytics/AnalyticsPreferences.tsx','src/components/analytics/PostHogProvider.tsx','src/app/privacy/page.tsx','src/app/chart-privacy/page.tsx','src/__tests__/analyticsConsent.test.ts'],
  'saved-chart-error-contract':['src/app/api/user/charts/route.ts','src/components/dashboard/AccountDashboard.tsx','src/components/dashboard/SavedChartsPanel.tsx','src/__tests__/userChartsRecovery.test.ts'],
  'account-operation-integrity':['src/app/api/account/export/route.ts','src/app/api/account/delete/route.ts','src/__tests__/accountDataControls.test.ts'],
  'free-summary-no-generation':['src/app/kundali/KundaliForm.tsx','src/app/synastry/SynastryForm.tsx','src/app/api/kundali/teaser/route.ts','src/app/api/synastry/teaser/route.ts','e2e/customer-experience.spec.ts'],
};
const sourceConfigs=new Set(['package.json','package-lock.json','tsconfig.json','next.config.mjs','tailwind.config.ts',
  'postcss.config.mjs','vitest.config.ts','playwright.customer-experience.config.ts','playwright.config.ts','vercel.json','eslint.config.mjs','.eslintrc.json']);
function validSourcePath(p) {
  return typeof p==='string' && !p.includes('..') && !p.includes('\\') && !path.isAbsolute(p)
    && (p.startsWith('src/') || p.startsWith('e2e/') || (/^ephemeris-service\/(?:[^/]+\.py|requirements\.txt|Dockerfile|railway\.toml)$/.test(p))
      || sourceConfigs.has(p) || ['scripts/customer-experience-browser.mjs','scripts/record-free-chart-walkthrough.mjs'].includes(p));
}
const flags = new Set(scenarios.flatMap((s) => s.constraint_flags.split('|').filter(Boolean)));
function scopeMatches(scope,s) {
  return scope.devices.includes(s.device) && scope.task_kinds.includes(s.task_kind) && scope.visits.includes(s.first_or_returning_visit)
    && scope.entry_pages.includes(s.entry_page)
    && s.constraint_flags.split('|').filter(Boolean).every((flag) => scope.allowed_flags.includes(flag))
    && (!scope.scenario_ids || scope.scenario_ids.includes(s.scenario_id));
}
function loadPostReceipt(relative, io = {}) {
  const read = io.read || ((p,prefixes) => readFileSync(safeFile(p,prefixes)));
  const baselineSource = io.baselineSource || source;
  const gitCommit = io.gitCommit || ((ref) => execFileSync('git',['rev-parse',`${ref}^{commit}`],{cwd:root,encoding:'utf8'}).trim());
  const gitBytes = io.gitBytes || ((commit,p) => execFileSync('git',['show',`${commit}:${p}`],{cwd:root,maxBuffer:8e6}));
  const receiptText = read(relative,['docs/audits/customer-experience-overhaul/2026-10-15/RELEASES/']).toString('utf8');
  let parsedText = receiptText.trim();
  if (!parsedText.startsWith('{')) {
    const blocks = [...parsedText.matchAll(/```json\s*\n([\s\S]*?)\n```/g)];
    assert.equal(blocks.length,1,'Markdown receipt must contain exactly one JSON block');
    parsedText = blocks[0][1];
  }
  const receipt = JSON.parse(parsedText);
  assert.equal(receipt.format_version,1);
  assert.equal(receipt.verification_status,'verified-local','This mode assesses verified local source, not an unproved deployment');
  assert.equal(receipt.real_users_observed,0);
  const snapshot = receipt.source;
  assert(snapshot && snapshot.final === true && typeof snapshot.version === 'string' && snapshot.version.length > 0, 'Require final primary source version');
  assert(['working-tree','git'].includes(snapshot.kind));
  assert(validDigest(snapshot.manifest_sha256));
  assert(Array.isArray(snapshot.files) && snapshot.files.length > 0);
  assert.equal(new Set(snapshot.files.map((f) => f.path)).size,snapshot.files.length);
  const manifest = [...snapshot.files].sort((a,b) => a.path.localeCompare(b.path,'en')).map((f) => `${f.path}\0${f.sha256}`).join('\n')+'\n';
  assert.equal(digest(manifest),snapshot.manifest_sha256,'Source manifest hash differs');
  if (snapshot.kind === 'git') {
    assert(typeof snapshot.ref === 'string' && !snapshot.ref.startsWith('-'));
    assert.match(snapshot.commit,/^[a-f0-9]{40}$/);
    assert.equal(gitCommit(snapshot.ref),snapshot.commit,'Source tag/ref moved');
  }
  const sources = new Map();
  const gitBlobs=new Map();
  if (snapshot.kind==='git' && !io.gitBytes) {
    const batch=execFileSync('git',['cat-file','--batch'],{cwd:root,input:snapshot.files.map((f)=>`${snapshot.commit}:${f.path}`).join('\n')+'\n',maxBuffer:64e6});
    let offset=0;
    for (const f of snapshot.files) {
      const end=batch.indexOf(10,offset); assert(end>=0);
      const [,type,sizeText]=batch.subarray(offset,end).toString('ascii').split(' ');
      const size=Number(sizeText); assert(type==='blob' && Number.isInteger(size) && size>=0);
      const b=batch.subarray(end+1,end+1+size); assert.equal(b.length,size); gitBlobs.set(f.path,b);
      offset=end+1+size+1; assert.equal(batch[offset-1],10);
    }
    assert.equal(offset,batch.length);
  }
  for (const f of snapshot.files) {
    assert(validDigest(f.sha256));
    assert(validSourcePath(f.path),`Disallowed source/test manifest path: ${f.path}`);
    const bytes = snapshot.kind === 'git'
      ? (gitBlobs.get(f.path) || gitBytes(snapshot.commit,f.path)) : read(f.path,['src/']);
    assert.equal(digest(bytes),f.sha256,`Source changed after verification: ${f.path}`);
    sources.set(f.path,bytes.toString('utf8'));
  }
  assert(Array.isArray(receipt.checks) && receipt.checks.length > 0);
  const checks = new Map();
  for (const c of receipt.checks) {
    assert(typeof c.id === 'string' && /^P-[A-Z0-9_-]+$/.test(c.id) && !checks.has(c.id) && !evidence.has(c.id));
    assert.equal(c.source_manifest_sha256,snapshot.manifest_sha256,'Check not bound to this source');
    assert.equal(c.kind,'executed-check');
    assert(typeof c.conditions === 'string' && c.conditions.length > 0);
    assert(['real-chart-backend','mocked-dependencies','synthetic-504-real-retry','public-navigation'].includes(c.dependency_mode));
    assert(Array.isArray(c.affordances) && c.affordances.length && c.affordances.every((a) => allowedAffordances.has(a)));
    assert(validDigest(c.artifact_sha256));
    const bytes = read(c.artifact,['artifacts/customer-experience/']);
    assert.equal(digest(bytes),c.artifact_sha256,`Verification artifact changed: ${c.artifact}`);
    assert(['passed','expected',true].includes(c.expected));
    if (c.expected===true) assert(['public-navigation','real-chart-backend'].includes(c.dependency_mode),'Boolean pass is only for individual route/API receipts');
    assert.equal(pointerValue(JSON.parse(bytes.toString('utf8')),c.pointer),c.expected,`Executed check did not pass: ${c.id}`);
    const scope = c.scope;
    assert(scope && scope.devices?.length && scope.task_kinds?.length && scope.visits?.length && scope.entry_pages?.length && Array.isArray(scope.allowed_flags));
    assert(scope.devices.every((v) => ['desktop','mobile','tablet'].includes(v)));
    assert(scope.task_kinds.every((v) => Object.hasOwn(profiles,v)));
    assert(scope.visits.every((v) => ['first','returning'].includes(v)));
    assert(scope.entry_pages.every((v) => scenarios.some((s) => s.entry_page === v)));
    assert(scope.allowed_flags.every((v) => flags.has(v)));
    if (scope.scenario_ids) assert(scope.scenario_ids.length && scope.scenario_ids.every((v) => scenarios.some((s) => s.scenario_id === v)));
    checks.set(c.id,c);
    evidence.set(c.id,{id:c.id,type:`post-executed-check:${c.dependency_mode}`,anchor:`${c.artifact}#${c.pointer}`,claim:c.conditions,sha256:c.artifact_sha256});
  }
  assert(Array.isArray(receipt.screenshots),'Final source receipt needs scoped screenshot evidence');
  for (const width of [1440,390,320]) {
    const shot = receipt.screenshots.find((s) => s.viewport_width === width);
    assert(shot && validDigest(shot.artifact_sha256),`Missing ${width}px screenshot`);
    const bytes = read(shot.artifact,['artifacts/customer-experience/']);
    assert.equal(digest(bytes),shot.artifact_sha256);
    assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a','Receipt screenshots must be PNG');
    assert.equal(bytes.readUInt32BE(16),width,'Screenshot width differs from declared viewport');
    assert.equal(shot.overflow,false);
    const layout = checks.get(shot.layout_check_id);
    assert(layout && layout.affordances.includes('layout-basic'),'Screenshot needs executed basic-layout check');
    assert.equal(shot.source_manifest_sha256,snapshot.manifest_sha256);
  }
  assert(Array.isArray(receipt.enabled_rules) && receipt.enabled_rules.length > 0);
  assert.equal(new Set(receipt.enabled_rules).size,receipt.enabled_rules.length);
  const rules = receipt.enabled_rules.map((id) => {
    const rule = postRules.find((r) => r.id === id); assert(rule,`Unregistered scoring rule: ${id}`);
    for (const p of postDependencies[id]) assert(sources.has(p),`Source manifest missing rule dependency: ${p}`);
    assert(rule.needs.every((need) => [...checks.values()].some((c) => c.affordances.includes(need))),`Missing executed evidence for ${id}`);
    let changed = false;
    const sourceIds = [];
    for (const [p,marker] of rule.anchors) {
      const text = sources.get(p); assert(text && text.includes(marker),`Receipt misses source anchor ${p}: ${marker}`);
      let old = null;
      try { old = baselineSource(p); } catch { /* new source file absent in baseline */ }
      changed ||= old !== text;
      const id = `PS-${sourceIds.length+1}-${rule.id.toUpperCase()}`;
      const line = text.split(/\r?\n/).findIndex((s) => s.includes(marker))+1;
      evidence.set(id,{id,type:'verified-post-source',anchor:`${snapshot.version}:${p}:${line}`,claim:rule.reason,sha256:snapshot.files.find((f) => f.path===p).sha256});
      sourceIds.push(id);
    }
    assert(changed,`No changed source affordance for ${id}`);
    for (const [p,marker] of rule.forbidden || []) assert(!sources.get(p)?.includes(marker),`Old obstructing source remains: ${p}`);
    return { ...rule,sourceIds };
  });
  return {receipt,checks,rules,receipt_sha256:digest(receiptText),path:relative};
}
function postVerifierSelfTests() {
  const savedEvidence=new Map(evidence);
  const receiptPath='docs/audits/customer-experience-overhaul/2026-10-15/RELEASES/_memory-only-unit-fixture.json';
  const blobs=new Map();
  const rule=postRules[0];
  for (const [p,marker] of rule.anchors) blobs.set(p,Buffer.from(marker+'\n'));
  for (const p of postDependencies[rule.id]) if (!blobs.has(p)) blobs.set(p,Buffer.from('In-memory source dependency unit fixture\n'));
  const files=[...blobs].map(([p,b])=>({path:p,sha256:digest(b)})).sort((a,b)=>a.path.localeCompare(b.path,'en'));
  const manifest=digest(files.map((f)=>`${f.path}\0${f.sha256}`).join('\n')+'\n');
  const artifact='artifacts/customer-experience/_memory-only-checks.json';
  blobs.set(artifact,Buffer.from(JSON.stringify({checks:[{status:'passed'},{status:'passed'}]})));
  const scope={devices:['desktop','mobile'],task_kinds:['facts'],visits:['first'],entry_pages:['/free-kundli'],allowed_flags:[]};
  const receipt={format_version:1,verification_status:'verified-local',real_users_observed:0,
    source:{kind:'working-tree',final:true,version:'MEMORY-ONLY-TEST-NOT-A-RELEASE',manifest_sha256:manifest,files},
    checks:[['P-UNIT-CHART','chart-known',0],['P-UNIT-LAYOUT','layout-basic',1]].map(([id,affordance,index])=>({
      id,kind:'executed-check',source_manifest_sha256:manifest,artifact,artifact_sha256:digest(blobs.get(artifact)),
      pointer:`/checks/${index}/status`,expected:'passed',conditions:'In-memory verifier unit fixture; not executed customer/browser evidence',
      dependency_mode:'mocked-dependencies',affordances:[affordance],scope})),screenshots:[],enabled_rules:[rule.id]};
  for (const width of [1440,390,320]) {
    const p=`artifacts/customer-experience/_memory-only-${width}.png`;
    const header=Buffer.alloc(24); Buffer.from('89504e470d0a1a0a','hex').copy(header); header.writeUInt32BE(width,16);
    blobs.set(p,header);
    receipt.screenshots.push({viewport_width:width,artifact:p,artifact_sha256:digest(header),source_manifest_sha256:manifest,overflow:false,layout_check_id:'P-UNIT-LAYOUT'});
  }
  const run=(value,mutateBlobs=()=>{})=>{
    evidence.clear(); for (const [k,v] of savedEvidence) evidence.set(k,v);
    const local=new Map(blobs); mutateBlobs(local);
    local.set(receiptPath,Buffer.from(JSON.stringify(value)));
    return loadPostReceipt(receiptPath,{read:(p,prefixes)=>{
      assert(prefixes.some((prefix)=>p.startsWith(prefix)) && !p.includes('..'));
      assert(local.has(p),`Missing memory unit fixture: ${p}`); return local.get(p);
    },baselineSource:()=>''});
  };
  try {
    assert.equal(run(receipt).rules[0].id,rule.id);
    const pending=structuredClone(receipt); pending.source.final=false; assert.throws(()=>run(pending),/final primary/);
    const sourceBad=structuredClone(receipt); sourceBad.source.manifest_sha256='0'.repeat(64); assert.throws(()=>run(sourceBad),/manifest hash/);
    assert.throws(()=>run(receipt,(b)=>b.set(files[0].path,Buffer.from('changed after tests'))),/Source changed/);
    assert.throws(()=>run(receipt,(b)=>b.set(artifact,Buffer.from('{}'))),/artifact changed/);
    const failed=structuredClone(receipt);
    const failedBytes=Buffer.from(JSON.stringify({checks:[{status:'failed'},{status:'passed'}]}));
    for (const c of failed.checks) c.artifact_sha256=digest(failedBytes);
    assert.throws(()=>run(failed,(b)=>b.set(artifact,failedBytes)),/Executed check did not pass/);
    const narrowMissing=structuredClone(receipt); narrowMissing.screenshots.pop(); assert.throws(()=>run(narrowMissing),/Missing 320/);
    const unknownRule=structuredClone(receipt); unknownRule.enabled_rules=['invented-gain']; assert.throws(()=>run(unknownRule),/Unregistered scoring rule/);
    const missingCheck=structuredClone(receipt); missingCheck.checks[0].affordances=['layout-basic']; assert.throws(()=>run(missingCheck),/Missing executed evidence/);
    assert(scopeMatches(scope,{device:'desktop',task_kind:'facts',first_or_returning_visit:'first',entry_page:'/free-kundli',constraint_flags:'',scenario_id:'unit'}));
    assert(!scopeMatches(scope,{device:'tablet',task_kind:'facts',first_or_returning_visit:'first',entry_page:'/free-kundli',constraint_flags:'',scenario_id:'unit'}));
    assert(!scopeMatches(scope,{device:'desktop',task_kind:'facts',first_or_returning_visit:'first',entry_page:'/free-kundli',constraint_flags:'uncertain',scenario_id:'unit'}));
  } finally { evidence.clear(); for (const [k,v] of savedEvidence) evidence.set(k,v); }
  assert.deepEqual([...evidence.keys()],[...savedEvidence.keys()],'Unit fixtures must not enter published evidence');
}
postVerifierSelfTests();
const post = postPath ? loadPostReceipt(postPath) : null;
const postCards = [];
let newlyGraded = 0;
for (const [index,card] of cards.entries()) {
  const s = scenarios[index];
  const effective = structuredClone(card.grades);
  let newWeight = 0;
  for (const [dim,weight] of dimensions) {
    const matches = post ? post.rules.filter((r) => r.kinds.includes(s.task_kind)
      && !(r.excludes || []).some((flag) => s.constraint_flags.split('|').includes(flag))
      && Object.hasOwn(r.updates,dim)
      && r.needs.every((need) => [...post.checks.values()].some((c) => c.affordances.includes(need) && scopeMatches(c.scope,s)))) : [];
    const applied = matches.length ? matches.map((r) => r.updates[dim]) : [];
    assert(!applied.length || applied.every((score) => score === applied[0]),'Conflicting evidence rules require explicit reviewer resolution');
    const value = applied.length ? applied[0] : null;
    const ids = matches.flatMap((r) => [...r.sourceIds,...[...post.checks.values()].filter((c) => r.needs.some((n) => c.affordances.includes(n)) && scopeMatches(c.scope,s)).map((c) => c.id)]);
    card[`postimplementation_${dim}_score`] = value ?? '';
    card[`postimplementation_${dim}_status`] = dim === 'visual' ? 'unknown' : value === null ? 'not-reassessed' : 'verified-source-affordance-with-scoped-receipt';
    card[`postimplementation_${dim}_lower`] = value === null ? '' : Math.max(0,value-12.5);
    card[`postimplementation_${dim}_upper`] = value === null ? '' : Math.min(100,value+12.5);
    card[`postimplementation_${dim}_evidence_ids`] = [...new Set(ids)].join('|');
    card[`postimplementation_${dim}_rules`] = matches.map((r) => r.id).join('|');
    card[`postimplementation_${dim}_rationale`] = matches.map((r) => r.reason).join(' | ');
    card[`postimplementation_${dim}_uncertainty`] = value === null ? 'pending relevant final versioned evidence; baseline not newly verified' : 'source heuristic +/-12.5; only stated check conditions executed; no real-user or accuracy claim';
    if (value !== null) {
      assert(value<=75 && dim!=='visual');
      effective[dim]={value,ids:card[`postimplementation_${dim}_evidence_ids`],rationale:card[`postimplementation_${dim}_rationale`]};
      newWeight+=weight; newlyGraded++;
    }
  }
  card.postimplementation_new_evidence_weight_pct=newWeight;
  card.postimplementation_inherited_baseline_weight_pct=dimensions.reduce((n,[id,w]) => n+(card[`postimplementation_${id}_score`]==='' && card.grades[id].value!==null ? w : 0),0);
  card.postimplementation_receipt=post?.path || '';
  card.postimplementation_receipt_sha256=post?.receipt_sha256 || '';
  card.postimplementation_source_ref=post?.receipt.source.version || '';
  card.postimplementation_source_manifest_sha256=post?.receipt.source.manifest_sha256 || '';
  const composite=metrics(effective);
  card.postimplementation_status=newWeight ? 'scoped-local-reassessment' : post ? 'not-reassessed-in-local-receipt' : 'pending-primary-versioned-verification';
  card.postimplementation_score=newWeight ? fmt(composite.score) : '';
  card.postimplementation_score_basis=newWeight ? 'composite: newly-evidenced dimensions plus explicitly inherited baseline; not 400 executed tasks' : '';
  card.postimplementation_effective_coverage_pct=newWeight ? fmt(composite.coverage*100) : '';
  card.postimplementation_full_rubric_lower=newWeight ? fmt(composite.lower) : '';
  card.postimplementation_full_rubric_upper=newWeight ? fmt(composite.upper) : '';
  postCards.push({...card,grades:effective});
  assert.equal(card.postimplementation_visual_score,'');
}
if (post) assert(newlyGraded>0,'Receipt is valid but no scenario conditions match; do not publish an empty reassessment');
const capabilityRules={
  'chart-facts':['chart-first-entry','free-verdict'], 'birth-time-uncertainty':['birth-time-clarity'], birthplace:['city-choice'],
  'dosha-verdicts':['free-verdict'], 'homepage-entry':['chart-first-entry'], 'anonymous-continuity':['opt-in-draft-restore','device-save-control'],
  pricing:['unavailable-offer-copy','commercial-denial'], checkout:['commercial-denial'], help:['task-help'],
  'privacy-consent':['optional-analytics-control'], analytics:['optional-analytics-control'],
  'owned-chart-retrieval':['saved-chart-error-contract'], 'export-data':['account-operation-integrity'], 'delete-account':['account-operation-integrity'],
  'kundali-reading':['free-summary-no-generation'], compatibility:['free-summary-no-generation'],
};
for (const c of capabilities) {
  const enabled=post?.rules.filter((r)=>(capabilityRules[c.capability]||[]).includes(r.id)) || [];
  c.postimplementation_status=enabled.length ? 'changed-source-with-scoped-local-receipt' : post ? 'not-reassessed-in-local-receipt' : 'pending-primary-versioned-verification';
  c.postimplementation_source_ref=enabled.length ? post.receipt.source.version : '';
  c.postimplementation_evidence_ids=enabled.flatMap((r)=>[...r.sourceIds,...[...post.checks.values()].filter((e)=>r.needs.some((n)=>e.affordances.includes(n))).map((e)=>e.id)]).filter((id,i,all)=>all.indexOf(id)===i).join('|');
  c.postimplementation_actual_behavior=enabled.map((r)=>r.reason).join(' | ');
  c.postimplementation_limitations=enabled.length ? 'Only receipt scope reassessed; runtime/configuration/general usability not presumed complete; see post coverage' : 'No supported reassessment yet';
}
// Freeze baseline score/evidence columns even as reviewer metadata and post fields evolve.
if (existsSync(path.join(out,'SCORECARDS.csv'))) {
  const existing = parseCsv(readFileSync(path.join(out,'SCORECARDS.csv'),'utf8'));
  const oldHeader=existing[0];
  assert.equal(existing.length,401);
  const frozen=['scenario_id','baseline_commit','observed_weight_score','evidence_coverage_pct','full_rubric_lower','full_rubric_upper',
    ...dimensions.flatMap(([d]) => ['score','weight','lower','upper','status','evidence_ids','rationale','uncertainty'].map((k) => `${d}_${k}`))];
  for (const [i,card] of cards.entries()) for (const key of frozen) assert.equal(String(card[key]),existing[i+1][oldHeader.indexOf(key)],`Immutable baseline changed: ${card.scenario_id}/${key}`);
  if (!post && !check) assert(!existing.slice(1).some((r) => r[oldHeader.indexOf('postimplementation_source_ref')]),'Existing verified post grades require --post receipt to preserve them');
}
const serializedCards = cards.map(({ grades, ...card }) => card);
const products = new Map([
  ['PERSONAS-AND-SCENARIOS.csv', csv(scenarios)], ['SCORECARDS.csv', csv(serializedCards)], ['CAPABILITY-MATRIX.csv', csv(capabilities)],
]);
for (const [name, content] of products) {
  const parsed = parseCsv(content);
  assert.equal(parsed.length - 1, name === 'CAPABILITY-MATRIX.csv' ? capabilities.length : 400);
  const rows = name === 'PERSONAS-AND-SCENARIOS.csv' ? scenarios : name === 'SCORECARDS.csv' ? serializedCards : capabilities;
  assert.deepEqual(parsed.slice(1), rows.map((r) => Object.values(r).map(String)), `${name}: CSV roundtrip`);
}
const mean = (rows, weights = dimensions) => {
  const ms = rows.map((r) => metrics(r.grades, weights));
  return ['score','coverage','lower','upper'].reduce((a, k) => ({ ...a, [k]: ms.reduce((n, m) => n + m[k], 0) / ms.length }), {});
};
const table = (rows) => ['| Slice | N | Observed-weight heuristic | Evidence coverage % | Full-rubric judgment bounds |', '|---|---:|---:|---:|---|',
  ...rows.map(([name, subset]) => { const m = mean(subset); return `| ${name} | ${subset.length} | ${m.score.toFixed(2)} | ${(m.coverage*100).toFixed(2)} | [${m.lower.toFixed(2)}, ${m.upper.toFixed(2)}] |`; })].join('\n');
const overall = mean(cards);
const groups = Object.fromEntries(['A','B','C','X'].map((g) => [g, mean(cards.filter((r) => r.customer_group === g))]));
assert(Math.abs(overall.score - Object.values(groups).reduce((n,m) => n+m.score,0)/4) < 1e-10);
const sections = [];
sections.push('## Generated Validation', '', `Baseline: \`${baseline}\`. Exact scenarios: **400**; A/B/C/X: **100 each**. Contexts: **20**; distinct tasks: **100**; each task has **4 substantive states/constraints**. Duplicate context/task/state/constraint tuples: **0**. Scorecard rows: **400**; capability rows: **${capabilities.length}**. Ten weights sum to **100**. CSV quote/newline roundtrip, all evidence IDs and baseline anchor markers validated. No random scores or ID offsets.`, '',
  `Overall observed-weight synthetic heuristic: **${overall.score.toFixed(2)}/100**, mean evidence coverage **${fmt(overall.coverage*100)}%**, full-rubric judgment bounds **[${overall.lower.toFixed(2)}, ${overall.upper.toFixed(2)}]**. Full-coverage score remains blank. This is not an observed customer experience rating.`, '',
  'Equal scenario sampling does not represent audience prevalence. The factorial design deliberately probes shared mechanisms; repeated anchor grades are expected and do not turn the rows into independent empirical observations. Channel/device/first-return comparisons are confounded by different selected tasks and states, not causal effects. Hypothetical assistant/social variants name possible referral contexts, not verified referrals.', '',
  `Executed baseline browser tasks (primary): **29**, basic passes **27**. Includes **28 public route navigations** (14 routes x 1440/390 widths) and **1 fictional public chart API call**, not 29 completed funnels. /help returned 404 twice; initial free-kundli time was 12:00 twice; one API returned chart facts and locked null doshas. Real users: **0**. Account/payment mutations and model-generation calls: **0**. Reviewer total: **6 separate AI reviewers**, per primary handoff including Mendel release/security; 20 role responsibilities are not 20 reviewers. Research-operations worker count: **1**. Resolved inherited model: **unreported**.`, '',
  'Additional verification counters are separate: Copernicus/public-experience reports 10 supplementary public browser checks; Pauli/calculation-security reports 7 mocked browser regressions within 108 new regressions. Primary task-results.json checkpoint 2026-10-14T20:35:34.486Z records 21/21 local tasks across 1440/390/320, replacing the earlier 2-task desktop checkpoint. These cover chart/save/restore/edit/clear, unknown refusal, city choice, injected failure/real retry, help/device clear, availability/auth and layout. Do not sum baseline29, supplementary10, mocked7 or primary21 into a unique-task total: overlap, dependencies and source freshness differ. Final source/build, privacy/auth-error and analytics-consent verification remain pending.', '',
  `Browser artifact execution timestamp: ${browser.executedAt}; SHA256 ${browserDigest}. Source grades were predefined independently; browser evidence corroborates only named baseline observations. All 400 scenario_browser_executed fields are no.`, '');
for (const [title, key] of [['By Group','customer_group'],['By Channel','arrival_channel'],['By Intent','intent'],['By Device','device'],['First Versus Return','first_or_returning_visit']]) {
  const names = [...new Set(cards.map((r) => r[key]))].sort();
  const slices = names.map((name) => [name, cards.filter((r) => r[key] === name)]);
  assert.equal(slices.reduce((n,[,r]) => n+r.length,0),400);
  sections.push(`## ${title}`, '', table(slices), '');
}
sections.push('## Lowest Situations', '', '| Scenario | Context | Task | Constraint | Heuristic | Coverage % | Bounds |', '|---|---|---|---|---:|---:|---|');
for (const r of [...cards].sort((a,b) => a.observed_weight_score - b.observed_weight_score || a.scenario_id.localeCompare(b.scenario_id)).slice(0,12)) {
  const s = scenarios.find((s) => s.scenario_id === r.scenario_id);
  sections.push(`| ${r.scenario_id} | ${s.context_id} | ${s.intent} | ${s.journey_state} | ${Number(r.observed_weight_score).toFixed(2)} | ${r.evidence_coverage_pct} | [${r.full_rubric_lower}, ${r.full_rubric_upper}] |`);
}
sections.push('', 'Low dedicated-help entries identify an absent journey, not a score for every existing support option. Low uncertain-time and privacy-gated entries identify shared mechanisms worth fixing.', '', '## Audience-Mix Sensitivity', '', '| Declared mix | A/B/C/X shares % | Heuristic | Coverage % | Bounds |', '|---|---|---:|---:|---|');
const mixes = [['balanced design',[25,25,25,25]],['first-chart heavy',[55,20,15,10]],['return-timing heavy',[15,55,20,10]],['relationship heavy',[15,20,55,10]],['constraint stress',[15,20,15,50]]];
for (const [name, shares] of mixes) {
  assert.equal(shares.reduce((n,v) => n+v,0),100);
  const mix = (key) => shares.reduce((n,w,i) => n+w*groups[['A','B','C','X'][i]][key]/100,0);
  sections.push(`| ${name} | ${shares.join('/')} | ${mix('score').toFixed(2)} | ${(mix('coverage')*100).toFixed(2)} | [${mix('lower').toFixed(2)}, ${mix('upper').toFixed(2)}] |`);
}
sections.push('', '## Dimension Sensitivity', '', 'Double one dimension weight and renormalize all weights to 100; no changed grades. Unknowns remain blank, not imputed.', '', '| Doubled dimension | Heuristic | Coverage % | Bounds |', '|---|---:|---:|---|');
for (const [id] of dimensions) {
  const doubled = dimensions.map(([key,w]) => [key, key === id ? w*2 : w]);
  const total = doubled.reduce((n,[,w]) => n+w,0);
  const weights = doubled.map(([key,w]) => [key,w/total*100]);
  assert(Math.abs(weights.reduce((n,[,w]) => n+w,0)-100)<1e-10);
  const m = mean(cards,weights);
  sections.push(`| ${id} | ${m.score.toFixed(2)} | ${(m.coverage*100).toFixed(2)} | [${m.lower.toFixed(2)}, ${m.upper.toFixed(2)}] |`);
}
sections.push('', '## Separate Readiness Scorecards', '', '| Scorecard | Source observations | Unknown evidence | Numeric score |', '|---|---|---|---|',
  '| SEO readiness | E16 metadata/assistant content and private-path policy present; free-verdict copy conflict | Indexation, current search traffic, performance and assistant inclusion unverified | Unassigned; do not blend into CX |',
  '| Business readiness | E09-E11 price book/manual renewal/retired-sale guards present; local default-off gate reported | UAE licence/provider eligibility, verified serving costs, refunds/support burden, demand and retention | Unassigned; commercial activation unresolved |',
  '| Investor evidence | Coherent provisional groups and deterministic/interpretive separation | No observed demand, verified cohort retention or unit economics | Unassigned; not inferable from synthetic scenarios |', '',
  '## Post-Implementation', '', post ? `Scoped local reassessment from \`${post.receipt.source.version}\`, manifest SHA256 ${post.receipt.source.manifest_sha256}; receipt \`${post.path}\`, SHA256 ${post.receipt_sha256}. Newly graded scenario/dimension cells: ${newlyGraded}. The composite below explicitly inherits baseline values for dimensions not reassessed. It is not a newly tested 400-scenario score, deployment claim, predictive validation or real-user result.` : 'Pending primary final source version and checksum-bound verification receipt/screenshots. All post numeric fields remain blank. Working-source improvements and differently scoped checks are recorded in CURRENT-STATE.md but do not authorize numeric reassessment by themselves. Use --post RECEIPT only after the documented verification gate is satisfied.', '');
if (post) {
  const m=mean(postCards);
  const newCoverage=cards.reduce((n,c)=>n+c.postimplementation_new_evidence_weight_pct,0)/400;
  sections.push(`Effective composite: ${m.score.toFixed(2)}; effective known weight ${fmt(m.coverage*100)}%; newly evidenced weight ${newCoverage.toFixed(2)}%; bounds [${m.lower.toFixed(2)}, ${m.upper.toFixed(2)}]. Unchanged cells inherit their baseline uncertainty, not a new verification. Visual/accessibility remains unknown even though receipt screenshots/basic overflow checks exist.`, '');
  for (const [title,key] of [['Group','customer_group'],['Channel','arrival_channel'],['Intent','intent'],['Device','device'],['First Versus Return','first_or_returning_visit']]) {
    const slices=[...new Set(postCards.map((r)=>r[key]))].sort().map((name)=>[name,postCards.filter((r)=>r[key]===name)]);
    assert.equal(slices.reduce((n,[,rows])=>n+rows.length,0),400);
    sections.push(`### Post ${title}`, '',table(slices),'', '| Slice | Newly evidenced weight % | Rows with reassessed cells |','|---|---:|---:|',
      ...slices.map(([name,rows])=>`| ${name} | ${(rows.reduce((n,r)=>n+r.postimplementation_new_evidence_weight_pct,0)/rows.length).toFixed(2)} | ${rows.filter((r)=>r.postimplementation_new_evidence_weight_pct>0).length} |`),'');
  }
  const postGroups=Object.fromEntries(['A','B','C','X'].map((g)=>[g,mean(postCards.filter((r)=>r.customer_group===g))]));
  sections.push('### Post Audience Sensitivity','','| Mix | Composite | Effective coverage % | Bounds |','|---|---:|---:|---|');
  for (const [name,shares] of mixes) {
    const val=(key)=>shares.reduce((n,w,i)=>n+w*postGroups[['A','B','C','X'][i]][key]/100,0);
    sections.push(`| ${name} | ${val('score').toFixed(2)} | ${(val('coverage')*100).toFixed(2)} | [${val('lower').toFixed(2)}, ${val('upper').toFixed(2)}] |`);
  }
  sections.push('','### Post Dimension Sensitivity','','| Doubled dimension | Composite | Effective coverage % | Bounds |','|---|---:|---:|---|');
  for (const [dim] of dimensions) {
    const weights=dimensions.map(([id,w])=>[id,id===dim ? w*2 : w]);
    const m=mean(postCards,weights);
    sections.push(`| ${dim} | ${m.score.toFixed(2)} | ${(m.coverage*100).toFixed(2)} | [${m.lower.toFixed(2)}, ${m.upper.toFixed(2)}] |`);
  }
  sections.push('','### Enabled Rules','','| Rule | Required checks | Dimensions | Anchor target |','|---|---|---|---|',
    ...post.rules.map((r)=>`| ${r.id} | ${r.needs.join(', ')} | ${Object.keys(r.updates).join(', ')} | ${Object.values(r.updates).join(', ')} |`),'');
}
sections.push('## Evidence Registry', '', '| ID | Kind | Exact anchor | Claim | SHA256 of source/artifact |', '|---|---|---|---|---|');
const escapeCell=(value)=>String(value).replaceAll('|','\\|').replaceAll('\n',' ');
for (const e of evidence.values()) sections.push(`| ${e.id} | ${escapeCell(e.type || 'evidence gap')} | \`${escapeCell(e.anchor)}\` | ${escapeCell(e.claim)} | ${e.sha256 || ''} |`);
const start = '<!-- GENERATED-ASSESSMENT:START -->';
const end = '<!-- GENERATED-ASSESSMENT:END -->';
assert.equal(protocol.split(start).length,2);
assert.equal(protocol.split(end).length,2);
const updated = `${protocol.split(start)[0]}${start}\n${sections.join('\n')}\n${end}${protocol.split(end)[1]}`;
products.set('SCORING.md', updated);
for (const [name, content] of products) {
  const file = path.join(out,name);
  if (check) assert.equal(readFileSync(file,'utf8'),content, `${name} is not reproducible; rerun generator`);
  else writeFileSync(file,content,'utf8');
}
console.log(JSON.stringify({ mode: check ? 'check' : 'generate', scenarios: scenarios.length, contexts: contexts.length,
  tasks: 100, groups: { A:100,B:100,C:100,X:100 }, scorecards: cards.length, capabilities: capabilities.length,
  weights_sum:100, evidence_ids:evidence.size, baseline_browser_tasks:browser.journeys.length,
  baseline_basic_passes:27, reviewer_count:6, real_users:0, duplicates:0,
  observed_weight_heuristic:fmt(overall.score), evidence_coverage_pct:fmt(overall.coverage*100),
  full_rubric_bounds:[fmt(overall.lower),fmt(overall.upper)], postimplementation:post ? 'scoped-local-reassessment' : 'pending',
  post_newly_graded_cells:newlyGraded, post_source_version:post?.receipt.source.version || '',
  post_verifier_memory_unit_cases:12, files:[...products.keys()] },null,2));
