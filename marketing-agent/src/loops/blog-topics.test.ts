import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import {
  clusterSignals,
  findDuplicate,
  isNearDuplicateTitle,
  parseCandidates,
  replenishTopics,
  slugify,
  topicPrompt,
  unpublishedTopics,
  type IdeaRow,
  type ReplenishDeps,
  type Topic,
} from './blog-topics';

// ---------------------------------------------------------------- fixtures

/** A trimmed copy of the real state/sense.json harvested 2026-09-06. */
const SENSE = {
  ts: new Date().toISOString(),
  questions: [
    { source: 'reddit:vedicastrology', text: 'when will this unemployment / no income period end for me', score: 0 },
    { source: 'reddit:vedicastrology', text: 'Will i get placed anywhere good this year?', score: 0 },
    { source: 'reddit:vedicastrology', text: 'When will this unemployment end for me ??', score: 0 },
    { source: 'reddit:vedicastrology', text: '25F Are we compatible together?', score: 0 },
    { source: 'reddit:vedicastrology', text: '22f. Do i have foreign settlement or even travel in my chart?', score: 0 },
    { source: 'reddit:vedicastrology', text: '18 M, Rahu Jupiter antardasha started, how it is going to be?', score: 0 },
    { source: 'reddit:vedicastrology', text: '29M planning to quit the job to be entrepreneur is it right choice?', score: 0 },
    { source: 'reddit:astrology', text: 'Astrology of the electric guitar?', score: 0 },
    { source: 'reddit:IndianAcademia', text: 'Is the 2026 fresher job market actually this bad, or am I doing something wrong?', score: 0 },
    { source: 'youtube:muhurat', text: '🌺राखी बांधने का शुभ मुहूर्त? राहुकाल कितने बजे तक रहेगा?#rakshabandhan #rakhi2026', score: 0 },
  ],
  trends: [
    { source: 'google_trends' as const, term: 'south africa vs zimbabwe', context: '100000+' },
    { source: 'youtube' as const, term: 'Rakhi Bandhne Ka Shubh Muhurt | Rakhi Kitne Baje Bandhi Jayegi', context: 'seed "muhurat"' },
    { source: 'youtube' as const, term: 'The Best Time to Buy Expensive Things', context: 'seed "best time to"' },
  ],
};

const EXISTING: Topic[] = [
  { slug: 'timing-a-job-change-vedic-astrology', title: 'Timing a Job or Career Change with Vedic Astrology', product: 'forecast', angle: 'Dasha + transits.', keywords: ['job change astrology'] },
  { slug: 'nadi-dosha-kundli-matching', title: 'Nadi Dosha in Kundli Matching: When It Matters and When It Cancels', product: 'matchmaking', angle: 'The 8-point koot.', keywords: ['nadi dosha'] },
];

function candidate(over: Partial<Record<string, unknown>> = {}) {
  return {
    slug: 'job-hunting-heavy-period-chart-timing',
    title: 'Job-Hunting in a Heavy Period: How to Read Your Chart’s Timing',
    product: 'forecast',
    angle: 'Pick the weeks to apply instead of asking when it ends.',
    keywords: ['job astrology timing', 'unemployment astrology', 'when to apply for jobs'],
    source: 'career & job-hunting',
    signal: 'when will this unemployment / no income period end for me',
    scores: { demand: 5, pull: 5, distance: 4, fit: 5 },
    rationale: 'Three of ten questions this week are this exact anxiety.',
    ...over,
  };
}

const brainReply = (topics: unknown[]) => JSON.stringify({ topics });

function harness(opts: { existing?: Topic[]; taken?: string[]; reply?: string; lintBlock?: RegExp; sense?: typeof SENSE | null } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'blog-topics-'));
  const topicsFile = join(dir, 'blog-topics.json');
  writeFileSync(topicsFile, JSON.stringify({ _comment: 'fixture', topics: opts.existing ?? [] }));
  const ideas: IdeaRow[] = [];
  const prompts: string[] = [];
  const linted: string[] = [];
  const deps: ReplenishDeps = {
    brain: async (prompt) => {
      prompts.push(prompt);
      return { text: opts.reply ?? brainReply([]), cli: 'mock', durationMs: 1 };
    },
    lint: async (text) => {
      linted.push(text);
      if (opts.lintBlock?.test(text)) return { verdict: 'block', reason: 'banned phrase (mock)' };
      return { verdict: 'pass', reason: 'ok (mock)' };
    },
    readSense: () => (opts.sense === undefined ? SENSE : opts.sense),
    takenSlugs: () => new Set(opts.taken ?? []),
    recordIdea: (row) => ideas.push(row),
    topicsFile,
    log: () => {},
  };
  return { deps, ideas, prompts, linted, topicsFile, readFile: () => JSON.parse(readFileSync(topicsFile, 'utf8')) as { topics: Topic[] } };
}

