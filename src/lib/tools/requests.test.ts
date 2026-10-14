import { afterEach, describe, expect, it, vi } from 'vitest';
import { LatestRequest, requestJson, RequestTimeout } from './requests';

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
describe('request deadlines and stale protection', () => {
  it('rejects superseded and edited requests even if providers ignore abort', () => {
    const latest = new LatestRequest();
    const first = latest.start();
    const second = latest.start();
    expect(latest.isCurrent(first)).toBe(false);
    expect(first.signal.aborted).toBe(true);
    expect(latest.isCurrent(second)).toBe(true);
    latest.cancel();
    expect(latest.isCurrent(second)).toBe(false);
  });
  it('bounds a hung provider and supports a fresh retry', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn().mockImplementationOnce(() => new Promise(() => {})).mockResolvedValue(Response.json({ ok: true })));
    const first = requestJson('/test', {}, 100);
    const assertion = expect(first).rejects.toBeInstanceOf(RequestTimeout);
    await vi.advanceTimersByTimeAsync(101);
    await assertion;
    expect((await requestJson('/test')).data).toEqual({ ok: true });
    expect(vi.getTimerCount()).toBe(0);
  });
  it('also bounds a hung JSON response body', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn(async () => ({ json: () => new Promise(() => {}) })));
    const pending = requestJson('/test', {}, 100);
    const assertion = expect(pending).rejects.toBeInstanceOf(RequestTimeout);
    await vi.advanceTimersByTimeAsync(101);
    await assertion;
  });
  it('cancels an in-flight call and clears its deadline', async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})));
    const pending = requestJson('/test', { signal: controller.signal });
    controller.abort();
    await expect(pending).rejects.toHaveProperty('name', 'AbortError');
    expect(vi.getTimerCount()).toBe(0);
  });
  it('does not issue a request when already cancelled', async () => {
    const controller = new AbortController();
    controller.abort();
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    await expect(requestJson('/test', { signal: controller.signal })).rejects.toHaveProperty('name', 'AbortError');
    expect(fetch).not.toHaveBeenCalled();
  });
});
