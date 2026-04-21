import { searchScripturesHybrid } from '@/lib/rag/vectorSearch';
import type { AshtakootResult } from '@/lib/synastry/ashtakoot';

/**
 * Short narrative + hybrid scripture retrieval (vector + keyword fallback).
 * Kept bounded so /api/synastry/compute stays within serverless limits.
 */
export async function buildSynastryCommentary(ashtakoot: AshtakootResult): Promise<string> {
  const q = `Vedic marriage compatibility Ashtakoot guna milan Moon relationship ${ashtakoot.total} of thirty-six points`;
  const hits = await searchScripturesHybrid(q, 4);
  const rag =
    hits.length > 0
      ? '\n\nClassical references (grounding only — not a full matching verdict):\n'.concat(
          hits
            .map((h) => {
              const t = h.text.length > 240 ? `${h.text.slice(0, 240)}…` : h.text;
              return `- (${h.source}${h.chapter ? `, ${h.chapter}` : ''}) ${t}`;
            })
            .join('\n'),
        )
      : '';

  const low = ashtakoot.total < 18;
  const intro =
    `Ashtakoot total ${ashtakoot.total} / ${ashtakoot.max}. ` +
    (low
      ? 'Scores below 18 classically invite more conscious partnership work and chart-level remedies.'
      : 'This band is often workable for harmony when the full charts and dashas support partnership.') +
    ' The eight kootas measure temperament, control, Tara, instinct, friendship, nature, sign harmony, and nāḍi — always read with a qualified Jyotishi.';

  return intro + rag;
}