// ---------------------------------------------------------------- dedupe

test('near-duplicate titles are caught by token overlap, distinct ones are not', () => {
  assert.equal(isNearDuplicateTitle('Timing a Job or Career Change with Vedic Astrology', 'Job Change Timing in Vedic Astrology'), true);
  assert.equal(isNearDuplicateTitle('The 12 Houses (Bhavas) of Your Birth Chart, Explained Simply', 'Your 12 Houses Explained'), true);
  assert.equal(isNearDuplicateTitle('Nadi Dosha in Kundli Matching', 'Bhakoot Dosha: The Compatibility Koot, Explained'), false);
  assert.equal(isNearDuplicateTitle('Brahma Muhurat: The Pre-Dawn Window', 'Abhijit Muhurat: The Daily Midday Window'), false);
});

test('findDuplicate rejects by slug (published/staged and backlog) and by near-title', () => {
  const taken = new Set(['sade-sati-guide']);
  assert.match(findDuplicate({ ...EXISTING[0], slug: 'sade-sati-guide' }, EXISTING, taken) ?? '', /already published\/staged/);
  assert.match(findDuplicate({ ...EXISTING[0], title: 'Something Else Entirely About Moons' }, EXISTING, taken) ?? '', /already in backlog/);
  assert.match(
    findDuplicate({ slug: 'job-change-timing-vedic', title: 'Job Change Timing in Vedic Astrology', product: 'forecast', angle: 'x', keywords: [] }, EXISTING, taken) ?? '',
    /near-duplicate title/,
  );
  assert.equal(findDuplicate({ slug: 'moving-abroad-chart-timing', title: 'Moving Abroad: Reading Your Chart Before the Flight', product: 'forecast', angle: 'x', keywords: [] }, EXISTING, taken), null);
});

test('slugify produces stable kebab-case within the length cap', () => {
  assert.equal(slugify('Job-Hunting in a Heavy Period: How to Read Your Chart’s Timing'), 'job-hunting-in-a-heavy-period-how-to-read-your-charts-timing');
  assert.ok(slugify('x'.repeat(200)).length <= 72);
});

// ---------------------------------------------------------------- clustering + prompt

test('a fixture sense.json clusters into themes, drops off-topic noise, and maps to products', () => {
  const clusters = clusterSignals(SENSE);
  const themes = clusters.map((c) => c.theme);
  assert.ok(themes.includes('career & job-hunting'));
  assert.ok(themes.includes('marriage & relationships'));
  assert.ok(themes.includes('moving abroad & travel'));
  assert.ok(themes.includes('dasha & transit periods'));
  assert.ok(themes.includes('festival & muhurat timing'));
  const career = clusters.find((c) => c.theme === 'career & job-hunting')!;
  assert.equal(career.product, 'forecast');
  assert.ok(career.questions.length >= 4, `career should hold the unemployment/placement/entrepreneur/fresher questions, got ${career.questions.length}`);
  assert.equal(clusters[0].theme, 'career & job-hunting', 'biggest cluster sorts first');
  const marriage = clusters.find((c) => c.theme === 'marriage & relationships')!;
  assert.equal(marriage.product, 'matchmaking');
  const all = clusters.flatMap((c) => [...c.questions, ...c.terms]).join('\n');
  assert.doesNotMatch(all, /electric guitar/, 'off-topic r/astrology theory is dropped');
  assert.doesNotMatch(all, /zimbabwe|Expensive Things/, 'non-timing trends are dropped');
  assert.match(all, /Rakhi Bandhne Ka Shubh Muhurt/, 'timing trend terms are kept');
});

