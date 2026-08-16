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
