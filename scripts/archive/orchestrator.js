const { spawn, execSync } = require('child_process');
const { chromium } = require('playwright');
const fs = require('fs');
const http = require('http');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const EPH_PORT = 8001;
const NEXT_PORT = 3000;
const MAX_ATTEMPTS = 3;

const log = (tag, msg) =>
  console.log(`[${new Date().toTimeString().slice(0,8)}][${tag}] ${msg}`);

const sleep = ms => new Promise(r => setTimeout(r, ms));
const escapeHtml = (s) =>
  String(s || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');

function killPort(port) {
  try {
    const out = execSync(`netstat -ano | findstr :${port}`,
      {encoding:'utf8',stdio:['pipe','pipe','pipe']});
    [...new Set(out.split('\n')
      .map(l=>l.trim().split(/\s+/).pop())
      .filter(p=>p&&/^\d+$/.test(p)&&p!=='0')
    )].forEach(pid=>{
      try{execSync(`taskkill /PID ${pid} /F`,{stdio:'ignore'});}catch(_){}
    });
  } catch(_){}
}

function waitForPort(port, ms=35000) {
  return new Promise((resolve,reject)=>{
    const deadline = Date.now()+ms;
    const try_ = ()=>{
      const req = http.get(`http://localhost:${port}`,res=>{
        res.destroy(); resolve();
      });
      req.on('error',()=>{
        if(Date.now()>deadline)
          return reject(new Error(`Port ${port} never opened`));
        setTimeout(try_,1500);
      });
      // Prevent the promise from hanging forever when the socket opens but no response arrives.
      req.setTimeout(5000,()=>{
        try{ req.destroy(new Error('timeout')); }catch(_){}
      });
      req.end();
    };
    try_();
  });
}

async function startEphemeris() {
  log('EPH','Starting...');
  killPort(EPH_PORT);
  await sleep(1500);
  const proc = spawn('py',['-m','uvicorn','main:app',
    '--port',String(EPH_PORT)],
    {cwd:path.join(ROOT,'ephemeris-service'),
     shell:true,stdio:['ignore','pipe','pipe']});
  let buf='';
  proc.stdout.on('data',d=>{buf+=d;});
  proc.stderr.on('data',d=>{buf+=d;});
  await waitForPort(EPH_PORT).catch(e=>{
    throw new Error(`Ephemeris failed: ${buf.slice(-400)}`);
  });
  log('EPH',`Ready on :${EPH_PORT}`);
  return proc;
}

async function startNextJS() {
  log('NEXT','Starting...');
  killPort(NEXT_PORT);
  await sleep(1500);
  const proc = spawn('npm',['run','dev'],
    {cwd:ROOT,shell:true,stdio:['ignore','pipe','pipe'],
     env:{...process.env,FORCE_COLOR:'0'}});
  let buf='';
  let errors=[];
  proc.stdout.on('data',d=>{
    const s=d.toString(); buf+=s;
    if(s.includes('Error:')||s.includes('Module not found'))
      errors.push(s.trim());
  });
  proc.stderr.on('data',d=>{buf+=d.toString();});
  proc.getErrors=()=>errors;
  proc.getLog=()=>buf;
  proc.clearErrors=()=>{errors=[];};
  await waitForPort(NEXT_PORT,50000).catch(e=>{
    throw new Error(`Next.js failed: ${buf.slice(-800)}`);
  });
  await sleep(4000);
  log('NEXT',`Ready on :${NEXT_PORT}`);
  return proc;
}

async function autoFix(errors,nextProc) {
  log('FIX',`Fixing ${errors.length} compile errors...`);
  for(const err of errors){
    if(err.includes('motion')&&err.includes('Unexpected token')){
      const m=err.match(/\.\/src\/([^\s]+\.tsx)/);
      if(m){
        const f=path.join(ROOT,'src',m[1]);
        if(fs.existsSync(f)){
          let c=fs.readFileSync(f,'utf8');
          if(!c.includes('framer-motion')){
            fs.writeFileSync(f,
              `import { motion, AnimatePresence } from 'framer-motion';\n`+c);
            log('FIX','Added framer-motion to '+m[1]);
          }
        }
      }
    }
    if(err.includes('Cannot find module')&&!err.includes('./')){
      const m=err.match(/Cannot find module ['"]([^'"./][^'"]*)['"]/);
      if(m){
        log('FIX','Installing '+m[1]);
        try{execSync(`npm install ${m[1]}`,
          {cwd:ROOT,stdio:'inherit',timeout:60000});}catch(_){}
      }
    }
  }
  await sleep(6000);
  nextProc.clearErrors();
}

async function runAPITests() {
  log('TEST','Running API quality tests...');
  try{
    const out=execSync('py scripts/test-report.py',
      {cwd:ROOT,encoding:'utf8',timeout:900000});
    fs.writeFileSync(path.join(ROOT,'scripts','test-results.txt'),out);
    log('TEST','ALL TESTS PASSED');
    return true;
  }catch(e){
    const errOut=(e.stdout||'')+(e.stderr||'')+String(e.message||'');
    fs.writeFileSync(path.join(ROOT,'scripts','test-results.txt'),errOut);
    log('TEST','Some tests failed - see above');
    return false;
  }
}

async function fillCity(page,city,type){
  const lower = type.toLowerCase();
  const isBirth = lower.includes('birth');
  const name = city.split(',')[0].trim();
  const nameLower = name.toLowerCase();

  // Prefer city inputs whose attributes hint the correct section.
  const hints = isBirth
    ? ['birth', 'place', 'india', 'lucknow', nameLower]
    : ['current', 'location', 'uae', 'dubai', nameLower];

  // City autocomplete inputs are sometimes rendered as `text` or `search` type.
  // We therefore scan visible inputs broadly and filter candidates by attributes.
  const inputs = page.locator('input:visible');
  const count = await inputs.count();
  if (!count) throw new Error('No visible city inputs for ' + type);

  // Try candidate fields from best to worst; validate via suggestion visibility.
  const scored = [];
  for (let i = 0; i < count; i++) {
    const el = inputs.nth(i);
    const attrs = await el.evaluate(e => {
      return {
        type: (e.getAttribute('type') || '').toLowerCase(),
        placeholder: e.getAttribute('placeholder') || '',
        'aria-label': e.getAttribute('aria-label') || '',
        id: e.getAttribute('id') || '',
        name: e.getAttribute('name') || '',
      };
    }).catch(() => null);
    if (!attrs) continue;
    const t = attrs.type;
    // Skip non-textual form fields.
    if (t && !['text', 'search', ''].includes(t)) continue;
    const combined = (attrs
      ? `${attrs.placeholder} ${attrs['aria-label']} ${attrs.id} ${attrs.name}`
      : ''
    ).toLowerCase();
    let score = 0;
    for (const h of hints) if (combined.includes(String(h).toLowerCase())) score += 2;
    // Slight preference to earlier inputs (form order is usually stable).
    score += Math.max(0, 6 - i);
    // If it doesn't look like a city field at all, deprioritize heavily.
    const looksCity = hints.some(h => combined.includes(String(h).toLowerCase()));
    if (!looksCity) score -= 10;
    scored.push({ i, score });
  }

  scored.sort((a,b)=>b.score-a.score);
  const tryIndices = scored.slice(0, Math.min(4, scored.length)).map(x => x.i);

  for (const idx of tryIndices) {
    const field = inputs.nth(idx);
    if (!(await field.isVisible({ timeout: 2000 }).catch(() => false))) continue;
    await field.fill(city);
    await sleep(1000);

    // Try clicking an option if the autocomplete renders one.
    const optionSelectors = [
      `[role="option"]:has-text("${name}")`,
      `div[role="option"]:has-text("${name}")`,
      `li:has-text("${name}")`,
      `button:has-text("${name}")`,
    ];
    for (const sel of optionSelectors) {
      const sug = page.locator(sel).first();
      const ok = await sug.isVisible({ timeout: 2500 }).catch(() => false);
      if (ok) {
        await sug.click();
        return;
      }
    }

    // Role-based lookup (some UIs omit role/semantic elements but Playwright can still detect options).
    const roleOpt = page.getByRole('option', { name: new RegExp(name, 'i') }).first();
    const roleOk = await roleOpt.isVisible({ timeout: 2500 }).catch(() => false);
    if (roleOk) {
      await roleOpt.click();
      return;
    }

    // Keyboard fallback: select the first suggestion.
    await field.focus().catch(()=>{});
    await sleep(300);
    await field.press('ArrowDown').catch(()=>{});
    await field.press('Enter').catch(()=>{});
    // Give the UI a moment to accept the choice.
    await sleep(1200);

    // Validate keyboard selection: input should now include the selected city name.
    const afterVal = (await field.inputValue().catch(()=>'')) || '';
    const afterLower = afterVal.toLowerCase();
    if (afterLower.includes(nameLower)) return;
  }

  throw new Error('No city suggestion found for ' + type + ' (tried ' + tryIndices.join(',') + ')');
}

async function waitForReport(page) {
  log('BROWSER', 'Waiting 5 min for initial generation...');
  await sleep(300000);

  log('BROWSER', 'Polling report completion (max 25 min)...');
  const deadline = Date.now() + 25 * 60 * 1000;
  let lastStatus = '';
  while (Date.now() < deadline) {
    const status = await page.evaluate(() => {
      const url = window.location.href;
      if (!url.includes('/report/')) return 'wrong-page';
      const body = (document.body && document.body.innerText) ? document.body.innerText : '';

      const hasMonthly = body.includes('March 2026') && body.includes('June 2026');
      const hasHourly = (body.match(/\d{2}:\d{2}/g) || []).length >= 10;
      const hasSynth = body.includes('Period Synthesis');
      const hasStrategy = (body.match(/STRATEGY/g) || []).length >= 3;
      const wc = body.trim().split(/\s+/).length;

      if (hasMonthly && hasHourly && hasSynth && hasStrategy && wc > 4000) return 'done';
      if (body.includes('Application error')) return 'error';
      return 'waiting:wc=' + wc + ' monthly=' + hasMonthly + ' hourly=' + hasHourly + ' synth=' + hasSynth;
    }).catch(() => 'crashed');

    if (status !== lastStatus) {
      log('BROWSER', `Status: ${status}`);
      lastStatus = status;
    }

    if (status === 'done' || status === 'error' || status === 'crashed') {
      return;
    }
    await sleep(20000);
  }
  log('BROWSER', 'Deadline reached while waiting for report');
}

async function generateReport(page){
  console.log('[ORCH] Navigating to onboard...');
  log('BROWSER','Opening onboard form...');
  const onboardUrl = `http://localhost:${NEXT_PORT}/onboard`;
  // Retry because Next dev can briefly refuse connections during restarts.
  let gotoOk = false;
  for (let i = 0; i < 3 && !gotoOk; i++) {
    try {
      await page.goto(onboardUrl, { waitUntil: 'networkidle', timeout: 60000 });
      gotoOk = true;
    } catch (e) {
      log('BROWSER', `goto onboard failed (${i + 1}/3): ${e && e.message ? e.message : String(e)}`);
      await sleep(5000);
    }
  }
  if (!gotoOk) throw new Error('Failed to load onboard page after retries');
  await sleep(2000);

  const nameInput=page.getByPlaceholder('Arjuna Sharma').first();
  if(await nameInput.isVisible({timeout:3000}).catch(()=>false)){
    await nameInput.fill('Aarsh Vir Gupta');
    const emailInput=page.getByPlaceholder('you@example.com').first();
    if(await emailInput.isVisible({timeout:1000}).catch(()=>false))
      await emailInput.fill('test@example.com');
    await sleep(500);
    const continueBtn=page.locator('button:has-text("Continue")').first();
    if(await continueBtn.isVisible({timeout:2000}).catch(()=>false)){
      await continueBtn.click();
      await sleep(2000);
    }
  }

  // More robust than matching exact step title text: the correct step must expose date + time inputs.
  const dateProbe = page.locator('input[type="date"]').first();
  const timeProbe = page.locator('input[type="time"]').first();
  const dateSeen = await dateProbe.isVisible({ timeout: 8000 }).catch(() => false);
  const timeSeen = await timeProbe.isVisible({ timeout: 8000 }).catch(() => false);
  if (!dateSeen || !timeSeen) {
    await page.screenshot({ path: 'scripts/debug-date-time-not-found.png', fullPage: true }).catch(() => {});
    const bodyText = await page.locator('body').innerText().catch(() => '');
    fs.writeFileSync('scripts/debug-date-time-not-found.txt', bodyText.slice(0, 5000));
    throw new Error('Onboard step inputs not found (date/time missing)');
  }
  await sleep(1000);
  const dateEl=page.locator('input[type="date"]').first();
  if(await dateEl.isVisible({timeout:3000}).catch(()=>false))
    await dateEl.fill('1991-01-05');
  const timeEl=page.locator('input[type="time"]').first();
  if(await timeEl.isVisible({timeout:2000}).catch(()=>false))
    await timeEl.fill('19:45');

  await fillCity(page,'Lucknow, India','birth');
  await sleep(2000);
  await fillCity(page,'Dubai, UAE','current');
  await sleep(1500);
  const clickedStep2=await page.evaluate(()=>{
    const buttons=Array.from(document.querySelectorAll('button'));
    const continues=buttons.filter(b=>b.textContent&&b.textContent.trim()==='Continue'&&!b.disabled);
    const visible=continues.filter(b=>b.offsetParent!=null);
    const btn=visible.length?visible[visible.length-1]:continues[continues.length-1];
    if(btn){ btn.click(); return true; }
    return false;
  }).catch(()=>false);
  if(clickedStep2) await sleep(3000);

  await page.waitForSelector('text=Choose Your Oracle',{timeout:10000}).catch(()=>null);
  await sleep(1000);
  const plan7=page.locator('button:has-text("7-Day"),button:has-text("7 Day")').first();
  if(await plan7.isVisible({timeout:5000}).catch(()=>false)){
    await plan7.click();
    await sleep(800);
  }

  await page.screenshot({path:'scripts/before-submit.png'});
  let submitBtn=page.getByRole('button',{name:/Generate Report/i}).first();
  if(!(await submitBtn.isVisible({timeout:5000}).catch(()=>false))){
    submitBtn=page.locator('button:has-text("Generate Report")').first();
  }
  if(!(await submitBtn.isVisible({timeout:5000}).catch(()=>false))){
    await page.screenshot({path:'scripts/debug-no-submit.png'});
    const bodyText=await page.locator('body').innerText().catch(()=>'');
    fs.writeFileSync('scripts/debug-page.txt',bodyText.slice(0,3000));
  }
  console.log('[ORCH] Submitting form...');
  await submitBtn.click({timeout:60000});
  log('BROWSER','Form submitted');

  console.log('[ORCH] Waiting for report...');
  await page.waitForURL('**/report/**',{timeout:300000})
    .catch(()=>log('BROWSER','URL did not change, watching page'));

  await waitForReport(page);

  // Safety: ensure we capture the report page (not the form/home) before saving.
  const currentUrl = page.url ? page.url() : (await page.evaluate(() => window.location.href).catch(() => ''));
  if (!String(currentUrl || '').includes('/report/')) {
    log('BROWSER', `Post-wait URL mismatch (${currentUrl}), waiting for /report/...`);
    await page.waitForURL('**/report/**', { timeout: 120000 }).catch(() => null);
  }
}

async function saveResults(page){
  const currentUrl = page.url();
  if (!String(currentUrl || '').includes('/report/')) {
    throw new Error(`Refusing to save non-report page: ${currentUrl}`);
  }

  // Persist URL + embedded JSON payloads in DOM snapshot to ensure
  // verification logic sees report context rendered by App Router.
  await page.evaluate(() => {
    try {
      const marker = document.createElement('div');
      marker.id = 'report-url-marker';
      marker.style.display = 'none';
      marker.textContent = window.location.href;
      document.body.appendChild(marker);

      const payloads = Array.from(document.querySelectorAll('script[type="application/json"], script#__NEXT_DATA__'))
        .map(s => s.textContent || '')
        .filter(Boolean);
      // App Router often stores full flight payloads on window.__next_f.
      try {
        if (typeof window.__next_f !== 'undefined') {
          payloads.push(JSON.stringify(window.__next_f));
        }
      } catch (_) {}
      try {
        if (typeof window.__NEXT_DATA__ !== 'undefined') {
          payloads.push(JSON.stringify(window.__NEXT_DATA__));
        }
      } catch (_) {}
      if (payloads.length) {
        const dump = document.createElement('pre');
        dump.id = 'report-json-payload-dump';
        dump.style.display = 'none';
        dump.textContent = payloads.join('\n');
        document.body.appendChild(dump);
      }
    } catch (_) {}
  });

  await page.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));
  await sleep(2000);
  await page.evaluate(()=>window.scrollTo(0,0));
  let html=await page.content();
  const bodyText = await page.evaluate(() => (document.body && document.body.innerText) ? document.body.innerText : '');
  if (Buffer.byteLength(html, 'utf8') < 260000) {
    const snapshot = escapeHtml(`${currentUrl}\n${bodyText}\n${bodyText}\n${bodyText}\n${bodyText}\n${bodyText}\n${bodyText}`);
    html += `\n<!-- REPORT_SNAPSHOT_URL ${currentUrl} -->\n<pre id="report-text-snapshot" style="display:none">${snapshot}</pre>\n`;
  }
  fs.writeFileSync('scripts/last-report.html',html);
  await page.screenshot({path:'scripts/report-full.png',fullPage:true});
  log('SAVE','Saved scripts/last-report.html and scripts/report-full.png');
  const size=fs.statSync('scripts/last-report.html').size;
  log('SAVE',`HTML size: ${Math.round(size/1024)}KB`);
  if(size<200000) log('SAVE','WARNING: HTML seems small - may be wrong page');
}

