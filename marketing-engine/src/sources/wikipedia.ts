import { getJson, stripControls, looksLikeInjection } from '../http';
import type { ExternalSignal } from './trends';

const TERMS = ['muhurat', 'hora (astrology)', 'Rahu Kaal', 'Choghadiya', 'Sade Sati', 'Manglik'];

export async function fetchWikipedia(): Promise<{ signals: ExternalSignal[]; error?: string }> {
  const signals: ExternalSignal[] = [];
  const errors: string[] = [];
  for (const q of TERMS) {
    const url = `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(q)}&limit=6&namespace=0&format=json`;
    const r = await getJson<[string, string[], string[], string[]]>(url);
    if (!r.ok || !r.json) {
      errors.push(`${q}: ${r.error ?? r.status}`);
      continue;
    }
    const titles = r.json[1] ?? [];
    titles.forEach((t, i) => {
      const term = stripControls(t, 80);
      if (!term || looksLikeInjection(term)) return;
      signals.push({
        source: 'wikipedia',
        term,
        detail: `opensearch:${q}`,
        heat: 0.45 - i * 0.04,
      });
    });
  }
  return { signals, error: errors.length ? errors.join('; ') : undefined };
}
