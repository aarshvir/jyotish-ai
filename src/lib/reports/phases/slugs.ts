/**
 * Canonical phase-slug enum for the Jyotish report generation pipeline.
 *
 * These strings are written to `reports.generation_step` and forwarded by the
 * SSE stream as `event: phase` frames.  They must be stable — any rename
 * requires a migration for in-flight reports.
 */

export const PHASE = {
  // Ephemeris
  EPHEMERIS_FETCHING:   'ephemeris:fetching',
  EPHEMERIS_PARSING:    'ephemeris:parsing',

  // Nativity
  NATIVITY_LAGNA:       'nativity:lagna-analysis',
  NATIVITY_YOGA:        'nativity:yoga-detection',
  NATIVITY_SYNTHESIS:   'nativity:synthesis',

  // Daily
  DAILY_SCORES:         'daily:score-computation',
  DAILY_BATCH_1:        'daily:commentary-batch-1/3',
  DAILY_BATCH_2:        'daily:commentary-batch-2/3',
  DAILY_BATCH_3:        'daily:commentary-batch-3/3',

  // Hourly (18 buckets/day, locked contract)
  HOURLY_GRID:          'hourly:muhurta-grid',
  HOURLY_BATCH_1:       'hourly:commentary-batch-1/6',
  HOURLY_BATCH_2:       'hourly:commentary-batch-2/6',
  HOURLY_BATCH_3:       'hourly:commentary-batch-3/6',
  HOURLY_BATCH_4:       'hourly:commentary-batch-4/6',
  HOURLY_BATCH_5:       'hourly:commentary-batch-5/6',
  HOURLY_BATCH_6:       'hourly:commentary-batch-6/6',

  // Synthesis
  MONTHS_SYNTHESIS:     'months:synthesis',
  WEEKS_SYNTHESIS:      'weeks:synthesis',

  // Finalize
  FINALIZE_PERSIST:     'finalize:persist',
} as const;

export type PhaseSlug = (typeof PHASE)[keyof typeof PHASE];

/** Human-readable label for each phase slug shown in the UI. */
export const PHASE_LABELS: Record<PhaseSlug, string> = {
  'ephemeris:fetching':           'Fetching planetary positions…',
  'ephemeris:parsing':            'Parsing birth chart…',
  'nativity:lagna-analysis':      'Analysing lagna & rising sign…',
  'nativity:yoga-detection':      'Detecting classical yogas…',
  'nativity:synthesis':           'Synthesising nativity profile…',
  'daily:score-computation':      'Computing day scores…',
  'daily:commentary-batch-1/3':   'Writing daily overviews (1/3)…',
  'daily:commentary-batch-2/3':   'Writing daily overviews (2/3)…',
  'daily:commentary-batch-3/3':   'Writing daily overviews (3/3)…',
  'hourly:muhurta-grid':          'Building muhurta grid (18 slots/day)…',
  'hourly:commentary-batch-1/6':  'Writing hourly commentary (batch 1/6)…',
  'hourly:commentary-batch-2/6':  'Writing hourly commentary (batch 2/6)…',
  'hourly:commentary-batch-3/6':  'Writing hourly commentary (batch 3/6)…',
  'hourly:commentary-batch-4/6':  'Writing hourly commentary (batch 4/6)…',
  'hourly:commentary-batch-5/6':  'Writing hourly commentary (batch 5/6)…',
  'hourly:commentary-batch-6/6':  'Writing hourly commentary (batch 6/6)…',
  'months:synthesis':             'Building 12-month forecast…',
  'weeks:synthesis':              'Building 6-week synthesis…',
  'finalize:persist':             'Saving your report…',
};

/**
 * Ordered phases with their approximate completion percentage.
 * Used by PhaseProgressBar to render per-phase segment boundaries.
 */
export const ORDERED_PHASES: { slug: PhaseSlug; pct: number }[] = [
  { slug: 'ephemeris:fetching',          pct:  4 },
  { slug: 'ephemeris:parsing',           pct:  8 },
  { slug: 'nativity:lagna-analysis',     pct: 14 },
  { slug: 'nativity:yoga-detection',     pct: 18 },
  { slug: 'nativity:synthesis',          pct: 22 },
  { slug: 'daily:score-computation',     pct: 26 },
  { slug: 'daily:commentary-batch-1/3',  pct: 36 },
  { slug: 'daily:commentary-batch-2/3',  pct: 43 },
  { slug: 'daily:commentary-batch-3/3',  pct: 50 },
  { slug: 'hourly:muhurta-grid',         pct: 53 },
  { slug: 'hourly:commentary-batch-1/6', pct: 58 },
  { slug: 'hourly:commentary-batch-2/6', pct: 62 },
  { slug: 'hourly:commentary-batch-3/6', pct: 65 },
  { slug: 'hourly:commentary-batch-4/6', pct: 68 },
  { slug: 'hourly:commentary-batch-5/6', pct: 71 },
  { slug: 'hourly:commentary-batch-6/6', pct: 75 },
  { slug: 'months:synthesis',            pct: 82 },
  { slug: 'weeks:synthesis',             pct: 88 },
  { slug: 'finalize:persist',            pct: 97 },
];
