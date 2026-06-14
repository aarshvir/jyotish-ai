import type { BlogPost } from './types';
import { post as gunMilan } from './gun-milan-score-marriage';
import { post as manglik } from './manglik-dosha-marriage';
import { post as sadeSati } from './sade-sati-guide';
import { post as vedicVsWestern } from './vedic-vs-western-astrology';
import { post as howToReadKundli } from './how-to-read-kundli';

export const POSTS: BlogPost[] = [gunMilan, manglik, sadeSati, vedicVsWestern, howToReadKundli].sort(
  (a, b) => b.date.localeCompare(a.date),
);

export function getPost(slug: string): BlogPost | undefined {
  return POSTS.find((p) => p.slug === slug);
}
