import { envOn, envStr } from '../env';
import { FORBIDDEN_CAPTURE } from './capture';
import { lintVoice } from './voice';
import { activeLessonRules } from '../db';

export interface CreativePlan {
  voice: { provider: 'sapi' | 'piper' | 'elevenlabs' | 'none'; gender: 'male' | 'female' | 'unknown'; id?: string };
  captureUrl: string;
  script: string;
  durationSec: number;
  words: number;
  context: 'organic' | 'ad';
}

export function preflight(plan: CreativePlan): void {
  const fails: string[] = [];

  if (plan.voice.gender === 'female') {
    fails.push('VOICE: female narrator is forbidden (owner 2026-07-26).');
  }
  if (plan.voice.provider === 'elevenlabs') {
    if (!envOn('ELEVENLABS_ENABLED')) fails.push('VOICE: ElevenLabs is spend. Set ELEVENLABS_ENABLED=1 only after a male voice id is chosen.');
    if (!envStr('ELEVENLABS_VOICE_ID')) fails.push('VOICE: ELEVENLABS_VOICE_ID missing.');
  }
  if (plan.voice.provider === 'none') {
    fails.push('VOICE: no voice plan. Do not publish a silent reel as if it had audio.');
  }

  if (FORBIDDEN_CAPTURE.test(plan.captureUrl)) {
    fails.push(`CAPTURE: ${plan.captureUrl} is forbidden.`);
  }

  const wps = plan.words / Math.max(1, plan.durationSec);
  if (wps > 2.3) fails.push(`NARRATION: ${wps.toFixed(2)} words/sec > 2.3 (words=${plan.words}, sec=${plan.durationSec}).`);

  const lint = lintVoice(plan.script, { context: plan.context });
  if (lint.verdict === 'block') fails.push(`COPY: ${lint.reasons.join('; ')}`);

  const lessons = activeLessonRules();
  if (!lessons.length) fails.push('LESSONS: table empty — seed failed.');

  if (fails.length) {
    throw new Error(`PREFLIGHT BLOCK (nothing was charged):\n- ${fails.join('\n- ')}`);
  }
}
