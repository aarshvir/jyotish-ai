import { getText, stripControls, looksLikeInjection } from '../http';

export interface ExternalSignal {
  source: string;
  term: string;
  detail: string;
  heat: number;
}

const ASTRO_HINT =
  /\b(astro|kundli|kundali|jyotish|vedic|muhurat|muhurta|hora|rahu|nakshatra|manglik|sade\s?sati|panchang|choghadiya|dasha|shaadi|vivah|marriage|horoscope)\b/i;

export async function fetchTrendsIN(): Promise<{ signals: ExternalSignal[]; error?: string }> {
  const r = await getText('https://trends.google.com/trending/rss?geo=IN');
  if (!r.ok) return { signals: [], error: `trends ${r.status}: ${r.text.slice(0, 120)}` };
  const titles = [...r.text.matchAll(/<title>([^<]+)<\/title>/g)].map((m) => decodeXml(m[1])).slice(1);
  const signals: ExternalSignal[] = [];
  titles.forEach((t, i) => {
    const term = stripControls(t, 80);
    if (!term || looksLikeInjection(term)) return;
    if (!ASTRO_HINT.test(term) && i > 8) return;
    signals.push({
      source: 'google_trends_in',
      term,
      detail: ASTRO_HINT.test(term) ? 'astrology-adjacent India trend' : 'general India trend (low weight unless overlap)',
      heat: ASTRO_HINT.test(term) ? 0.8 - i * 0.03 : 0.15,
    });
  });
  return { signals: signals.slice(0, 20) };
}

function decodeXml(s: string): string {
  return s
    .replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"');
}
