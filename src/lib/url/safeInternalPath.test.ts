import { describe, it, expect } from 'vitest';
import { safeInternalPath } from './safeInternalPath';

describe('safeInternalPath', () => {
  it('allows normal internal paths', () => {
    expect(safeInternalPath('/dashboard')).toBe('/dashboard');
    expect(safeInternalPath('/onboard?plan=7day')).toBe('/onboard?plan=7day');
  });

  it('blocks protocol-relative and absolute open redirects', () => {
    expect(safeInternalPath('//evil.com')).toBe('/dashboard');
    expect(safeInternalPath('https://evil.com')).toBe('/dashboard');
    expect(safeInternalPath('http://evil.com')).toBe('/dashboard');
    expect(safeInternalPath('/\\evil.com')).toBe('/dashboard');
  });

  it('blocks control characters the URL parser strips into a protocol-relative host', () => {
    const origin = 'https://vedichour.com';
    for (const raw of ['/\t/evil.example/', '/\n/evil.example/', '/\r/evil.example/']) {
      const fromQuery = new URL(`${origin}/login?next=${encodeURIComponent(raw)}`).searchParams.get('next');
      const path = safeInternalPath(fromQuery);
      expect(path).toBe('/dashboard');
      expect(new URL(path, origin).origin).toBe(origin);
    }
    // Same resolution Next's client router uses before window.location.assign.
    expect(new URL('/\t/evil.example/', origin).origin).toBe('https://evil.example');
  });

  it('empty fallback lets callers omit next on error redirects', () => {
    expect(safeInternalPath('https://evil.com', '')).toBe('');
    expect(safeInternalPath('/login/reset', '')).toBe('/login/reset');
  });

  it('falls back on empty, missing, or non-path input', () => {
    expect(safeInternalPath('')).toBe('/dashboard');
    expect(safeInternalPath(null)).toBe('/dashboard');
    expect(safeInternalPath(undefined)).toBe('/dashboard');
    expect(safeInternalPath('dashboard')).toBe('/dashboard');
    expect(safeInternalPath('/')).toBe('/dashboard');
  });

  it('honors a custom fallback', () => {
    expect(safeInternalPath(null, '/login')).toBe('/login');
  });
});
