/**
 * Spoken reel. Every hour below is a row in src/components/landing/sampleData.ts
 * (Monday · Bangalore, day score 70). The picture has to show that row while the line plays.
 * `line` is the caption and the linted script. `speech` is what the voice says,
 * so prices and the URL are pronounced instead of spelled like a ticker.
 */

export type ReelShot =
  | { kind: 'cover' }
  | { kind: 'header' }
  | { kind: 'hour'; label: '09:00–10:00' | '12:00–13:00' | '17:00–18:00'; score: 94 | 49 | 98 }
  | { kind: 'quiz'; step: 'concern' | 'career' }
  | { kind: 'slate' };

export interface ReelBeat {
  id: string;
  line: string;
  speech: string;
  /** Burned-in caption. Null when the slate already sets the type. */
  caption: string | null;
  shot: ReelShot;
}

export const REEL_BEATS: ReelBeat[] = [
  {
    id: 'cover',
    line: 'Let me show you a real chart. Cancer rising. Moon in Scorpio.',
    speech: 'Let me show you a real chart. Cancer rising. Moon in Scorpio.',
    caption: 'A real chart.\\NCancer rising. Moon in Scorpio.',
    shot: { kind: 'cover' },
  },
  {
    id: 'monday',
    line: 'The sample day is Monday, in Bangalore. It scores 70.',
    speech: 'The sample day is Monday, in Bangalore. It scores seventy.',
    caption: 'Monday, Bangalore.\\NDay score 70.',
    shot: { kind: 'header' },
  },
  {
    id: 'windows',
    line: 'It names two windows. 9 to 10 in the morning, and 5 to 6 in the evening.',
    speech: 'It names two windows. Nine to ten in the morning, and five to six in the evening.',
    caption: 'Two windows.\\N9 to 10 am, and 5 to 6 pm.',
    shot: { kind: 'header' },
  },
  {
    id: 'morning',
    line: "9 to 10 scores 94. The morning's clearer window.",
    speech: "Nine to ten scores ninety-four. The morning's clearer window.",
    caption: '9 to 10 am.\\NScore 94.',
    shot: { kind: 'hour', label: '09:00–10:00', score: 94 },
  },
  {
    id: 'noon',
    line: 'Noon scores 49. Same Monday. Heavier.',
    speech: 'Noon scores forty-nine. Same Monday. Heavier.',
    caption: '12 to 1 pm.\\NScore 49. Heavier.',
    shot: { kind: 'hour', label: '12:00–13:00', score: 49 },
  },
  {
    id: 'evening',
    line: "5 to 6 scores 98. On this chart, the day's strongest stretch.",
    speech: "Five to six scores ninety-eight. On this chart, the day's strongest stretch.",
    caption: '5 to 6 pm.\\NScore 98.',
    shot: { kind: 'hour', label: '17:00–18:00', score: 98 },
  },
  {
    id: 'eighteen',
    line: 'Eighteen windows in that one day. Clearer, and heavier.',
    speech: 'Eighteen windows in that one day. Clearer, and heavier.',
    caption: 'Eighteen windows.\\NClearer, and heavier.',
    shot: { kind: 'header' },
  },
  {
    id: 'quiz',
    line: 'The quiz asks what is weighing on you. Work and money.',
    speech: 'The quiz asks what is weighing on you. Work and money.',
    caption: 'What is weighing on you.\\NWork and money.',
    shot: { kind: 'quiz', step: 'concern' },
  },
  {
    id: 'jobs',
    line: 'Then it asks which part. Changing jobs.',
    speech: 'Then it asks which part. Changing jobs.',
    caption: 'Which is closest.\\NChanging jobs.',
    shot: { kind: 'quiz', step: 'career' },
  },
  {
    id: 'promise',
    line: 'The paid grid is the next 30 days. A planning aid. Not a promise this window gets you the role.',
    speech: 'The paid grid is the next thirty days. A planning aid. Not a promise this window gets you the role.',
    caption: '30 days. A planning aid.\\NNot a promise this window gets you the role.',
    shot: { kind: 'hour', label: '17:00–18:00', score: 98 },
  },
  {
    id: 'price',
    line: 'You pay for one month. $41.99, or ₹3,999. The card is not charged again by itself.',
    speech: 'You pay for one month. Forty-one dollars and ninety-nine cents, or three thousand, nine hundred and ninety-nine rupees. The card is not charged again by itself.',
    caption: null,
    shot: { kind: 'slate' },
  },
  {
    id: 'cta',
    line: 'Open VedicHour.com/start.',
    speech: 'Open Vedic Hour dot com slash start.',
    caption: null,
    shot: { kind: 'slate' },
  },
];

export const ENGLISH_SCRIPT = REEL_BEATS.map((b) => b.line).join('\n');

export function shotKey(shot: ReelShot): string {
  if (shot.kind === 'hour') return `hour:${shot.label}`;
  if (shot.kind === 'quiz') return `quiz:${shot.step}`;
  return shot.kind;
}

export function isReportShot(shot: ReelShot): boolean {
  return shot.kind === 'cover' || shot.kind === 'header' || shot.kind === 'hour';
}
