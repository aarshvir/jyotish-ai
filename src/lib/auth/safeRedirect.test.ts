import { describe, expect, it } from 'vitest';
import { safeInternalRedirectPath } from './safeRedirect';

describe('safeInternalRedirectPath', () => {
  it('allows same-origin absolute paths', () => {
    expect(safeInternalRedirectPath('/dashboard')).toBe('/dashboard');
    expect(safeInternalRedirectPath('/report/abc?payment_status=paid')).toBe(
      '/report/abc?payment_status=paid',
    );
  });

  it('rejects protocol-relative and absolute external redirects', () => {
    expect(safeInternalRedirectPath('//evil.example/fake-dashboard')).toBe('/dashboard');
    expect(safeInternalRedirectPath('https://evil.example/fake-dashboard')).toBe('/dashboard');
    expect(safeInternalRedirectPath(null)).toBe('/dashboard');
  });
});
