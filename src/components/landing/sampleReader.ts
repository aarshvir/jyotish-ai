/**
 * The INVENTED reader behind /sample-report: the answers she gave the quiz, the day her 30-day
 * window starts, and her first name. None of it describes a real person (this repository is public).
 *
 * The chart is the same sample birth the landing page uses (src/components/landing/sampleData.ts),
 * so the landing previews and this page can never disagree about who the sample is.
 *
 * The written parts of the sample (src/components/landing/sampleForecast.ts) are generated for
 * exactly these answers by scripts/gen-sample-forecast.ts. If you change anything here, regenerate;
 * a test (sampleReport.test.ts) fails when the two have drifted apart.
 */

import { personalContextFrom } from '@/lib/quiz/personalContext';
import type { Answers } from '@/lib/quiz/questions';

/** First day of the sample's 30-day window (a Monday). */
export const SAMPLE_WINDOW_START = '2026-10-12';
export const SAMPLE_WINDOW_DAYS = 30;

export const SAMPLE_READER_NAME = 'Nisha';

/** Wants to leave her job, has an interview in the window, finds astrology vague and pushy. */
export const SAMPLE_READER_ANSWERS: Answers = {
  concern: 'career',
  career_detail: 'switch',
  duration: 'year',
  prior: 'few',
  frustration: ['vague', 'upsell'],
  granularity: 'days',
  has_event: 'yes',
  event_what: 'interview at a new company on 3 November',
  birth_time_known: 'exact',
};

/** The note the quiz would have saved on her report; every commentary route reads it. */
export const SAMPLE_READER_CONTEXT = personalContextFrom(SAMPLE_READER_ANSWERS);

/** Where the sample's city-dependent times (hora, Rahu Kaal) are cast. Same city as the landing grid. */
export const SAMPLE_CITY = { name: 'Bangalore', lat: 12.9716, lng: 77.5946 };

/** The sample birth, as the engine takes it. Matches SAMPLE_SEEKER (15 Jun 1992, 09:00, New Delhi). */
export const SAMPLE_BIRTH = {
  birth_date: '1992-06-15',
  birth_time: '09:00:00',
  birth_city: 'New Delhi, India',
  birth_lat: 28.6139,
  birth_lng: 77.209,
};
