import { getJson, stripControls, looksLikeInjection } from '../http';
import type { ExternalSignal } from './trends';

const QUERIES = ['astrotalk', 'astrosage', 'costar astrology', 'kundli', 'vedic astrology'];

interface ItunesSearch {
  results?: { trackId?: number; trackName?: string; userRatingCount?: number; averageUserRating?: number }[];
}
interface ItunesReviewFeed {
  feed?: { entry?: { title?: { label?: string }; content?: { label?: string } }[] };
}

const COMPLAINT =
  /\b(wrong|inaccurate|generic|same for everyone|timezone|refund|crash|confusing|sanskrit|jargon|not personal|waste|fake)\b/i;

export async function fetchItunes(): Promise<{ signals: ExternalSignal[]; error?: string }> {
  const signals: ExternalSignal[] = [];
  const errors: string[] = [];
  for (const q of QUERIES) {
    const search = await getJson<ItunesSearch>(
      `https://itunes.apple.com/search?term=${encodeURIComponent(q)}&country=in&entity=software&limit=3`,
    );
    if (!search.ok || !search.json?.results?.length) {
      errors.push(`search ${q}: ${search.error ?? search.status}`);
      continue;
    }
    for (const app of search.json.results.slice(0, 2)) {
      if (!app.trackId) continue;
      const heat = Math.min(0.9, (app.userRatingCount ?? 0) / 80_000);
      signals.push({
        source: 'itunes',
        term: stripControls(app.trackName ?? q, 80),
        detail: `ratings=${app.userRatingCount ?? 0} avg=${app.averageUserRating ?? 0}`,
        heat: 0.3 + heat * 0.4,
      });
      const rss = await getJson<ItunesReviewFeed>(
        `https://itunes.apple.com/in/rss/customerreviews/id=${app.trackId}/sortBy=mostRecent/json`,
      );
      const entries = rss.json?.feed?.entry ?? [];
      for (const e of entries.slice(0, 12)) {
        const title = stripControls(e.title?.label ?? '', 100);
        const body = stripControls(e.content?.label ?? '', 160);
        if (!title || looksLikeInjection(title)) continue;
        if (!COMPLAINT.test(`${title} ${body}`)) continue;
        signals.push({
          source: 'itunes_review',
          term: title,
          detail: `competitor complaint via Apple RSS (${app.trackName})`,
          heat: 0.55,
        });
      }
    }
  }
  return { signals: signals.slice(0, 40), error: errors.length ? errors.join('; ') : undefined };
}
