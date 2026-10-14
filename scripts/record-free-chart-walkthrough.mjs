import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync, spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'public', 'walkthroughs');
const verificationOutput = path.join(root, 'artifacts', 'customer-experience', 'walkthrough');
const ffmpeg = process.env.FFMPEG_PATH || 'ffmpeg';
const ffprobe = process.env.FFPROBE_PATH || 'ffprobe';
const base = new URL(process.env.WALKTHROUGH_BASE_URL || 'http://127.0.0.1:3100');
assert(['127.0.0.1', 'localhost'].includes(base.hostname) && base.port === '3100', 'Recording is limited to the local test server on port 3100.');
const fps = 8;
const targetSeconds = 40;
const sizes = { desktop: { width: 1280, height: 900 }, mobile: { width: 390, height: 844 } };
const selected = process.argv.find(arg => arg.startsWith('--viewport='))?.split('=')[1] || 'both';
assert(['desktop', 'mobile', 'both'].includes(selected));
const sleep = ms => new Promise(resolve => setTimeout(resolve, Math.max(0, ms)));

function run(command, args) {
  return execFileSync(command, args, { cwd: root, encoding: 'utf8', windowsHide: true, maxBuffer: 8 * 1024 * 1024 });
}

async function sourceVersion() {
  const files = [...new Set(run('git', ['ls-files', '--cached', '--others', '--exclude-standard', '--', 'src', 'package.json', 'package-lock.json', 'next.config.mjs', 'tailwind.config.ts']).trim().split(/\r?\n/).filter(Boolean))].sort();
  const hash = createHash('sha256');
  const uiHash = createHash('sha256');
  const uiFiles = [];
  const visibleDependencies = new Set([
    'src/app/layout.tsx', 'src/app/globals.css', 'src/app/free-kundli/page.tsx',
    'src/components/forms/BirthDetailsInput.tsx',
    'src/components/shared/Navbar.tsx', 'src/components/shared/Footer.tsx', 'src/components/shared/ShareResult.tsx',
    'src/components/ui/StarField.tsx', 'src/components/analytics/PostHogProvider.tsx',
    'src/app/api/tools/chart/route.ts', 'src/app/api/geocode/route.ts',
    'src/lib/utils/coords.ts', 'src/lib/kundli/doshas.ts', 'src/lib/kundli/varga.ts',
    'src/lib/api/rateLimit.ts', 'package.json', 'package-lock.json', 'next.config.mjs', 'tailwind.config.ts',
  ]);
  for (const file of files) {
    const content = await readFile(path.join(root, file));
    hash.update(file).update('\0').update(content).update('\0');
    if (visibleDependencies.has(file) || file.startsWith('src/components/tools/') || file.startsWith('src/components/seo/') || (file.startsWith('src/lib/tools/') && !file.includes('test'))) {
      uiHash.update(file).update('\0').update(content).update('\0');
      uiFiles.push(file);
    }
  }
  return {
    label: 'current tested worktree; pending release SHA',
    baseCommit: run('git', ['rev-parse', 'HEAD']).trim(),
    sourceSha256: hash.digest('hex'), sourceFileCount: files.length,
    recordedUiSha256: uiHash.digest('hex'), recordedUiFiles: uiFiles,
    releaseSha: null,
  };
}

function probe(file) {
  return JSON.parse(run(ffprobe, ['-v', 'error', '-count_frames', '-show_streams', '-show_format', '-of', 'json', file]));
}

function timeSeconds(value) {
  const [h, m, s] = value.split(':').map(Number);
  return h * 3600 + m * 60 + s;
}

async function verifyCaptions(file, duration) {
  const text = await readFile(file, 'utf8');
  assert(text.startsWith('WEBVTT\n'), 'Captions must be English WebVTT.');
  const cues = [...text.matchAll(/(\d{2}:\d{2}:\d{2}\.\d{3}) --> (\d{2}:\d{2}:\d{2}\.\d{3})/g)];
  assert(cues.length >= 6, 'Captions must describe the complete task.');
  let previous = 0;
  for (const cue of cues) {
    const start = timeSeconds(cue[1]);
    const end = timeSeconds(cue[2]);
    assert(start >= previous && end > start && end <= duration, 'Caption timing exceeds or overlaps the recording.');
    previous = end;
  }
  assert(/Fictional/.test(text), 'Fictional example must be labelled.');
  return { language: 'en', cueCount: cues.length, lastEndSeconds: previous, withinDuration: true };
}

