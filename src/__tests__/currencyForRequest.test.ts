import { describe, it, expect } from 'vitest';
import { currencyForRequest } from '@/lib/pricing';

/**
 * /pricing showed USD to everyone because it read a header the (never-running) middleware
 * was supposed to set. Server pages now resolve currency the way /api/geo and checkout do.
 */
describe('currencyForRequest', () => {
  it("honours the visitor's own currency pick first", () => {
    expect(currencyForRequest('INR', 'US')).toBe('INR');
    expect(currencyForRequest('AED', 'IN')).toBe('AED');
    expect(currencyForRequest('USD', 'IN')).toBe('USD');
  });

  it('falls back to the country, matching checkout', () => {
    expect(currencyForRequest(undefined, 'IN')).toBe('INR');
    expect(currencyForRequest(undefined, 'ae')).toBe('AED');
    expect(currencyForRequest(null, 'GB')).toBe('USD');
    expect(currencyForRequest(undefined, null)).toBe('USD');
  });

  it('ignores a tampered cookie', () => {
    expect(currencyForRequest('GBP', 'IN')).toBe('INR');
  });
});
