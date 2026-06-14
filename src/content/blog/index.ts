import type { BlogPost } from "./types";
import { post as gunMilan } from './gun-milan-score-marriage';
import { post as manglik } from './manglik-dosha-marriage';
import { post as sadeSati } from './sade-sati-guide';
import { post as vedicVsWestern } from './vedic-vs-western-astrology';
import { post as howToReadKundli } from './how-to-read-kundli';
import { post as choghadiya } from './choghadiya-guide';
import { post as whatIsMuhurat } from './what-is-muhurat';
import { post as rahuKaal } from './rahu-kaal-explained';
import { post as aiVedicAstrology } from './how-ai-is-changing-vedic-astrology';
import { post as hora } from './hora-planetary-hours-guide';
import { post as nakshatraBirthStar } from './nakshatra-birth-star-guide';
import { post as vimshottariDasha } from './vimshottari-dasha-current-period';
import { post as bestAiVedicApp } from "./best-ai-vedic-astrology-app-2026";
import { post as bestTimeToStartBusiness } from './best-time-to-start-business-astrology';
import { post as careerAstrology } from './career-astrology-10th-house';
export const POSTS: BlogPost[] = [
  careerAstrology,
  gunMilan,
  manglik,
  sadeSati,
  vedicVsWestern,
  howToReadKundli,
  choghadiya,
  whatIsMuhurat,
  rahuKaal,
  aiVedicAstrology,
  hora,
  nakshatraBirthStar,
  vimshottariDasha,
  bestAiVedicApp,
  bestTimeToStartBusiness
].sort((a, b) => b.date.localeCompare(a.date));

export function getPost(slug: string): BlogPost | undefined {
  return POSTS.find((p) => p.slug === slug);
}
