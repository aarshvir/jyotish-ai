import { createHash } from 'node:crypto';
import { envStr } from '../env';

export interface CategoryCount {
  category: string;
  n: number;
}

const BUCKETS: { category: string; re: RegExp }[] = [
  { category: 'career', re: /\b(job|career|hr|boss|resign|office|interview|salary|promotion|naukri)\b|नौकरी|इस्तीफा/i },
  { category: 'marriage', re: /\b(marry|marriage|shaadi|wedding|manglik|in-laws|vivah)\b|शादी|विवाह/i },
  { category: 'family_parents', re: /\b(papa|dad|mom|maa|parents|family tell)\b|पापा|माँ|माता/i },
  { category: 'money_property', re: /\b(property|flat|lease|rent|loan|emi|house)\b|मकान|फ्लैट|किराया/i },
  { category: 'education', re: /\b(exam|college|admission|study)\b|परीक्षा|पढ़ाई/i },
  { category: 'health_timing', re: /\b(surgery|appointment|hospital)\b|ऑपरेशन|अस्पताल/i },
  { category: 'business', re: /\b(business|startup|shop|gst|client)\b|व्यापार|दुकान/i },
  { category: 'timing_basics', re: /\b(muhurat|hora|rahu|panchang|kundli|dasha)\b|मुहूर्त|राहु/i },
];

function bucket(text: string): string {
  for (const b of BUCKETS) if (b.re.test(text)) return b.category;
  return 'other';
}

/**
 * Pull onboarding questions, classify in memory, persist ONLY category counts.
 * Raw personal_context and birth fields never written to engine.db.
 */
export async function firstPartyCategories(): Promise<{
  categories: CategoryCount[];
  paying: number;
  trials: number;
  ltvMean: number | null;
  error?: string;
  discardedHashes: number;
}> {
  const url = envStr('SUPABASE_URL')?.replace(/\/$/, '');
  const key = envStr('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) {
    return { categories: [], paying: 0, trials: 0, ltvMean: null, error: 'no supabase service role — first-party skipped', discardedHashes: 0 };
  }

  const headers = { apikey: key, Authorization: `Bearer ${key}` };
  try {
    const ctxRes = await fetch(
      `${url}/rest/v1/reports?select=personal_context&personal_context=not.is.null&limit=400`,
      { headers },
    );
    if (!ctxRes.ok) throw new Error(`reports ${ctxRes.status}`);
    const rows = (await ctxRes.json()) as { personal_context: string | null }[];
    const counts = new Map<string, number>();
    const seen = new Set<string>();
    let discardedHashes = 0;
    for (const row of rows) {
      const text = (row.personal_context ?? '').trim();
      if (text.length < 8) continue;
      const h = createHash('sha256').update(text).digest('hex');
      discardedHashes += 1;
      if (seen.has(h)) continue;
      seen.add(h);
      const cat = bucket(text);
      counts.set(cat, (counts.get(cat) ?? 0) + 1);
    }

    const payRes = await fetch(
      `${url}/rest/v1/ziina_payments?select=amount,status&status=eq.completed`,
      { headers },
    );
    const pays = payRes.ok ? ((await payRes.json()) as { amount: number }[]) : [];
    const paying = pays.length;
    const ltvMean = paying ? pays.reduce((a, p) => a + (p.amount ?? 0), 0) / paying : null;

    const trialRes = await fetch(`${url}/rest/v1/reports?select=id&payment_status=neq.bypass`, { headers });
    const trials = trialRes.ok ? ((await trialRes.json()) as unknown[]).length : 0;

    const categories = [...counts.entries()].map(([category, n]) => ({ category, n })).sort((a, b) => b.n - a.n);
    return { categories, paying, trials, ltvMean, discardedHashes };
  } catch (e) {
    return {
      categories: [],
      paying: 0,
      trials: 0,
      ltvMean: null,
      error: String(e instanceof Error ? e.message : e),
      discardedHashes: 0,
    };
  }
}
