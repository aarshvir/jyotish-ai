import { STEPS, type Answers } from './questions';

/**
 * Turns quiz answers into the plain-English note the report pipeline personalises from
 * (`reports.personal_context`).
 *
 * The pipeline already writes to whatever question a visitor typed; a third of real
 * users typed one. The quiz asks every visitor what is on their mind, so every report
 * gets a clear brief — in the person's own terms, built from the option labels they
 * actually tapped rather than internal codes.
 */

function one(a: Answers, field: string): string {
  const v = a[field];
  return typeof v === 'string' ? v.trim() : '';
}

function labelFor(field: string, value: string): string {
  for (const s of STEPS) {
    if ((s.kind === 'single' || s.kind === 'multi') && s.field === field) {
      return s.options.find((o) => o.value === value)?.label ?? value;
    }
  }
  return value;
}

const DETAIL_FIELDS = ['career_detail', 'marriage_detail', 'children_detail', 'business_detail', 'health_detail'];

export function personalContextFrom(a: Answers, maxLength = 1200): string {
  const parts: string[] = [];

  const concern = one(a, 'concern');
  if (concern) parts.push(`What is weighing on me most: ${labelFor('concern', concern)}.`);

  // Someone returning from the win-back email already typed a question once; keep it.
  const prior = one(a, 'prior_question').replace(/\s+/g, ' ');
  if (prior) parts.push(`Earlier I asked: "${prior.slice(0, 300)}".`);

  for (const f of DETAIL_FIELDS) {
    const v = one(a, f);
    if (v) parts.push(`More specifically: ${labelFor(f, v)}.`);
  }

  const partner = one(a, 'partner_name');
  if (partner) parts.push(`The person involved is ${partner}.`);
  const known = one(a, 'partner_known');
  if (known) parts.push(`Their birth details: ${labelFor('partner_known', known)}.`);

  const duration = one(a, 'duration');
  if (duration) parts.push(`On my mind for: ${labelFor('duration', duration).toLowerCase()}.`);

  const event = one(a, 'event_what').replace(/[.\s]+$/, '');
  if (event) parts.push(`Coming up: ${event}.`);
  else if (one(a, 'has_event') === 'soon') parts.push('A decision is coming up soon.');

  const granularity = one(a, 'granularity');
  if (granularity) parts.push(`Most useful to me: ${labelFor('granularity', granularity).toLowerCase()}.`);

  const text = parts.join(' ');
  return text.length > maxLength ? text.slice(0, maxLength) : text;
}
