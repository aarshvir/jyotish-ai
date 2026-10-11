import type { FunnelAnswers } from './screens';

/**
 * Body for POST /api/ziina/create-intent from the /q funnel.
 *
 * The city dialog updates answers and starts checkout in the same turn. Callers
 * must pass those updated answers: reading React state from before setState drops
 * the city the buyer just picked, and the paid forecast is then timed at the
 * birthplace.
 */
export function funnelCheckoutBody(input: {
  planType: string;
  reportId: string;
  funnelSlug: string;
  name: string;
  phone?: string | null;
  answers: FunnelAnswers;
  personalContext: string;
}): Record<string, unknown> {
  const a = input.answers;
  const known = a.birth_time_known === 'exact' || a.birth_time_known === 'approx';
  return {
    planType: input.planType,
    reportId: input.reportId,
    funnelSlug: input.funnelSlug,
    name: input.name,
    ...(input.phone ? { phone: input.phone } : {}),
    birth_date: a.birth_date,
    birth_time: known && a.birth_time ? `${a.birth_time}:00` : '12:00:00',
    birth_city: a.birth_city,
    birth_lat: Number(a.birth_city_lat),
    birth_lng: Number(a.birth_city_lng),
    ...(a.current_city && a.current_city_lat
      ? {
          current_city: a.current_city,
          current_lat: Number(a.current_city_lat),
          current_lng: Number(a.current_city_lng),
        }
      : {}),
    personal_context: input.personalContext,
  };
}