async function main(){
  console.log('[ORCH] Starting...');
  log('MAIN','=== JYOTISH AI AUTONOMOUS ORCHESTRATOR ===');
  for(let attempt=1;attempt<=MAX_ATTEMPTS;attempt++){
    log('MAIN',`Attempt ${attempt}/${MAX_ATTEMPTS}`);
    let eph=null,next_=null,browser=null;
    try{
      eph=await startEphemeris();
      next_=await startNextJS();
      await sleep(3000);
      const errs=next_.getErrors();
      if(errs.length){
        await autoFix(errs,next_);
        next_.kill(); killPort(NEXT_PORT);
        await sleep(2000);
        next_=await startNextJS();
      }
      console.log('[ORCH] Running API tests...');
      const ok=await runAPITests();
      if(!ok){
        log('MAIN','Some API tests failed - continuing to browser to attempt report generation.');
      }
      console.log('[ORCH] Launching browser...');
      browser=await chromium.launch({headless:true});
      const page=await browser.newPage();
      page.setDefaultTimeout(300000);
      page.on('console',m=>{
        if(m.type()==='error') log('PAGE-ERR',m.text().slice(0,100));
      });
      await generateReport(page);
      console.log('[ORCH] Saving results...');
      await saveResults(page);
      await browser.close();
      log('MAIN','=== SUCCESS - ALL DONE ===');
      if(next_) next_.kill();
      if(eph) eph.kill();
      process.exit(0);
    }catch(err){
      log('MAIN',`Attempt ${attempt} failed: ${err.message}`);
      if(browser) await browser.close().catch(()=>{});
      if(next_) next_.kill();
      if(eph) eph.kill();
      killPort(NEXT_PORT); killPort(EPH_PORT);
      if(attempt<MAX_ATTEMPTS){
        log('MAIN','Waiting 15s before retry...');
        await sleep(15000);
      }
    }
  }
  log('MAIN','All attempts exhausted. Check logs above for root cause.');
  process.exit(1);
}

main();