function extractFrame(video, seconds, file) {
  run(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', '-ss', String(seconds), '-i', video, '-frames:v', '1', '-q:v', '2', file]);
}

function nonblankFrame(file) {
  const process = spawn(ffmpeg, ['-hide_banner', '-i', file, '-vf', 'signalstats,metadata=print', '-frames:v', '1', '-f', 'null', '-'], { windowsHide: true });
  let diagnostic = '';
  process.stdout.on('data', data => { diagnostic += data; });
  process.stderr.on('data', data => { diagnostic += data; });
  return new Promise((resolve, reject) => {
    process.on('error', reject);
    process.on('close', code => {
      if (code !== 0) { reject(new Error('Frame verification failed')); return; }
      const get = name => Number(diagnostic.match(new RegExp(`lavfi.signalstats.${name}=([\\d.]+)`))?.[1]);
      const minimum = get('YMIN');
      const maximum = get('YMAX');
      const average = get('YAVG');
      if (!Number.isFinite(average) || maximum - minimum < 40 || average < 5) { reject(new Error('Blank or illegible captured frame')); return; }
      resolve({ minimumLuma: minimum, maximumLuma: maximum, averageLuma: average, nonblank: true });
    });
  });
}

async function verifyVideo(name) {
  const file = path.join(output, `free-chart-${name}.mp4`);
  const metadata = probe(file);
  const stream = metadata.streams.find(s => s.codec_type === 'video');
  const duration = Number(metadata.format.duration);
  assert(stream?.codec_name === 'h264' && stream.pix_fmt === 'yuv420p');
  assert(stream.width === sizes[name].width && stream.height === sizes[name].height);
  assert(duration >= 30 && duration <= 45, `Expected a 30-45 second walkthrough, received ${duration}s.`);
  assert(Number(stream.nb_read_frames) >= 240, 'Too few continuously captured frames.');
  assert(!metadata.streams.some(s => s.codec_type === 'audio'), 'No synthetic narrator or audio is allowed.');
  const samples = [];
  await mkdir(verificationOutput, { recursive: true });
  for (const seconds of [0.5, 6, 14, 20, 30, duration - 2]) {
    const frame = path.join(verificationOutput, `free-chart-${name}-${String(seconds).replace('.', '-')}.jpg`);
    extractFrame(file, seconds, frame);
    samples.push({ seconds, path: path.relative(root, frame).replaceAll('\\', '/'), ...await nonblankFrame(frame) });
  }
  extractFrame(file, duration - 2, path.join(output, `free-chart-${name}-poster.jpg`));
  return {
    video: `free-chart-${name}.mp4`, poster: `free-chart-${name}-poster.jpg`,
    captions: `free-chart-${name}.en.vtt`, transcript: 'free-chart-transcript.md',
    codec: stream.codec_name, pixelFormat: stream.pix_fmt,
    width: stream.width, height: stream.height,
    durationSeconds: duration, frameRate: stream.avg_frame_rate,
    decodedFrames: Number(stream.nb_read_frames), bytes: Number(metadata.format.size),
    hasAudio: false, captionVerification: await verifyCaptions(path.join(output, `free-chart-${name}.en.vtt`), duration),
    sampledFrames: samples,
  };
}

async function record(browser, name) {
  const version = await sourceVersion();
  const context = await browser.newContext({ viewport: sizes[name], deviceScaleFactor: 1, locale: 'en-GB', timezoneId: 'Asia/Dubai', reducedMotion: 'reduce' });
  const requests = { chart: 0, geocode: 0, otherApiBlocked: 0, externalBlocked: 0 };
  const chartFacts = [];
  await context.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.origin !== base.origin) { requests.externalBlocked++; await route.abort(); return; }
    if (url.pathname === '/api/tools/chart') { requests.chart++; await route.continue(); return; }
    if (url.pathname === '/api/geocode') { requests.geocode++; await route.continue(); return; }
    if (url.pathname.startsWith('/api/')) { requests.otherApiBlocked++; await route.fulfill({ status: 204, body: '' }); return; }
    await route.continue();
  });
  const page = await context.newPage();
  page.setDefaultTimeout(12_000);
  page.on('response', response => {
    if (new URL(response.url()).pathname === '/api/tools/chart') {
      chartFacts.push(response.json().then(data => ({ status: response.status(), lagna: data.lagna, moon_sign: data.moon_sign, doshasReturned: Boolean(data.doshas), gateFieldPresent: Object.hasOwn(data, 'doshas_locked') })));
    }
  });
  let encoder;
  let capture;
  let finishEncoding;
  let stopped = false;
  let encoderError;
  let frameCount = 0;
  let recordingStart;
  const capturedTimes = [];
  const actions = [];
  try {
    await page.goto(new URL('/free-kundli', base).href, { waitUntil: 'networkidle' });
    await page.getByLabel('Birth date', { exact: true }).waitFor();
    assert.equal(await page.getByLabel('Birth time (24-hour)').inputValue(), '', 'Time must not be prefilled.');
    await page.evaluate(() => window.scrollTo(0, 0));
    encoder = spawn(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'image2pipe', '-vcodec', 'mjpeg', '-framerate', String(fps), '-i', 'pipe:0', '-an', '-vf', 'scale=in_range=pc:out_range=tv,format=yuv420p', '-c:v', 'libx264', '-preset', 'fast', '-crf', '23', '-threads', '2', '-pix_fmt', 'yuv420p', '-color_range', 'tv', '-movflags', '+faststart', path.join(output, `free-chart-${name}.mp4`)], { windowsHide: true, stdio: ['pipe', 'ignore', 'pipe'] });
    let encoderDiagnostic = '';
    encoder.stderr.on('data', data => { encoderDiagnostic += data; });
    encoder.stdin.on('error', error => { encoderError = error; });
    finishEncoding = new Promise((resolve, reject) => {
      encoder.on('error', reject);
      encoder.on('close', code => code === 0 ? resolve() : reject(new Error(`Video encoder failed: ${encoderDiagnostic.slice(-1000)}`)));
    });
    finishEncoding.catch(() => {});
    recordingStart = performance.now();
    // Each frame is a fresh browser screenshot, sampled throughout all actions and waits.
    capture = (async () => {
      while (!stopped) {
        await sleep(recordingStart + frameCount * 1000 / fps - performance.now());
        if (stopped) break;
        if (encoderError) throw encoderError;
        const frame = await page.screenshot({ type: 'jpeg', quality: 85, fullPage: false, animations: 'allow', timeout: 8_000 });
        capturedTimes.push((performance.now() - recordingStart) / 1000);
        if (!encoder.stdin.write(frame)) await once(encoder.stdin, 'drain');
        frameCount++;
      }
    })();
    capture.catch(() => {});
    async function at(seconds, action, fn) {
      await sleep(recordingStart + seconds * 1000 - performance.now());
      const entry = { action, startSeconds: (performance.now() - recordingStart) / 1000 };
      await fn();
      entry.endSeconds = (performance.now() - recordingStart) / 1000;
      actions.push(entry);
    }
    await at(4, 'Enter fictional birth date', () => page.getByLabel('Birth date', { exact: true }).fill('1990-05-15'));
    await at(8, 'Choose known birth time', () => page.getByLabel('Birth time certainty').selectOption('known'));
    await at(10, 'Enter local birth time', () => page.getByLabel('Birth time (24-hour)').fill('09:30:00'));
    await at(12, 'Type New Delhi, India', async () => {
      const input = page.getByLabel('Birth city and country');
      await input.click();
      await input.pressSequentially('New Delhi, India', { delay: 100 });
    });
    await at(15, 'Search the real geocoding service', async () => {
      await page.getByRole('button', { name: 'Search city', exact: true }).click();
      await page.getByRole('radio', { name: /New Delhi.*India/i }).first().waitFor();
    });
    await at(18, 'Select and confirm New Delhi', async () => {
      await page.getByRole('radio', { name: /New Delhi.*India/i }).first().click();
      await page.getByText(/^Selected:/).waitFor();
      assert.equal(await page.getByRole('checkbox', { name: /Save my draft/ }).isChecked(), false);
    });
    await at(24, 'Calculate the real free chart', async () => {
      await page.getByRole('button', { name: 'Calculate free', exact: true }).click();
      await page.getByRole('region', { name: 'Calculation result' }).waitFor({ timeout: 26_000 });
      const facts = await Promise.all(chartFacts);
      assert.equal(facts.length, 1, 'Exactly one genuine chart calculation must complete.');
      assert.deepEqual(facts[0], { status: 200, lagna: 'Gemini', moon_sign: 'Sagittarius', doshasReturned: true, gateFieldPresent: false });
    });
    await at(29, 'Scroll to the actual calculated facts', async () => {
      const region = page.getByRole('region', { name: 'Calculation result' });
      const box = await region.boundingBox();
      assert(box);
      await page.mouse.move(sizes[name].width / 2, sizes[name].height / 2);
      await page.mouse.wheel(0, box.y - 105);
      await sleep(700);
      for (const fact of ['Gemini', 'Sagittarius']) {
        const value = region.getByText(fact, { exact: true });
        assert(await value.isVisible());
        const bounds = await value.boundingBox();
        assert(bounds && bounds.y >= 0 && bounds.y + bounds.height <= sizes[name].height, 'Final facts must be in the captured viewport.');
      }
      assert.equal(await page.locator('input[type=email]').count(), 0);
      assert.equal(await page.evaluate(() => localStorage.getItem('vh_calculator_v1')), null);
    });
    await sleep(recordingStart + targetSeconds * 1000 - performance.now());
    stopped = true;
    await capture;
    encoder.stdin.end();
    await finishEncoding;
    const elapsedSeconds = (performance.now() - recordingStart) / 1000;
    const largestCaptureGapSeconds = Math.max(...capturedTimes.slice(1).map((time, i) => time - capturedTimes[i]));
    assert(largestCaptureGapSeconds < 1, 'Capture was interrupted; do not describe this as continuous.');
    const encoded = await verifyVideo(name);
    assert(Math.abs(encoded.durationSeconds - elapsedSeconds) < 1, 'Recording cannot speed up or omit long waits.');
    const after = await sourceVersion();
    assert.equal(after.recordedUiSha256, version.recordedUiSha256, 'Recorded calculator or visible UI source changed during recording; rerun against a stable worktree.');
    return { ...encoded, recordingVersion: version, sourceSha256After: after.sourceSha256,
      unrelatedSourceChangedDuringRecording: after.sourceSha256 !== version.sourceSha256,
      capturedFrames: frameCount, largestCaptureGapSeconds, elapsedSeconds, actions, genuineChartResult: (await Promise.all(chartFacts))[0], requests };
  } finally {
    stopped = true;
    if (capture) await capture.catch(() => {});
    if (encoder && !encoder.stdin.destroyed) encoder.stdin.end();
    if (finishEncoding) await finishEncoding.catch(() => {});
    await context.close();
  }
}

