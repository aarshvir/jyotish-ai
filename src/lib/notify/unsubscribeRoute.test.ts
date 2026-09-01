import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  addSuppression: vi.fn(),
  createServiceClient: vi.fn(),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createServiceClient: mocks.createServiceClient,
}));

vi.mock('@/lib/notify/suppression', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./suppression')>();
  return {
    ...actual,
    addSuppression: mocks.addSuppression,
  };
});

import { GET, POST } from '@/app/api/unsubscribe/route';
import { makeUnsubToken } from './suppression';

const originalSecret = process.env.UNSUBSCRIBE_SECRET;
process.env.UNSUBSCRIBE_SECRET = 'unsubscribe-route-test-secret';

const db = { name: 'service-client' };

function getRequest(token: string, headers?: HeadersInit): NextRequest {
  return new NextRequest(
    `https://www.vedichour.com/api/unsubscribe?t=${encodeURIComponent(token)}`,
    { headers },
  );
}

function postRequest(token: string): NextRequest {
  return new NextRequest('https://www.vedichour.com/api/unsubscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ t: token }),
  });
}

describe('unsubscribe route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createServiceClient.mockReturnValue(db);
    mocks.addSuppression.mockResolvedValue(true);
  });

  afterAll(() => {
    if (originalSecret === undefined) {
      delete process.env.UNSUBSCRIBE_SECRET;
    } else {
      process.env.UNSUBSCRIBE_SECRET = originalSecret;
    }
  });

  it('renders a confirmation form for a valid GET without mutating', async () => {
    // Node's base64 decoder ignores these characters, so the token still verifies.
    // The original token must therefore be escaped before placing it in HTML.
    const token = makeUnsubToken('reader@example.com').replace('.', '."<');
    const escapedToken = token.replace('"', '&quot;').replace('<', '&lt;');

    const response = await GET(getRequest(token));
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(html).toContain('<form method="post" action="/api/unsubscribe">');
    expect(html).toContain(`name="t" value="${escapedToken}"`);
    expect(html).not.toContain(`name="t" value="${token}"`);
    expect(html).not.toContain('reader@example.com');
    expect(mocks.createServiceClient).not.toHaveBeenCalled();
    expect(mocks.addSuppression).not.toHaveBeenCalled();
  });

  it('keeps prefetch GET requests mutation-free', async () => {
    const token = makeUnsubToken('prefetch@example.com');

    const response = await GET(getRequest(token, { Purpose: 'prefetch' }));

    expect(response.status).toBe(200);
    expect(await response.text()).toContain('Confirm unsubscribe');
    expect(mocks.createServiceClient).not.toHaveBeenCalled();
    expect(mocks.addSuppression).not.toHaveBeenCalled();
  });

  it('rejects an invalid GET without rendering a form or mutating', async () => {
    const response = await GET(getRequest('forged-token'));
    const html = await response.text();

    expect(response.status).toBe(400);
    expect(html).toContain('Link expired');
    expect(html).not.toContain('<form');
    expect(mocks.createServiceClient).not.toHaveBeenCalled();
    expect(mocks.addSuppression).not.toHaveBeenCalled();
  });

  it('adds a suppression for a valid POSTed form token', async () => {
    const token = makeUnsubToken('reader@example.com');

    const response = await POST(postRequest(token));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(mocks.createServiceClient).toHaveBeenCalledTimes(1);
    expect(mocks.addSuppression).toHaveBeenCalledWith(
      db,
      'reader@example.com',
      'unsubscribe-link',
    );
  });

  it('rejects an invalid POST without creating a client or mutating', async () => {
    const response = await POST(postRequest('forged-token'));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ ok: false });
    expect(mocks.createServiceClient).not.toHaveBeenCalled();
    expect(mocks.addSuppression).not.toHaveBeenCalled();
  });
});
