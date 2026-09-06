const UA = 'VedicHourMarketingEngine/1.0 (+https://vedichour.com; research; polite)';

export async function getText(url: string, timeoutMs = 12_000): Promise<{ ok: boolean; status: number; text: string }> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'user-agent': UA, accept: 'application/rss+xml, application/json, text/plain, */*' },
      redirect: 'follow',
    });
    const text = await res.text();
    return { ok: res.ok, status: res.status, text };
  } catch (e) {
    return { ok: false, status: 0, text: String(e instanceof Error ? e.message : e) };
  } finally {
    clearTimeout(t);
  }
}

export async function getJson<T>(url: string, timeoutMs = 12_000): Promise<{ ok: boolean; status: number; json: T | null; error?: string }> {
  const r = await getText(url, timeoutMs);
  if (!r.ok) return { ok: false, status: r.status, json: null, error: r.text.slice(0, 200) };
  try {
    return { ok: true, status: r.status, json: JSON.parse(r.text) as T };
  } catch {
    return { ok: false, status: r.status, json: null, error: 'invalid json' };
  }
}

export function stripControls(s: string, max = 180): string {
  return s.replace(/[\u0000-\u001F]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

/** Harvested third-party text is data, never instructions. Drop prompt-injection-shaped titles. */
export function looksLikeInjection(s: string): boolean {
  return /ignore (all|previous) instructions|system prompt|you are now/i.test(s);
}
