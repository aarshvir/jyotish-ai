/**
 * Local PREVIEW of the win-back email. Sends nothing, and cannot.
 *
 *   npx tsx scripts/winback-outreach.ts            # everyone on the list
 *   npx tsx scripts/winback-outreach.ts --limit 3  # the first three
 *
 * Real sending happens only from /admin/winback on the live site. Unsubscribe and
 * resume links are HMAC-signed, and a link signed on this machine would not verify
 * in production — so this script uses placeholder links.
 *
 * Previews go to scripts/.winback-preview/ (gitignored: they contain real
 * recipients' questions).
 */
import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { winbackAudience, composeWinback, type ChartFetcher } from '../src/lib/notify/winbackPipeline';

const env: Record<string, string> = {};
for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
  if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
}

const LIMIT = (() => {
  const i = process.argv.indexOf('--limit');
  const n = i >= 0 ? Number(process.argv[i + 1]) : NaN;
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : Infinity;
})();

const SITE = 'https://www.vedichour.com';
const OUT_DIR = join('scripts', '.winback-preview');

const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// There is no ephemeris service on this machine, so use the public endpoint the
// calculators use. It omits the sub-period list, so "what comes next" is derived
// by Vimshottari arithmetic rather than read — the same answer either way.
const fetchChart: ChartFetcher = async (r) => {
  const res = await fetch(`${SITE}/api/tools/chart`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      person: {
        birth_date: r.birthDate,
        birth_time: r.birthTime,
        birth_city: r.birthCity,
        birth_lat: r.birthLat,
        birth_lng: r.birthLng,
      },
    }),
  });
  if (!res.ok) return null;
  const c = (await res.json()) as {
    lagna?: string;
    moon_sign?: string;
    moon_nakshatra?: string;
    current_dasha?: { mahadasha?: string; antardasha?: string; start_date?: string; end_date?: string } | null;
    dasha_sequence?: { planet: string; start_date: string; end_date: string }[];
  };
  return {
    lagna: c.lagna ?? null,
    moonSign: c.moon_sign ?? null,
    nakshatra: c.moon_nakshatra ?? null,
    current: c.current_dasha ?? null,
    sequence: c.dasha_sequence ?? null,
  };
};

async function main() {
  const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
  const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

  const everyone = await winbackAudience(db, { requireSuppressionList: false });
  const people = everyone.slice(0, LIMIT === Infinity ? everyone.length : LIMIT);
  mkdirSync(OUT_DIR, { recursive: true });
  console.log(`PREVIEW ONLY — ${people.length} of ${everyone.length} recipients\n`);

  const index: string[] = [];
  const tally: Record<string, number> = {};

  for (let i = 0; i < people.length; i++) {
    const n = String(i + 1).padStart(2, '0');
    const mail = await composeWinback({
      recipient: people[i],
      fetchChart,
      anthropic,
      offerHref: `${SITE}/resume?t=PREVIEW`,
      unsubscribeHref: `${SITE}/api/unsubscribe?t=PREVIEW`,
    });
    if (!mail.ok) {
      tally.not_sendable = (tally.not_sendable ?? 0) + 1;
      console.log(`  ${n}. not sendable — ${mail.reason}`);
    } else {
      tally[mail.category] = (tally[mail.category] ?? 0) + 1;
      const file = `${n}-${mail.category}.html`;
      writeFileSync(join(OUT_DIR, file), mail.html, 'utf8');
      index.push(`<li><a href="${file}">${n}. [${mail.category}] ${escapeHtml(mail.subject)}</a></li>`);
      console.log(`  ${n}. [${mail.category}] ${mail.subject}`);
    }
    await new Promise((res) => setTimeout(res, 4500)); // the public chart endpoint allows 15/min
  }

  writeFileSync(
    join(OUT_DIR, 'index.html'),
    `<meta charset="utf-8"><h1>Win-back previews (${index.length})</h1><ul>${index.join('')}</ul>`,
    'utf8',
  );
  console.log(`\n${JSON.stringify(tally)}\nPreviews in ${OUT_DIR}\\index.html — nothing was sent.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