async function main() {
  await mkdir(output, { recursive: true });
  if (process.argv.includes('--verify-only')) {
    const names = selected === 'both' ? Object.keys(sizes) : [selected];
    for (const name of names) console.log(JSON.stringify(await verifyVideo(name)));
    return;
  }
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const recordings = [];
  try {
    for (const name of selected === 'both' ? Object.keys(sizes) : [selected]) {
      console.log(`Recording actual ${name} calculator task continuously at ${fps} frames/second.`);
      recordings.push(await record(browser, name));
      console.log(`${name} verified: ${recordings.at(-1).durationSeconds}s, ${recordings.at(-1).decodedFrames} frames.`);
    }
  } finally { await browser.close(); }
  const manifest = {
    createdAt: new Date().toISOString(),
    recordingVersion: 'current tested worktree; pending release SHA',
    method: 'Continuous, fresh browser viewport JPEG captures piped to local FFmpeg at 8 fps. No montage, substituted screen or sped-up wait.',
    sourceUrl: 'http://localhost:3100/free-kundli',
    fictionalExample: { birthDate: '1990-05-15', birthTimeLocal: '09:30:00', birthCity: 'New Delhi, India' },
    presenter: false, narration: false, audio: false,
    limitation: 'The preferred natural presenter in the bottom-right is NOT provided. This is a silent, captioned browser recording, not a presenter video.',
    calculatorAndGeocodeMocked: false, analyticsAndUnrelatedApisBlocked: true,
    accountEmailPaymentActions: false, billedServicesUsed: false,
    license: 'CC BY 4.0 for the newly authored recording, extracted posters, captions and transcript; underlying marks/fonts remain with their owners.',
    nativeControlsAndCaptions: 'Intended for a native HTML video player with controls and an English captions track; help integration is separate.',
    recordings,
  };
  await mkdir(verificationOutput, { recursive: true });
  await writeFile(path.join(verificationOutput, 'free-chart-recording-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  console.log('Saved public media in public/walkthroughs and private QA receipts in artifacts/customer-experience/walkthrough. No release SHA or deployment is claimed.');
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
