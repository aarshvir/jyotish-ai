import { describe, expect, it } from 'vitest';
import { funnelCheckoutBody } from '@/lib/funnel/checkoutBody';
import type { FunnelAnswers } from '@/lib/funnel/screens';

const birth: FunnelAnswers = {
  birth_date: '1990-04-12',
  birth_time_known: 'exact',
  birth_time: '08:30',
  birth_city: 'Delhi, Delhi, India',
  birth_city_lat: '28.61',
  birth_city_lng: '77.21',
};

function body(answers: FunnelAnswers) {
  return funnelCheckoutBody({
    planType: 'sub_monthly',
    reportId: '11111111-1111-4111-8111-111111111111',
    funnelSlug: 'repeating-lessons',
    name: 'Asha',
    answers,
    personalContext: 'Birth time: known exactly.',
  });
}

describe('funnelCheckoutBody', () => {
  it('sends the current city the buyer just picked, which is not on the previous answers', () => {
    const picked: FunnelAnswers = {
      ...birth,
      current_city: 'New York, New York, United States',
      current_city_lat: '40.71',
      current_city_lng: '-74.01',
    };
    const sent = body(picked);
    expect(sent.current_city).toBe('New York, New York, United States');
    expect(sent.current_lat).toBeCloseTo(40.71);
    expect(sent.current_lng).toBeCloseTo(-74.01);
    expect(sent.birth_city).toBe('Delhi, Delhi, India');
    expect(body(birth).current_city).toBeUndefined();
  });

  it('keeps an unknown birth time as noon and omits a blank phone', () => {
    const sent = body({ ...birth, birth_time_known: 'unknown', birth_time: undefined });
    expect(sent.birth_time).toBe('12:00:00');
    expect(sent.phone).toBeUndefined();
  });
});
