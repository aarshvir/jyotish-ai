import { getJson, stripControls, looksLikeInjection } from '../http';
import { envStr } from '../env';
import type { ExternalSignal } from './trends';

/** Official YouTube Data API only. Hard-capped. */
export async function fetchYoutube(): Promise<{ signals: ExternalSignal[]; error?: string }> {
  const key = envStr('YOUTUBE_API_KEY');
  if (!key) return { signals: [], error: 'YOUTUBE_API_KEY unset — skipped (no scrape fallback)' };
  const queries = ['muhurat', 'rahu kaal today', 'vedic hora'];
  const signals: ExternalSignal[] = [];
  const errors: string[] = [];
  for (const q of queries) {
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=5&q=${encodeURIComponent(q)}&key=${key}`;
    const r = await getJson<{ items?: { snippet?: { title?: string } }[]; error?: { message?: string } }>(url);
    if (!r.ok) {
      errors.push(`${q}: ${r.error ?? r.status}`);
      continue;
    }
    for (const item of r.json?.items ?? []) {
      const term = stripControls(item.snippet?.title ?? '', 100);
      if (!term || looksLikeInjection(term)) continue;
      signals.push({ source: 'youtube', term, detail: `search:${q}`, heat: 0.5 });
    }
  }
  return { signals, error: errors.length ? errors.join('; ') : undefined };
}