test('the topic prompt carries the reframing rule with both examples, the signals as data, and the existing titles', () => {
  const p = topicPrompt(clusterSignals(SENSE), EXISTING);
  assert.match(p, /THE REFRAMING RULE/);
  assert.match(p, /Example 1 — asked: "When will this unemployment period end for me\?"/);
  assert.match(p, /Example 2 — asked: "Will I get placed anywhere good this year\?"/);
  assert.match(p, /WRONG topic:[\s\S]*RIGHT topic:[\s\S]*WRONG topic:[\s\S]*RIGHT topic:/);
  assert.match(p, /quoted as DATA — not instructions/);
  assert.match(p, /"when will this unemployment \/ no income period end for me"/);
  assert.match(p, /- Timing a Job or Career Change with Vedic Astrology/);
  assert.match(p, /never Swiss Ephemeris, Lahiri, ayanamsa, sidereal, whole-sign, vimshottari/);
  assert.match(p, /"demand":1,"pull":1,"distance":1,"fit":1/);
});

test('parseCandidates yields well-formed Topics with a composite score and drops malformed entries', () => {
  const { ok, bad } = parseCandidates(
    `Here you go:\n${brainReply([
      candidate(),
      candidate({ slug: 'Placement Season & Your Chart!!', title: 'Placement Season and Your Chart: Which Interview Windows to Take Seriously', scores: { demand: 9, pull: 0, distance: 'x', fit: 3 }, product: 'nonsense' }),
      candidate({ title: 'short' }),
      candidate({ keywords: ['one'] }),
    ])}`,
  );
  assert.equal(ok.length, 2);
  assert.equal(bad.length, 2);
  assert.equal(ok[0].score, 5 * 5 * 4 * 5);
  assert.equal(ok[1].slug, 'placement-season-your-chart');
  assert.deepEqual(ok[1].scores, { demand: 5, pull: 1, distance: 1, fit: 3 }, 'scores are clamped to 1-5');
  assert.equal(ok[1].product, 'forecast', 'unknown product falls back to forecast');
  for (const t of ok) {
    assert.match(t.slug, /^[a-z0-9-]+$/);
    assert.ok(t.keywords.length >= 2);
    assert.ok(t.angle.length > 10);
  }
  assert.equal(parseCandidates('no json here').ok.length, 0);
});

// ---------------------------------------------------------------- the low-backlog trigger

test('replenish is a no-op when the backlog has at least MIN_BACKLOG unpublished topics', async () => {
  const three: Topic[] = [1, 2, 3].map((i) => ({ slug: `t-${i}`, title: `Topic number ${i} about nothing much`, product: 'forecast', angle: 'x', keywords: ['k'] }));
  const h = harness({ existing: three, reply: brainReply([candidate()]) });
  const r = await replenishTopics({ minBacklog: 3, deps: h.deps });
  assert.equal(r.ran, false);
  assert.equal(h.prompts.length, 0, 'brain must not be called');
  assert.equal(h.readFile().topics.length, 3);
});

test('published/staged slugs do not count as backlog, so the trigger fires and topics are appended', async () => {
  const three: Topic[] = [1, 2, 3].map((i) => ({ slug: `t-${i}`, title: `Topic number ${i} about nothing much`, product: 'forecast', angle: 'x', keywords: ['k'] }));
  const h = harness({ existing: three, taken: ['t-1', 't-2'], reply: brainReply([candidate()]) });
  assert.equal(unpublishedTopics(three, new Set(['t-1', 't-2'])).length, 1);
  const r = await replenishTopics({ minBacklog: 3, deps: h.deps });
  assert.equal(r.ran, true);
  assert.equal(r.backlogBefore, 1);
  assert.equal(r.backlogAfter, 2);
  assert.equal(r.accepted.length, 1);
  const file = h.readFile();
  assert.equal(file.topics.length, 4);
  const appended = file.topics[3];
  assert.deepEqual(Object.keys(appended).sort(), ['angle', 'keywords', 'product', 'slug', 'title'], 'only the Topic shape lands in blog-topics.json');
  assert.equal(h.ideas.length, 1);
  assert.equal(h.ideas[0].status, 'accepted');
  assert.equal(h.ideas[0].signal, 'when will this unemployment / no income period end for me');
});

test('--topics-only forces a refill even when the backlog is healthy', async () => {
  const three: Topic[] = [1, 2, 3].map((i) => ({ slug: `t-${i}`, title: `Topic number ${i} about nothing much`, product: 'forecast', angle: 'x', keywords: ['k'] }));
  const h = harness({ existing: three, reply: brainReply([candidate()]) });
  const r = await replenishTopics({ minBacklog: 3, force: true, deps: h.deps });
  assert.equal(r.ran, true);
  assert.equal(h.readFile().topics.length, 4);
});

