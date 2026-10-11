/**
 * The reader's own answers, as short "topic: what you picked" pairs for the opening brief.
 * Wording is the option label they tapped, or the words they typed; nothing is paraphrased
 * into something they did not say.
 */

import { FRUSTRATION_PHRASE } from './situations';
import { type Selection, type SeekerProfile, type TimeConfidence } from './profile';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function longDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

export const TIME_LABEL: Record<TimeConfidence, string> = {
  exact: 'known exactly',
  approx: 'approximate, within an hour or two',
  unknown: 'not known',
};

export function selectionsOf(p: SeekerProfile, eventDate: string | null = null): Selection[] {
  const out: Selection[] = [];
  const add = (key: string, topic: string, value: string | null | undefined) => {
    if (value && value.trim()) out.push({ key, topic, value: value.trim() });
  };

  if (p.origin === 'funnel') {
    add('hook', p.labels.hook_question ? p.labels.hook_question : 'The question that brought you here', p.labels.hook);
    add('focus_area', 'Where it repeats most', p.labels.focus_area);
    add('goal', 'What matters most in the next 12 months', p.labels.goal_12m);
    add('self_role', 'The role that feels familiar from another life', p.labels.self_role);
  } else {
    add('concern', 'What was weighing on you most', p.labels.concern);
    add('detail', 'Closest to your situation', p.labels.detail);
    add('duration', 'How long it has been on your mind', p.labels.duration ? p.labels.duration.toLowerCase() : null);
  }

  if (p.hasEvent === 'yes' && p.eventText) {
    add('event', 'Coming up', `“${p.eventText}”${eventDate ? ` (${longDate(eventDate)})` : ''}`);
  } else if (p.hasEvent === 'soon') {
    add('event', 'Coming up', 'a decision, soon');
  }
  if (p.partnerName) add('partner', 'The person involved', p.partnerName);
  if (p.prior) add('prior', 'Astrologers you have consulted', p.labels.prior);
  if (p.frustrations.length) {
    const real = p.frustrations.filter((f) => f !== 'nothing');
    add(
      'frustration',
      'What has bothered you about astrology',
      real.length ? real.map((f) => FRUSTRATION_PHRASE[f]).join('; ') : 'nothing, it has helped you',
    );
  }
  if (p.granularity) add('granularity', 'What would change how you plan', p.labels.granularity ? p.labels.granularity.toLowerCase() : null);
  if (p.timeConfidence) add('time', 'Your birth time', TIME_LABEL[p.timeConfidence]);
  return out;
}
