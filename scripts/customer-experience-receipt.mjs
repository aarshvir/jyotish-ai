import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const commit='a5d00e066a6b735574652bf18da6985b47e0a47a';
const output='docs/audits/customer-experience-overhaul/2026-10-15/RELEASES/02-local-verification.json';
const check=process.argv.includes('--check');
assert(process.argv.slice(2).every((a)=>a==='--check'));
const sha=(bytes)=>createHash('sha256').update(bytes).digest('hex');
const artifacts={unit:'artifacts/customer-experience/final-unit-tests.json',tasks:'artifacts/customer-experience/final-local/task-results.json',routes:'artifacts/customer-experience/after-local/journeys.json'};
const bytes=Object.fromEntries(Object.entries(artifacts).map(([key,p])=>[key,readFileSync(path.join(root,p))]));
const data=Object.fromEntries(Object.entries(bytes).map(([key,b])=>[key,JSON.parse(b.toString('utf8'))]));
assert.equal(data.unit.numPassedTests,1173); assert.equal(data.unit.numTotalTests,1173);
assert.equal(data.unit.numFailedTests,0); assert.equal(data.unit.numPendingTests,0); assert.equal(data.unit.numTodoTests,0);
assert.equal(data.unit.testResults.length,108); assert(data.unit.success);
assert.equal(data.tasks.stats.expected,33); assert.equal(data.tasks.stats.unexpected,0); assert.equal(data.tasks.stats.skipped,0); assert.equal(data.tasks.stats.flaky,0);
assert.equal(data.routes.journeys.length,35); assert.equal(data.routes.journeys.filter((r)=>r.passed).length,35);
assert.equal(data.routes.base,'http://127.0.0.1:3200');
for (const key of ['realUsers','accountMutations','paymentMutations','modelGenerationCalls']) assert.equal(data.routes.counts[key],0);
assert.equal(execFileSync('git',['rev-parse',`${commit}^{commit}`],{cwd:root,encoding:'utf8'}).trim(),commit);

const configs=new Set(['package.json','package-lock.json','tsconfig.json','next.config.mjs','tailwind.config.ts','postcss.config.mjs','vitest.config.ts','playwright.customer-experience.config.ts','playwright.config.ts','vercel.json','eslint.config.mjs','.eslintrc.json']);
const paths=execFileSync('git',['ls-tree','-r','--name-only',commit],{cwd:root,encoding:'utf8'}).trim().split('\n').filter((p)=>p.startsWith('src/') || p.startsWith('e2e/') || configs.has(p)
  || /^ephemeris-service\/(?:[^/]+\.py|requirements\.txt|Dockerfile|railway\.toml)$/.test(p)
  || ['scripts/customer-experience-browser.mjs','scripts/record-free-chart-walkthrough.mjs'].includes(p)).sort((a,b)=>a.localeCompare(b,'en'));