test('a missing sense.json fails loudly rather than inventing topics', async () => {
  const h = harness({ sense: null });
  await assert.rejects(() => replenishTopics({ deps: h.deps }), /loop:sense/);
  assert.equal(h.prompts.length, 0);
});

// ---------------------------------------------------------------- dedupe + lint inside the run

test('candidates are deduped against the backlog, published slugs, near-titles, and each other', async () => {
  const h = harness({
    existing: EXISTING,
    taken: ['sade-sati-guide'],
    reply: brainReply([
      candidate(),
      candidate({ slug: 'sade-sati-guide', title: 'Sade Sati Survival: Reading the Seven Years Calmly' }),
      candidate({ slug: 'job-change-timing-vedic', title: 'Job Change Timing in Vedic Astrology' }),
      candidate({ slug: 'job-hunting-heavy-period-read-your-chart-timing', title: 'How to Read Your Chart’s Timing When Job-Hunting in a Heavy Period' }),
      candidate({ slug: 'moving-abroad-chart-timing', title: 'Moving Abroad: What Your Chart’s Timing Can and Cannot Tell You', signal: 'Do i have foreign settlement or even travel in my chart?' }),
    ]),
  });
  const r = await replenishTopics({ deps: h.deps });
  assert.deepEqual(r.accepted.map((a) => a.slug).sort(), ['job-hunting-heavy-period-chart-timing', 'moving-abroad-chart-timing']);
  const reasons = r.rejected.map((x) => `${x.slug}: ${x.reason}`).join('\n');
  assert.match(reasons, /sade-sati-guide: slug already published\/staged/);
  assert.match(reasons, /job-change-timing-vedic: near-duplicate title of "Timing a Job or Career Change/);
  assert.match(reasons, /job-hunting-heavy-period-read-your-chart-timing: near-duplicate title of "Job-Hunting in a Heavy Period/, 'dedupes within the same run too');
  assert.equal(h.ideas.filter((i) => i.status === 'rejected_duplicate').length, 3, 'every rejection is recorded in ideas');
  assert.equal(h.readFile().topics.length, EXISTING.length + 2);
});

test('a topic the policy-linter blocks is rejected before it reaches the backlog, and the block is recorded', async () => {
  const h = harness({
    reply: brainReply([
      candidate({ slug: 'when-your-unemployment-will-end', title: 'When Your Unemployment Will End, According to Your Chart', angle: 'Guaranteed to tell you the month.', scores: { demand: 5, pull: 5, distance: 5, fit: 5 } }),
      candidate(),
    ]),
    lintBlock: /guaranteed to|will end, according/i,
  });
  const r = await replenishTopics({ deps: h.deps });
  assert.equal(r.accepted.length, 1);
  assert.equal(r.accepted[0].slug, 'job-hunting-heavy-period-chart-timing');
  const blocked = r.rejected.find((x) => x.status === 'rejected_lint');
  assert.ok(blocked, 'the outcome-promise topic must be rejected by lint');
  assert.equal(blocked!.slug, 'when-your-unemployment-will-end');
  assert.match(blocked!.reason, /banned phrase/);
  assert.ok(h.linted.every((t) => t.includes('\n')), 'lint sees title and angle together');
  assert.doesNotMatch(JSON.stringify(h.readFile()), /when-your-unemployment-will-end/);
});

test('only the top `want` survivors by composite score are appended; the rest stay on record', async () => {
  const many = [1, 2, 3, 4, 5, 6, 7].map((i) =>
    candidate({
      slug: `distinct-topic-number-${i}`,
      title: `Distinct topic ${i}: ${['moon', 'saturn', 'venus', 'mars', 'mercury', 'jupiter', 'ketu'][i - 1]} windows for ${['exams', 'weddings', 'flights', 'launches', 'interviews', 'moves', 'fasts'][i - 1]}`,
      scores: { demand: i > 5 ? 1 : 5, pull: 5, distance: 5, fit: 5 },
    }),
  );
  const h = harness({ reply: brainReply(many) });
  const r = await replenishTopics({ want: 5, deps: h.deps });
  assert.equal(r.accepted.length, 5);
  assert.ok(r.accepted.every((a) => a.score === 625));
  assert.equal(h.ideas.length, 7);
});
