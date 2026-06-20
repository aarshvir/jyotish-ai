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
import { post as scienceOfTiming } from './science-of-timing-vedic-muhurta';
import { post as bestPlatforms } from './best-vedic-astrology-platforms-2026';
import { post as twelveHouses } from './twelve-houses-vedic-astrology';
import { post as moonSignVsSunSignVedic } from './moon-sign-vs-sun-sign-vedic';
import { post as kaalSarpDoshaExplained } from './kaal-sarp-dosha-explained';
import { post as panchangExplainedBeginners } from './panchang-explained-beginners';
import { post as atmakarakaSoulPlanetJaimini } from './atmakaraka-soul-planet-jaimini';
import { post as ayanamsaLahiriExplained } from './ayanamsa-lahiri-explained';
import { post as bhakootDoshaExplained } from './bhakoot-dosha-explained';
import { post as birthTimeRectificationGuide } from './birth-time-rectification-guide';
import { post as brahmaMuhuratGuide } from './brahma-muhurat-guide';
import { post as choghadiyaVsHoraTiming } from './choghadiya-vs-hora-timing';
import { post as lagnaAscendantGuide } from './lagna-ascendant-guide';
import { post as nadiDoshaKundliMatching } from './nadi-dosha-kundli-matching';
import { post as rajaYogaDhanaYogaKundli } from './raja-yoga-dhana-yoga-kundli';
import { post as retrogradePlanetsVakriKundli } from './retrograde-planets-vakri-kundli';
import { post as saturnReturnVsSadeSati } from './saturn-return-vs-sade-sati';
import { post as shaniDhaiyaExplained } from './shani-dhaiya-explained';
import { post as vivahMuhuratMarriageTiming } from './vivah-muhurat-marriage-timing';
import { post as yamagandaGulikaKaalGuide } from './yamaganda-gulika-kaal-guide';
export const POSTS: BlogPost[] = [
  yamagandaGulikaKaalGuide,
  vivahMuhuratMarriageTiming,
  shaniDhaiyaExplained,
  saturnReturnVsSadeSati,
  retrogradePlanetsVakriKundli,
  rajaYogaDhanaYogaKundli,
  nadiDoshaKundliMatching,
  lagnaAscendantGuide,
  choghadiyaVsHoraTiming,
  brahmaMuhuratGuide,
  birthTimeRectificationGuide,
  bhakootDoshaExplained,
  ayanamsaLahiriExplained,
  atmakarakaSoulPlanetJaimini,
  panchangExplainedBeginners,
  kaalSarpDoshaExplained,
  moonSignVsSunSignVedic,
  bestPlatforms,
  twelveHouses,
  scienceOfTiming,
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