// Git's size-delimited blob batch preserves bytes, including images/fonts, without shell rewriting.
const batch=execFileSync('git',['cat-file','--batch'],{cwd:root,input:paths.map((p)=>`${commit}:${p}`).join('\n')+'\n',maxBuffer:64e6});
let offset=0;
const files=paths.map((p)=>{
  const end=batch.indexOf(10,offset); assert(end>=0);
  const [,type,sizeText]=batch.subarray(offset,end).toString('ascii').split(' ');
  const size=Number(sizeText); assert.equal(type,'blob'); assert(Number.isInteger(size)&&size>=0);
  const b=batch.subarray(end+1,end+1+size); assert.equal(b.length,size);
  offset=end+1+size+1; assert.equal(batch[offset-1],10);
  return {path:p,sha256:sha(b)};
});
assert.equal(offset,batch.length);
const manifest=sha(files.map((f)=>`${f.path}\0${f.sha256}`).join('\n')+'\n');
const checks=[];
const sourceScope=(devices,kinds,pages,flags=[],visits=['first','returning'])=>({devices,task_kinds:kinds,visits,entry_pages:pages,allowed_flags:flags});
const screens={desktop:1440,mobile:390,narrow:320};
const calcPages=['/free-kundli','/moon-sign-calculator'];
const calcScope=sourceScope(['desktop','mobile'],['facts','verdict'],calcPages,['private','refresh','uncertain','city']);
const policyScope=sourceScope(['desktop','mobile'],['privacy'],['/privacy','/chart-privacy'],['private','account','storage','uncertain','newsession']);
const commerceScope=sourceScope(['desktop','mobile'],['pricing','payment','forecast','deep','discover'],['/pricing','/start','/dashboard','/kundali','/'],['account','expired','payment','private','refresh']);
function add(id,key,pointer,affordances,scope,mode,conditions,extra={}) {
  checks.push({id,kind:'executed-check',source_manifest_sha256:manifest,artifact:artifacts[key],artifact_sha256:sha(bytes[key]),pointer,
    expected:'passed',affordances,scope,dependency_mode:mode,conditions,
    scope_basis:'Source-affordance reassessment in listed entry/condition scope; not a claim every synthetic scenario or device condition was replayed',...extra});
}
function unit(id,file,title,affordances,scope,conditions) {
  const fi=data.unit.testResults.findIndex((f)=>f.name.replaceAll('\\','/').endsWith('/'+file)); assert(fi>=0,file);
  const ri=data.unit.testResults[fi].assertionResults.findIndex((r)=>r.title===title); assert(ri>=0,title);
  assert.equal(data.unit.testResults[fi].assertionResults[ri].status,'passed');
  add(id,'unit',`/testResults/${fi}/assertionResults/${ri}/status`,affordances,scope,'mocked-dependencies',conditions,{test_source:file,test_title:title});
}
const taskTests=[];
function collectTasks(value,pointer) {
  if (!value || typeof value!=='object') return;
  if (value.title && Array.isArray(value.tests)) for (const [i,t] of value.tests.entries()) {
    assert.equal(t.results.length,1); assert.equal(t.results[0].status,'passed');
    taskTests.push({title:value.title,project:t.projectName,pointer:`${pointer}/tests/${i}/results/0/status`});
  }
  for (const [key,child] of Object.entries(value)) if (child&&typeof child==='object') collectTasks(child,`${pointer}/${key}`);
}
collectTasks(data.tasks.suites,'/suites'); assert.equal(taskTests.length,33);
function task(id,title,project,affordances,kinds,pages,flags,mode,conditions) {
  const t=taskTests.find((t)=>t.title===title&&t.project===project); assert(t,title+'/'+project);
  add(id,'tasks',t.pointer,affordances,sourceScope([project==='desktop'?'desktop':'mobile'],kinds,pages,flags),mode,conditions,{viewport_width:screens[project],test_source:'e2e/customer-experience.spec.ts',test_title:title});
}
for (const project of Object.keys(screens)) {
  const suffix=project.toUpperCase();
  task(`P-CORE-${suffix}`,'free chart task, optional save, refresh, edit and clear',project,['chart-known','refresh-no-extra-api','edit-clears-result','clear-calculator-key'],['facts','verdict','discover'],['/free-kundli','/'],['private','refresh'],'real-chart-backend',
    `Fictional known New Delhi chart: Gemini/Sagittarius, no email input, optional local save, same-browser reload without extra chart API, edit/clear. Executed /free-kundli; homepage chart-first offer is source-transferred, not an executed comprehension task (${screens[project]}px).`);
  task(`P-UNKNOWN-${suffix}`,'unknown birth time sends no calculation and offers recovery help',project,['unknown-no-api'],['facts','verdict'],['/moon-sign-calculator'],['uncertain'],'public-navigation',`Unknown-time UI on /moon-sign-calculator produces no chart request and offers help (${screens[project]}px); no date-only chart or interval calculation.`);
  task(`P-CITY-${suffix}`,'ambiguous city requires a choice and edits invalidate coordinates',project,['city-choice-required','city-edit-invalidates'],['facts','verdict'],['/free-kundli'],['city'],'mocked-dependencies',`Two fictional Springfield candidates injected; explicit Massachusetts choice required and editing removes selection (${screens[project]}px). Geography service mocked.`);
  task(`P-RETRY-${suffix}`,'failed calculation preserves inputs and can be retried',project,['synthetic-504-real-retry','no-default-save'],['facts','verdict'],['/free-kundli'],['private','refresh'],'synthetic-504-real-retry',`Injected chart 504, retained date/input, then unmocked real local retry succeeds without default device save (${screens[project]}px). Not a real provider outage.`);
  task(`P-HELP-${suffix}`,'help search, no-result recovery and device clear stay scoped',project,['help-route-and-task-search'],['help'],['/help'],['private','uncertain','refresh','account','expired'], 'public-navigation',`Help search birth-time query, no-result/reset recovery and scoped device clear at /chart-privacy (${screens[project]}px); source help affordance only, not all support topics or actual account records.`);
  task(`P-OFFER-${suffix}`,'closed offers and assistant metadata agree, private routes preserve auth',project,['unavailable-offer-visible'],['pricing','discover','forecast','deep','payment'],['/pricing','/start','/dashboard','/kundali','/'],['account','expired','payment','private','refresh'],'public-navigation',`Visible closed pricing/start, anonymous dashboard login redirect, quiz offer false and assistant text agree (${screens[project]}px); no authenticated paid mutation executed in browser.`);
  task(`P-LAYOUT-${suffix}`,'navigation and real product visual fit at this viewport',project,['layout-basic'],['discover','facts','pricing','help','privacy'],['/','/free-kundli','/pricing','/help','/privacy'],[],'public-navigation',`Homepage heading visible, no document overflow, mobile Escape restores nav-toggle focus; archived PNG ${screens[project]}px. No full screen-reader/contrast/a11y certification.`);
  task(`P-ANALYTICS-${suffix}`,'optional analytics starts off, honors a choice and can be withdrawn',project,['analytics-off-optin-withdraw'],['privacy'],['/privacy','/chart-privacy'],['private','account','storage','uncertain','newsession'],'mocked-dependencies',`Actual privacy preference UI defaults off, explicit opt-in emits intercepted first-party analytics, withdrawal stops capture and removes vh_sid (${screens[project]}px). Collector requests intercepted; no real analytics/customer query.`);
  task(`P-KUNDALI-${suffix}`,'Kundli facts do not trigger a generated full reading',project,['kundali-free-no-full-compute'],['deep','partner'],['/kundali','/synastry'],['private','account','refresh'],'real-chart-backend',`Known fictional Kundali teaser succeeds with Gemini and zero /api/kundali/compute requests (${screens[project]}px). Free-summary source transfer only; full generated reading not executed.`);
  task(`P-SYNASTRY-${suffix}`,'compatibility free score is qualified and never invokes a generated reading',project,['synastry-free-no-full-compute'],['deep','partner'],['/kundali','/synastry'],['private','account','refresh'],'real-chart-backend',`Two fictional birth sets produce a qualified free Gun Milan total with zero /api/synastry/compute requests (${screens[project]}px). No full breakdown or relationship-outcome validation.`);
}
unit('P-APPROXIMATE','src/__tests__/calculatorBrowser.test.ts','labels approximate results provisional and removes saved data when consent is withdrawn',['approximate-provisional'],calcScope,'Mocked calculator UI labels a single entered estimate provisional/no interval; withdrawing save removes local key. Shared-source label behavior, not mobile approximate-time replay or numerical accuracy.');
unit('P-UNKNOWN-CONTRACT','src/__tests__/calculatorRoutes.test.ts','gives an honest unavailable explanation for unknown time, not a noon chart',['unknown-no-api'],calcScope,'Actual route handler with mocked dependencies refuses unknown time before calculation; source transfer to shared calculator only.');
unit('P-CITY-SOURCE','src/__tests__/calculatorBrowser.test.ts','requires deliberate time and explicit city choice, returns all free facts and never saves by default',['city-choice-required','no-default-save'],calcScope,'Mocked UI requires deliberate city choice and no default storage; narrow source transfer does not assert all candidates/geographies were executed.');
unit('P-CITY-EDIT-SOURCE','src/__tests__/calculatorBrowser.test.ts','suppresses a late city search after editing, without overwriting other fields',['city-edit-invalidates'],calcScope,'Mocked city request/edit rejects stale lookup data and preserves other fields; source invalidation, not verified geography.');
unit('P-FREE-NO-LEADS','src/__tests__/calculatorRoutes.test.ts','returns every deterministic result anonymously without auth/newsletter writes, even with a legacy email',['anonymous-doshas-no-lead-write'],calcScope,'Mocked actual free route returns dosha fields while auth/newsletter writes are forbidden. Real local API corroborates fields, not database-write observation or general calculation accuracy.');
unit('P-SEVEN-DAYS','src/lib/tools/storage.test.ts','expires and removes data at the seven-day boundary',['save-seven-days'],calcScope,'Synthetic clock/storage fixture verifies exact 7-day boundary and on-access removal, not seven elapsed days with a real customer.');
unit('P-CLOSED-DEFAULT','src/__tests__/commercialAvailability.test.ts','requires the explicit release flag, independently of the blueprint switch',['paid-default-disabled'],commerceScope,'Unit default-off commercial flag guard; not provider eligibility or a live environment credential inspection.');
unit('P-MUTATION-DENIED','src/__tests__/commercialAvailability.test.ts','refuses new and legacy payment mutations before calling the provider or writing a draft',['authenticated-mutation-no-provider-no-write'],commerceScope,'Mock-authenticated mutation handlers reject while provider and draft writes are forbidden; no real payment or customer database access.');
unit('P-FREE-SCHEMA','src/__tests__/commercialAvailability.test.ts','publishes only the free offer and accurate assistant descriptions while closed',['paid-schema-suppressed'],commerceScope,'Unit structured/assistant availability has only free offer while closed; not verified assistant recommendations/indexing.');
unit('P-ANALYTICS-SCRUB','src/__tests__/analyticsConsent.test.ts','allows basic events only after choice and strips private data from requests',['analytics-private-data-scrub'],policyScope,'Browser/transport mocks verify bounded optional-event properties and no private fields; not general legal privacy compliance.');
const savedScope=sourceScope(['desktop','mobile'],['saved'],['/dashboard'],['account','expired','refresh','crossdevice','slow','travel','newsession']);
unit('P-SAVED-ERROR','src/__tests__/userChartsRecovery.test.ts','keeps both database failures unavailable, never genuinely empty',['saved-collections-error-not-empty'],savedScope,'Actual owned-chart handler with database/auth mocks signals both collection failures, not empty account; no real-account queries.');
unit('P-SAVED-STALE','src/__tests__/userChartsRecovery.test.ts','keeps both previous collections visible on failed refresh, with explicit stale guidance',['saved-refresh-retains-stale'],savedScope,'Mocked saved-panel refresh preserves previous collections with stale guidance; source error-contract only, no authenticated cross-device flow executed.');
const accountScope=sourceScope(['desktop','mobile'],['account'],['/dashboard'],['account','private','expired','refresh','storage','travel']);
unit('P-EXPORT-INCOMPLETE','src/__tests__/accountDataControls.test.ts','refuses an incomplete reports export instead of producing a false empty download',['export-error-not-empty'],accountScope,'Isolated owner/database mock: incomplete report export returns unavailable rather than a false complete empty download; no PII queried.');
unit('P-DELETE-PARTIAL','src/__tests__/accountDataControls.test.ts','keeps sign-in until reports cleanup is confirmed and acknowledges partial removal',['delete-partial-honest'],accountScope,'Isolated delete mock retains sign-in on core-cleanup failure and reports possible partial removal honestly; no real deletion or database rollback test.');

