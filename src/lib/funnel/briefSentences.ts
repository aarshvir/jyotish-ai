/**
 * The v2 quiz answers, written as plain sentences for the report brief
 * (`reports.personal_context`). Kept apart from lib/quiz/personalContext.ts so that file —
 * which the report pipeline reads back — gains one line, not a block.
 *
 * Every sentence has a fixed prefix. The "What has bothered me about astrology" sentence is
 * word-for-word the one /start writes, so anything reading that sentence there reads it here.
 * The person's own words go in quotation marks as data: nothing downstream should treat them
 * as instructions.
 */

import { STEPS } from '@/lib/quiz/questions';
import { MIND_WORDS_MAX, mindWords } from './interstitials';
import { findProblem, realProblems, splitCodes } from './problems';
import type { FunnelAnswers } from './screens';

function frustrationLabel(code: string): string {
  for (const s of STEPS) {
    if (s.kind === 'multi' && s.field === 'frustration') {
      const o = s.options.find((x) => x.value === code);
      if (o) return o.label;
    }
  }
  return code === 'new' ? 'I have not tried astrology before' : code;
}

export function briefSentences(a: FunnelAnswers): string[] {
  const out: string[] = [];

  const worries = realProblems(splitCodes(a.problems));
  if (worries.length) out.push(`What is hardest right now: ${worries.map((p) => p.label.en).join('; ')}.`);
  else if (splitCodes(a.problems).includes('curious')) out.push('Nothing urgent right now, I am just curious.');

  const hardest = a.mind_focus ? findProblem(a.mind_focus) : undefined;
  if (hardest) out.push(`The one that weighs most: ${hardest.label.en}.`);

  const frustrations = splitCodes(a.frustration);
  const bothered = frustrations.filter((c) => c !== 'nothing' && c !== 'new');
  if (bothered.length) out.push(`What has bothered me about astrology: ${bothered.map(frustrationLabel).join('; ')}.`);
  else if (frustrations.includes('nothing')) out.push('What has bothered me about astrology: nothing, it has helped me.');
  else if (frustrations.includes('new')) out.push('I have not tried astrology before.');

  const words = mindWords(a).replace(/"/g, "'").slice(0, MIND_WORDS_MAX);
  if (words) out.push(`In my own words: "${words}".`);

  return out;
}
