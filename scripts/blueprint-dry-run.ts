/**
 * Local dry-run of the Karmic Blueprint generator with an INVENTED person.
 *
 *   npx tsx scripts/blueprint-dry-run.ts <asha|rohan|meera|nobody|funnel> [blueprint|blueprint_plus30] [--no-llm]
 *
 * Needs the ephemeris service running locally (cd ephemeris-service && python -m uvicorn
 * main:app --port 8000) and, unless --no-llm, a model key in ../jyotish-ai/.env.local.
 * Writes NOTHING to any database: it loads only the model keys from the env file, never the
 * Supabase keys. Output goes to the scratchpad directory given by BLUEPRINT_OUT (default ./tmp).
 */
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Load ONLY model keys; the Supabase service key must never be present in a dry run.
const ENV_FILE = process.env.BLUEPRINT_ENV_FILE ?? resolve(process.cwd(), '../jyotish-ai/.env.local');
const ALLOW = new Set(['ANTHROPIC_API_KEY', 'OPENAI_API_KEY', 'DEEPSEEK_API_KEY', 'GROK_API_KEY']);
try {
  for (const line of readFileSync(ENV_FILE, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && ALLOW.has(m[1])) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
} catch {
  /* no env file: --no-llm still works */
}
process.env.EPHEMERIS_SERVICE_URL = process.env.EPHEMERIS_SERVICE_URL ?? 'http://127.0.0.1:8000';

async function main() {
  const { generateBlueprint } = await import('../src/lib/blueprint/generate');
  const { createEphemerisPort } = await import('../src/lib/blueprint/ephemerisPort');
  const { createBlueprintLlm } = await import('../src/lib/blueprint/llm');
  const { blueprintToMarkdown } = await import('../src/lib/blueprint/markdown');
  const fx = await import('../src/lib/personalization/fixtures');

  const who = (process.argv[2] ?? 'asha') as 'asha' | 'rohan' | 'meera' | 'nobody' | 'funnel';
  const plan = (process.argv[3] === 'blueprint_plus30' ? 'blueprint_plus30' : 'blueprint') as 'blueprint' | 'blueprint_plus30';
  const noLlm = process.argv.includes('--no-llm');
  const ctx = who === 'funnel' ? fx.FUNNEL_FIXTURE : fx.START_FIXTURES[who];
  const names = { asha: 'Asha', rohan: 'Rohan', meera: 'Meera', nobody: 'Sam', funnel: 'Tara' } as const;

  const llm = noLlm
    ? { complete: async () => ({ text: '{"sections":{}}', model: 'none', usage: { input: 0, output: 0 } }) }
    : createBlueprintLlm();
  const t0 = Date.now();
  const doc = await generateBlueprint(
    {
      name: names[who],
      birthDate: fx.SAME_CHART_BIRTH.date,
      birthTime: fx.SAME_CHART_BIRTH.time,
      city: fx.SAME_CHART_BIRTH.city,
      lat: fx.SAME_CHART_BIRTH.lat,
      lng: fx.SAME_CHART_BIRTH.lng,
      personalContext: ctx,
      plan,
      today: fx.FIXTURE_TODAY,
    },
    { ephemeris: createEphemerisPort(), llm },
  );
  const out = process.env.BLUEPRINT_OUT ?? resolve(process.cwd(), 'tmp');
  mkdirSync(out, { recursive: true });
  const base = resolve(out, `blueprint-${who}-${plan}`);
  writeFileSync(`${base}.json`, JSON.stringify(doc, null, 2));
  writeFileSync(`${base}.md`, blueprintToMarkdown(doc, { sourceKeys: true }));
  console.log(JSON.stringify({ who, plan, seconds: Math.round((Date.now() - t0) / 1000), qa: doc.qa, sections: doc.sections.map((s) => s.id) }, null, 2));
  console.log(`wrote ${base}.md`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
