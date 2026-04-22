import { searchScripturesHybrid } from '@/lib/rag/vectorSearch';
import { completeLlmChat } from '@/lib/llm/routeCompletion';
import type { AshtakootResult, KootaLine } from '@/lib/synastry/ashtakoot';

const SYSTEM_PROMPT = `You are a Vedic astrologer specialising in relationship compatibility. You write warm, honest, personal compatibility narratives — like a trusted advisor who cares about both people, not a dry scoring summary.

RULES:
- Return ONLY the narrative text. No JSON, no markdown headers, no labels.
- Write 400-500 words in flowing paragraphs.
- Open with a human, emotionally resonant sentence about what this score means for this couple.
- Translate the eight scores into plain-English insights: what strengths this pairing has, where they'll need to invest effort, and what the overall shape of the partnership looks like.
- Use the koot breakdown to give specific observations — "your Nadi match is full points, meaning deep energetic compatibility" not "Nadi = 8/8."
- Name the strongest and weakest koots and explain what they mean for the relationship in practical terms.
- If classical references are provided, weave them in as supporting wisdom — e.g. "The ancient texts particularly emphasize Nadi as the foundation of lasting attraction."
- Close with a grounded, hopeful note — what this couple should nurture and what they should be conscious of.
- Never use: H-notation, dusthana, badhaka, trikona, kendra, yogakaraka in the output. Plain English only.`;

function summariseBreakdown(breakdown: KootaLine[]): string {
  return breakdown
    .map((k) => `${k.name}: ${k.score}/${k.max} — ${k.note}`)
    .join('\n');
}

function buildFallback(ashtakoot: AshtakootResult): string {
  const { total, max } = ashtakoot;
  const band =
    total >= 28
      ? 'a rare and deeply resonant match — classical texts place this in the highest compatibility tier'
      : total >= 21
        ? 'strong natural compatibility — your core rhythms align well, giving you a stable foundation'
        : total >= 18
          ? 'a viable and supportive connection — there is real affinity here, though specific areas will need conscious attention'
          : 'a challenging but not impossible pairing — success here will depend on mutual effort, patience, and understanding';

  const nadi = ashtakoot.breakdown.find((k) => k.name === 'Nadi');
  const bhakoot = ashtakoot.breakdown.find((k) => k.name === 'Bhakoot');
  const gana = ashtakoot.breakdown.find((k) => k.name === 'Gana');

  return (
    `Your Ashtakoot compatibility score is ${total} out of ${max} — ${band}. ` +
    `The eight-fold Vedic compatibility system looks at how two people's core natures, instincts, and rhythms align across eight dimensions: temperament, mutual influence, lunar timing, instinctual harmony, friendship, nature type, sign relationship, and energetic flow.\n\n` +
    (nadi
      ? nadi.score === nadi.max
        ? `Your Nadi score is full points — this is considered the most important marker in classical compatibility and indicates deep energetic resonance at a subtle level. The ancient texts emphasize this as the foundation of lasting attraction and physical harmony. `
        : `Nadi — the deepest energetic layer — shows a gap here. This doesn't preclude a strong relationship, but it does suggest both partners will need to be attentive to energetic imbalances and physical wellbeing in the partnership. `
      : '') +
    (bhakoot
      ? bhakoot.score === bhakoot.max
        ? `Your sign relationship (Bhakoot) is fully supportive — there is a natural flow of support and growth between you. `
        : `The sign relationship (Bhakoot) shows some friction — this is one of the areas where deliberate communication and patience will pay dividends. `
      : '') +
    (gana
      ? gana.score >= 4
        ? `Your temperament match (Gana) is strong, suggesting you approach life with a similar underlying orientation — this creates an important baseline of understanding. `
        : `Your temperament styles (Gana) differ — one of you approaches life more intensely while the other is more measured. This can be complementary when each respects the other's pace, but it needs acknowledgment. `
      : '') +
    `\n\nEvery relationship, however scored, is shaped more by daily choices, communication, and mutual respect than by any mathematical system. The Ashtakoot score is a starting map, not a verdict. Use it to understand your natural dynamics — lean into your strengths, invest consciously in the areas of gap, and read the full individual charts with a qualified Jyotishi for the complete picture.`
  );
}

/**
 * Generate a 400-500 word compatibility narrative using LLM + RAG.
 * Falls back to a deterministic paragraph if the LLM call fails.
 */
export async function buildSynastryCommentary(ashtakoot: AshtakootResult): Promise<string> {
  const q = `Vedic marriage compatibility Ashtakoot guna milan Moon relationship harmony`;
  const hits = await searchScripturesHybrid(q, 3).catch(() => []);
  const rag =
    hits.length > 0
      ? '\n\nClassical Vedic references:\n'.concat(
          hits
            .map((h) => {
              const t = h.text.length > 200 ? `${h.text.slice(0, 200)}…` : h.text;
              return `- (${h.source}${h.chapter ? `, ${h.chapter}` : ''}) ${t}`;
            })
            .join('\n'),
        )
      : '';

  const hasApiKey = !!(process.env.ANTHROPIC_API_KEY ?? process.env.OPENAI_API_KEY ?? '').trim();
  if (!hasApiKey) {
    return buildFallback(ashtakoot);
  }

  const userPrompt = `Write a compatibility narrative for this Ashtakoot result:

TOTAL SCORE: ${ashtakoot.total} / ${ashtakoot.max}

KOOT BREAKDOWN:
${summariseBreakdown(ashtakoot.breakdown)}
${rag}

Write a 400-500 word plain-English compatibility narrative as described. Open with what this score means in human terms. Name the strongest and weakest koots and explain what they mean practically. Close with grounded, actionable advice for this couple.`;

  try {
    const raw = await completeLlmChat({
      systemPrompt: SYSTEM_PROMPT,
      userPrompt,
      maxTokens: 700,
    });
    const trimmed = raw.trim();
    if (trimmed.length < 50) return buildFallback(ashtakoot);
    return trimmed;
  } catch (err) {
    console.warn('[synastryCommentary] LLM failed, using fallback:', err);
    return buildFallback(ashtakoot);
  }
}
