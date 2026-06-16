import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from '@/app/api/reports/[id]/ask/route';
import { requireAuth } from '@/lib/api/requireAuth';
import { createServiceClient } from '@/lib/supabase/admin';
import { completeLlmChat } from '@/lib/llm/routeCompletion';

vi.mock('@/lib/api/requireAuth', () => ({
  requireAuth: vi.fn(),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createServiceClient: vi.fn(),
}));

vi.mock('@/lib/llm/routeCompletion', () => ({
  completeLlmChat: vi.fn(),
  hasLlmCredentials: vi.fn(() => true),
}));

vi.mock('@/lib/api/rateLimit', () => ({
  checkRateLimit: vi.fn(),
  getRateLimitKey: vi.fn(() => 'user:owner_user'),
  RATE_LIMITS: { ask: { limit: 6, windowMs: 300_000 } },
  shouldRateLimitLlmForUser: vi.fn(() => false),
}));

function mockReportLookup(report: Record<string, unknown> | null) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    maybeSingle: vi.fn(async () => ({ data: report, error: null })),
  };
  vi.mocked(createServiceClient).mockReturnValue({
    from: vi.fn(() => query),
  } as never);
}

function request(body: Record<string, unknown>) {
  return new NextRequest('https://example.test/api/reports/report_1/ask', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('POST /api/reports/[id]/ask', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAuth).mockResolvedValue({
      user: { id: 'owner_user', email: 'owner@example.test' },
      isAdmin: false,
    });
    vi.mocked(completeLlmChat).mockResolvedValue('Grounded answer');
  });

  it('rejects direct Q&A calls for free/preview reports before LLM execution', async () => {
    mockReportLookup({ user_id: 'owner_user', payment_status: 'free' });

    const res = await POST(request({ question: 'What should I do?', context: 'report text' }), {
      params: { id: 'report_1' },
    });

    expect(res.status).toBe(402);
    expect(vi.mocked(completeLlmChat)).not.toHaveBeenCalled();
  });

  it('hides reports owned by another user', async () => {
    mockReportLookup({ user_id: 'victim_user', payment_status: 'paid' });

    const res = await POST(request({ question: 'What should I do?', context: 'report text' }), {
      params: { id: 'report_1' },
    });

    expect(res.status).toBe(404);
    expect(vi.mocked(completeLlmChat)).not.toHaveBeenCalled();
  });

  it('answers for the owning user of a paid report', async () => {
    mockReportLookup({ user_id: 'owner_user', payment_status: 'paid' });

    const res = await POST(request({ question: 'What should I do?', context: 'report text' }), {
      params: { id: 'report_1' },
    });
    const body = (await res.json()) as { answer?: string };

    expect(res.status).toBe(200);
    expect(body.answer).toBe('Grounded answer');
    expect(vi.mocked(completeLlmChat)).toHaveBeenCalledOnce();
  });
});