const screenshots=[];
for (const [project,width] of Object.entries(screens)) for (const surface of ['home-viewport','chart-result']) {
  const artifact=`artifacts/customer-experience/final-local/${project}-${surface}.png`;
  const b=readFileSync(path.join(root,artifact)); assert.equal(b.subarray(0,8).toString('hex'),'89504e470d0a1a0a'); assert.equal(b.readUInt32BE(16),width);
  screenshots.push({viewport_width:width,artifact,artifact_sha256:sha(b),source_manifest_sha256:manifest,overflow:surface==='home-viewport'?false:null,
    layout_check_id:`P-LAYOUT-${project.toUpperCase()}`,layout_scope:surface==='home-viewport'?'Homepage document overflow checked in corresponding actual task':'Chart-result screenshot inspected separately; homepage overflow check does not prove result accessibility',surface});
}
const api=data.routes.journeys.at(-1); assert.equal(api.status,200); assert.equal(api.body.lagna,'Gemini'); assert.equal(api.body.moon_sign,'Sagittarius'); assert(api.body.doshas && !api.body.doshas_locked);
const receipt={format_version:1,verification_status:'verified-local',real_users_observed:0,
  source:{kind:'git',final:true,version:`C1=${commit}`,ref:commit,commit,manifest_sha256:manifest,files,
    manifest_scope:'All src and e2e files, calculation Python code/tests and pinned dependencies, applicable build/test configs, browser and recording harnesses. No env/private/raw customer artifacts or mutable audit docs.'},
  provenance:'Primary gate-complete/source-freeze handoff; metadata constructed from archived individual results and git C1 bytes. Builder did not rerun product/browser tests or query customers.',
  primary_attested_gates:{production_build:'passed',typecheck:'passed',lint:'passed with unchanged legacy warnings',significant_independent_findings:'closed'},
  artifact_counters:{unit:{passed:1173,total:1173,files:108,failed:0,skipped:0,mocked_browser_cases_included:7},local_tasks:{passed:33,total:33,tasks_per_width:11,widths:[1440,390,320],start_time:data.tasks.stats.startTime},local_route_api:{passed:35,total:35,route_navigations:34,fictional_api_calls:1,executed_at:data.routes.executedAt},
    counts_note:'Separate scopes, not summed into unique users or journeys. Mocked browser cases are included in unit total, not additional tasks. 400 synthetic scenarios were not executed.'},
  artifact_receipts:Object.entries(artifacts).map(([key,p])=>({path:p,sha256:sha(bytes[key]),kind:key})),
  checks,screenshots,enabled_rules:['chart-first-entry','birth-time-clarity','city-choice','free-verdict','opt-in-draft-restore','device-save-control','retry-retains-input','commercial-denial','unavailable-offer-copy','task-help','optional-analytics-control','saved-chart-error-contract','account-operation-integrity','free-summary-no-generation'],
  limitations:['Local production-build evidence only; deployment/live results belong to primary RELEASES/03, not this immutable receipt.','Post scores are source-affordance heuristics capped at 75, not 400 executed tasks or a real-user CX score.','Scopes identify conservative source transfer with stated devices/entries/flags; tablet, screen-reader/zoom and unlisted conditions are not newly graded.','Real users observed zero; no demand, retention, conversion or willingness-to-pay inference.','UAE/payment eligibility unresolved; no checkout activation or real charge.','Calculation reference parity, historical/DST/interval sensitivity and predictive validity not established.','Visual/contrast/screen-reader grades remain unknown; no-overlay/overflow screenshots are not full accessibility tests.','Account/export/delete tests use isolated mocks, not real data operations, DB restoration or a transactional rollback.','Analytics transport is intercepted/mocked; existing provider events and inaccessible third-party cookies are not proven erased.','Walkthrough actual video playback/captions/transcript tested separately in 33-task report; no requested natural presenter produced.']};
const content=JSON.stringify(receipt,null,2)+'\n';
if(check) assert.equal(readFileSync(path.join(root,output),'utf8'),content,'Receipt differs from frozen source/artifacts');
else writeFileSync(path.join(root,output),content,'utf8');
console.log(JSON.stringify({mode:check?'check':'build',receipt:output,commit,source_files:files.length,manifest_sha256:manifest,receipt_sha256:sha(content),checks:checks.length,screenshots:screenshots.length,counts:receipt.artifact_counters},null,2));
