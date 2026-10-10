export interface Seed {
  slug: string;
  title: string;
  source: 'quiz-category' | 'public-search-intent';
  /** 0–1. Not a measured search volume. A prior until Loop 6 has data. */
  demand: number;
  emotion: number;
  /** How far this is from the generic horoscope line competitors already post. */
  distance: number;
  productFit: number;
  concern: 'career' | 'curious' | 'business' | 'marriage' | 'health' | 'children';
  /** Ads in these concerns assert health, money trouble, or relationship status. */
  adsAllowed: boolean;
  rationale: string;
}

export interface RankedIdea extends Seed {
  score: number;
}

export function rankIdeas(seeds: Seed[]): RankedIdea[] {
  return seeds
    .map((s) => ({
      ...s,
      score: round4(clamp01(s.demand) * clamp01(s.emotion) * clamp01(s.distance) * clamp01(s.productFit)),
    }))
    .sort((a, b) => b.score - a.score);
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

/** Performance weight. Losing ideas decay. No events → score unchanged. */
export function applyLearning(
  ideas: { slug: string; score: number }[],
  measured: { slug: string; paid: number; reached: number }[],
): { slug: string; score: number; note: string }[] {
  const by = new Map(measured.map((m) => [m.slug, m]));
  return ideas.map((idea) => {
    const m = by.get(idea.slug);
    if (!m || m.reached <= 0) return { ...idea, note: 'no measured reach; rank unchanged' };
    const paidRate = m.paid / m.reached;
    const factor = m.paid > 0 ? 1 + Math.min(0.5, paidRate * 5) : 0.85;
    return {
      slug: idea.slug,
      score: round4(idea.score * factor),
      note: m.paid > 0 ? `paid ${m.paid} from reach ${m.reached}; weight ${factor}` : `reach ${m.reached} with zero paid; decay to ${factor}`,
    };
  });
}
