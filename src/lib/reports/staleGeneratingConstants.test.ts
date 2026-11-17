import { describe, expect, it } from 'vitest';
import { hasFreshGeneratingHeartbeat, shouldDeferForceRestart } from './staleGeneratingConstants';

const STALE_MS = 120 * 60 * 1000;
const NOW = Date.parse('2026-11-17T20:00:00.000Z');

describe('hasFreshGeneratingHeartbeat', () => {
  it('treats a recent updated_at as a live pipeline', () => {
    const updatedAt = new Date(NOW - 5 * 60 * 1000).toISOString();
    expect(hasFreshGeneratingHeartbeat(updatedAt, NOW, STALE_MS)).toBe(true);
  });

  it('treats a heartbeat older than the orphan window as dead', () => {
    const updatedAt = new Date(NOW - STALE_MS - 1).toISOString();
    expect(hasFreshGeneratingHeartbeat(updatedAt, NOW, STALE_MS)).toBe(false);
  });

  it('rejects a missing or unparseable heartbeat', () => {
    expect(hasFreshGeneratingHeartbeat(null, NOW, STALE_MS)).toBe(false);
    expect(hasFreshGeneratingHeartbeat('', NOW, STALE_MS)).toBe(false);
    expect(hasFreshGeneratingHeartbeat('not-a-date', NOW, STALE_MS)).toBe(false);
  });
});

describe('shouldDeferForceRestart', () => {
  it('defers a restart while a generating row is still heartbeating', () => {
    expect(
      shouldDeferForceRestart(
        { status: 'generating', updated_at: new Date(NOW - 50 * 60 * 1000).toISOString() },
        NOW,
        STALE_MS,
      ),
    ).toBe(true);
  });

  it('allows a restart once the generating heartbeat has gone stale', () => {
    expect(
      shouldDeferForceRestart(
        { status: 'generating', updated_at: new Date(NOW - 3 * 60 * 60 * 1000).toISOString() },
        NOW,
        STALE_MS,
      ),
    ).toBe(false);
  });

  it('allows Try Again on an error row even if updated_at is recent', () => {
    expect(
      shouldDeferForceRestart(
        { status: 'error', updated_at: new Date(NOW - 60 * 1000).toISOString() },
        NOW,
        STALE_MS,
      ),
    ).toBe(false);
  });

  it('does not defer when there is no row', () => {
    expect(shouldDeferForceRestart(null, NOW, STALE_MS)).toBe(false);
  });
});
