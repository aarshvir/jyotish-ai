import { describe, expect, it } from 'vitest';
import { scrubSensitiveSearchFromHref } from '@/components/analytics/MetaPixel';

describe('scrubSensitiveSearchFromHref', () => {
  it('removes birth PII and bypass from the query string, keeps entitlement presentation keys', () => {
    const next = scrubSensitiveSearchFromHref(
      '/report/abc?name=Ada&date=1990-01-01&time=09:30&city=Delhi&lat=28.6&lng=77.2&bypass=super-secret&payment_status=paid&type=7day',
    );
    const url = new URL(next, 'https://vedichour.com');
    expect(url.searchParams.get('name')).toBeNull();
    expect(url.searchParams.get('date')).toBeNull();
    expect(url.searchParams.get('time')).toBeNull();
    expect(url.searchParams.get('city')).toBeNull();
    expect(url.searchParams.get('lat')).toBeNull();
    expect(url.searchParams.get('lng')).toBeNull();
    expect(url.searchParams.get('bypass')).toBeNull();
    expect(url.searchParams.get('payment_status')).toBe('paid');
    expect(url.searchParams.get('type')).toBe('7day');
  });

  it('is a no-op when nothing sensitive is present', () => {
    expect(scrubSensitiveSearchFromHref('/pricing?utm_campaign=launch')).toBe(
      '/pricing?utm_campaign=launch',
    );
  });
});
