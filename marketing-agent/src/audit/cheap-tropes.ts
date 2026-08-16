/**
 * Deterministic "looks like $9 AI astrology" detectors.
 * Used by STAGE 0 preflight so a mandala/lotus prompt never spends fal.ai money.
 */
export const CHEAP_VISUAL_TROPES = [
  'mandala',
  'lotus swirl',
  'yantra',
  'neon purple',
  'floating om',
  'sacred geometry background',
  'galaxy mandala',
  'fake testimonial',
  'five-star',
  '5-star',
  '10k users',
  '10,000 users',
] as const;

export function cheapTropeHits(...blobs: string[]): string[] {
  const hay = blobs.join(' ').toLowerCase();
  return CHEAP_VISUAL_TROPES.filter((t) => hay.includes(t));
}
