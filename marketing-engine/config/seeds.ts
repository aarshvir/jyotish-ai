import type { Seed } from '../src/score';

/**
 * Demand priors. These are NOT measured volumes and NOT user questions.
 * Quiz rows are the category labels in src/lib/quiz/questions.ts.
 * No birth data. No verbatim onboarding text. Loop 6 replaces the priors.
 */
export const SEEDS: Seed[] = [
  {
    slug: 'two-slots-same-tuesday',
    title: 'Two meeting times on the same day',
    source: 'public-search-intent',
    demand: 0.72,
    emotion: 0.84,
    distance: 0.9,
    productFit: 0.95,
    concern: 'career',
    adsAllowed: true,
    rationale:
      'Public intent is "which time should I take", not a sun-sign mood. The product scores eighteen windows a day for thirty days after the quiz. Competitors still post one line for the day. No anonymised quiz counts are connected, so demand is a prior.',
  },
  {
    slug: 'job-switch-window',
    title: 'Thinking of changing jobs',
    source: 'quiz-category',
    demand: 0.8,
    emotion: 0.88,
    distance: 0.62,
    productFit: 0.9,
    concern: 'career',
    adsAllowed: true,
    rationale:
      'The quiz offers this as a career branch ("I am thinking of changing jobs"). Useful organic angle. Ad copy must describe the product, not the viewer\'s finances or employment status.',
  },
  {
    slug: 'horoscope-does-not-split-the-day',
    title: 'A daily horoscope cannot split one Tuesday',
    source: 'public-search-intent',
    demand: 0.7,
    emotion: 0.66,
    distance: 0.8,
    productFit: 0.74,
    concern: 'curious',
    adsAllowed: true,
    rationale:
      'Search-shaped complaint about vague daily horoscopes. The honest contrast is granularity (eighteen windows), not a claim that the chart is "more accurate" in a measurable study we do not have.',
  },
  {
    slug: 'marriage-decision',
    title: 'A marriage decision',
    source: 'quiz-category',
    demand: 0.66,
    emotion: 0.92,
    distance: 0.4,
    productFit: 0.7,
    concern: 'marriage',
    adsAllowed: false,
    rationale:
      'High pull, crowded competitor claim, and Meta personal-attributes risk if the ad implies relationship status. Organic only. No outcome promise.',
  },
  {
    slug: 'health-and-energy',
    title: 'Health and energy',
    source: 'quiz-category',
    demand: 0.4,
    emotion: 0.7,
    distance: 0.3,
    productFit: 0.2,
    concern: 'health',
    adsAllowed: false,
    rationale:
      'The quiz asks this. Marketing must not. Health outcome ads are a ban risk and the product does not treat illness. Do not generate ads.',
  },
];
