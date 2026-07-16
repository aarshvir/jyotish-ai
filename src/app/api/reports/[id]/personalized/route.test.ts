import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';

const mockState = vi.hoisted(() => ({
  auth: {
    user: { id: 'admin-user', email: 'admin@example.test' },
    isAdmin: true,
  },
  row: {} as Record<string, unknown>,
  updates: [] as Array<Record<string, unknown>>,
}));

vi.mock('@/lib/api/requireAuth', () => ({
  requireAuth: vi.fn(async () => mockState.auth),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createServiceClient: () => ({
    from: () => {
      const query = {
        select: () => query,
        eq: () => query,
        maybeSingle: async () => ({ data: mockState.row, error: null }),
        update: (payload: Record<string, unknown>) => {
          mockState.updates.push(payload);
          return query;
        },
        then: (
          resolve: (value: { error: null }) => unknown,
        ) => Promise.resolve(resolve({ error: null })),
      };
      return query;
    },
  }),
}));

vi.mock('@/lib/llm/routeCompletion', () => ({
  completeLlmChat: vi.fn(async () => JSON.stringify({
    question_echo: 'You are considering a meaningful career move.',
    full_answer: 'This is a sufficiently long paid personalized answer that must only be persisted for an entitled report owner.',
    key_windows: ['Mid-March'],
  })),
  hasLlmCredentials: () => true,
}));

vi.mock('@/lib/api/rateLimit', () => ({
  checkRateLimit: vi.fn(),
  getRateLimitKey: vi.fn(),
  RATE_LIMITS: { ask: { limit: 10, windowMs: 60_000 } },
  shouldRateLimitLlmForUser: () => false,
}));

function request() {
  return new NextRequest('https://example.test/api/reports/report-1/personalized', {
    method: 'POST',
  });
}

function reportRow(paymentStatus: string, ownerId = 'preview-owner') {
  return {
    user_id: ownerId,
    payment_status: paymentStatus,
    personal_context: 'Should I make a career move?',
    lagna_sign: 'Aries',
    moon_sign: 'Taurus',
    dasha_mahadasha: 'Jupiter',
    dasha_antardasha: 'Venus',
    native_name: 'Seeker',
    report_data: { days: [] },
  };
}

describe('personalized answer persistence', () => {
  beforeEach(() => {
    mockState.auth = {
      user: { id: 'admin-user', email: 'admin@example.test' },
      isAdmin: true,
    };
    mockState.row = reportRow('free');
    mockState.updates.length = 0;
  });

  it('returns a full answer to an inspecting admin without storing it in another user’s free report', async () => {
    const response = await POST(request(), { params: { id: 'report-1' } });
    const body = await response.json() as {
      personalized?: { tier?: string; full_answer?: string };
    };

    expect(response.status).toBe(200);
    expect(body.personalized?.tier).toBe('full');
    expect(body.personalized?.full_answer).toContain('paid personalized answer');
    expect(mockState.updates).toEqual([]);
  });

  it('still persists the full answer for an entitled owner', async () => {
    mockState.auth = {
      user: { id: 'paid-owner', email: 'owner@example.test' },
      isAdmin: false,
    };
    mockState.row = reportRow('paid', 'paid-owner');

    const response = await POST(request(), { params: { id: 'report-1' } });

    expect(response.status).toBe(200);
    expect(mockState.updates).toHaveLength(1);
    expect(mockState.updates[0]).toMatchObject({
      report_data: {
        personalized: {
          tier: 'full',
        },
      },
    });
  });
});
