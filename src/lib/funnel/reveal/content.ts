/**
 * The reveal's interpretation library. Every line is keyed to one chart placement and is
 * only ever shown when that placement is in the visitor's computed chart (H3).
 *
 * Writing rules: plain words, short sentences, themes and tendencies — never outcomes
 * (H5). The banned-term lint in ./lint.ts runs over this whole file's text in tests.
 */

import type { Lord, MeritLevel, Sign } from './astro';

export const NAKSHATRAS = [
  'Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra',
  'Punarvasu', 'Pushya', 'Ashlesha', 'Magha', 'Purva Phalguni', 'Uttara Phalguni',
  'Hasta', 'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha',
  'Mula', 'Purva Ashadha', 'Uttara Ashadha', 'Shravana', 'Dhanishta', 'Shatabhisha',
  'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati',
] as const;

const NAK_LORD_CYCLE = ['Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury'];

/** Vimshottari lord of a nakshatra, or null if the name is not recognised. */
export function nakshatraLord(name: string | null | undefined): string | null {
  const i = NAKSHATRAS.indexOf((name ?? '') as (typeof NAKSHATRAS)[number]);
  return i < 0 ? null : NAK_LORD_CYCLE[i % 9];
}

/** Card 1 — Ketu by sign: what you carry in. */
export const KETU_SIGN: Record<Sign, string> = {
  Aries:
    'Ketu in Aries carries an old instinct for acting first and asking later. Starting things alone, taking the hit, standing up for others: you already know how. The pattern is impatience with anything that moves at other people’s pace.',
  Taurus:
    'Ketu in Taurus carries a settled sense of what things are really worth. Saving, holding steady and making comfort last come naturally. The pattern is that security, once reached, stops feeling like enough, and you quietly move on from it.',
  Gemini:
    'Ketu in Gemini carries a quick, restless mind. Picking up words, skills and new tools takes you little effort. The pattern is boredom with small talk and second-hand information: you want the source, not one more opinion about it.',
  Cancer:
    'Ketu in Cancer carries a deep habit of looking after people. You read moods before anyone speaks and can make a room feel safe. The pattern is giving that care to everyone while your own needs quietly wait their turn.',
  Leo:
    'Ketu in Leo carries the ease of someone used to being in charge. Taking the lead, speaking up and being seen do not scare you. The pattern is that praise means less than it should, and authority starts to feel heavy.',
  Virgo:
    'Ketu in Virgo carries a sharp eye for what is broken and how to fix it. Detail, method and useful service come without trying. The pattern is an inner critic that rarely switches off, aimed mostly at your own work.',
  Libra:
    'Ketu in Libra carries a natural sense of fairness and balance. You can read both sides, calm a quarrel and make a deal feel even. The pattern is keeping the peace for everyone else until your own wishes get lost.',
  Scorpio:
    'Ketu in Scorpio carries an instinct for what is hidden. Research, secrets and the hard moments other people avoid: you stay calm in them. The pattern is trusting slowly and testing people long after they have shown who they are.',
  Sagittarius:
    'Ketu in Sagittarius carries old faith and a teacher’s voice. Explaining big ideas and finding meaning in hard times come naturally. The pattern is distrust of borrowed belief: rules handed down without reasons simply stop working for you.',
  Capricorn:
    'Ketu in Capricorn carries a long habit of duty and hard work. Structure, patience and carrying responsibility feel familiar. The pattern is working harder by default, then wondering why the reward feels empty when it finally comes.',
  Aquarius:
    'Ketu in Aquarius carries a mind built for systems and groups. You see how the whole thing works and where it breaks. The pattern is feeling slightly outside every circle you belong to, even the ones you helped build.',
  Pisces:
    'Ketu in Pisces carries strong intuition and a pull toward quiet. Prayer, music, imagination and letting go come easily. The pattern is drifting away from practical plans, and needing more time alone than the people around you understand.',
};

/** Card 1 — Ketu by house. Continues "Placed in your Nth house, …". */
export const KETU_HOUSE: Record<number, string> = {
  1: 'it touches your sense of self. You can be hard to read, even to yourself, and your instincts about people are usually right. Image and first impressions matter less to you than to most, and that is part of the lesson.',
  2: 'it touches family, savings and speech. Money can come and go without sticking, and you may say little or say things bluntly. What you carry in is a feel for real value; this life asks you to build on it on purpose.',
  3: 'it touches courage, effort and siblings. Bold action comes easily, sometimes so easily that you skip the follow-through. Writing, media and short trips may feel like familiar ground. The lesson is to finish what you start instead of starting again.',
  4: 'it touches home, mother and inner peace. You may feel unsettled in one place, or move more often than you planned. Your private life runs on instinct. The lesson sits opposite, in the 10th: a public role, while home stays simple.',
  5: 'it touches creativity, learning and past merit. Talent may arrive without much training, and mantra or study can feel like remembering. You may doubt your own gifts. The lesson sits opposite, in the 11th: sharing what you make with a wider circle.',
  6: 'it touches work routines, rivals and service. You handle problems and competition calmly, as if you have done it before. Daily discipline can slip because nothing feels urgent. The lesson sits opposite, in the 12th: rest, retreat and letting go.',
  7: 'it touches partnership and marriage. You may feel you give more than you get, or keep some distance even when close. Partners often feel familiar from the start. The lesson sits opposite, in the 1st: knowing yourself before leaning on another.',
  8: 'it touches hidden matters, research and shared money. Sudden changes tend to steady you rather than shake you, and you sense what is left unsaid. The lesson sits opposite, in the 2nd: steady saving, plain speech and family ties.',
  9: 'it touches belief, teachers and fortune. You may question gurus and inherited rituals, yet hold a private faith of your own. The lesson sits opposite, in the 3rd: testing ideas through your own effort and action instead of borrowed answers.',
  10: 'it touches career and public standing. Titles matter less to you than to others, and you may change direction more than once. Skill at work comes naturally. The lesson sits opposite, in the 4th: a settled home life that supports the work.',
  11: 'it touches gains, friends and networks. Income may arrive by unusual routes, and big circles tire you quickly; you stay loyal to a few. The lesson sits opposite, in the 5th: your own creativity ahead of the crowd’s approval.',
  12: 'it touches solitude, faraway places and letting go. Meditation, sleep and quiet time may come more naturally to you than to most. Expenses can slip away unnoticed. The lesson sits opposite, in the 6th: routine, discipline and practical service.',
};

/** Card 2 — Rahu by sign: what this life asks. */
export const RAHU_SIGN: Record<Sign, string> = {
  Aries:
    'Rahu in Aries is hungry for independence and a first-place finish. This life pushes you to act under your own name, take the initiative and compete. The trap is rushing in too fast; the gift is real courage of your own.',
  Taurus:
    'Rahu in Taurus is hungry for security you can touch: savings, property, good food, lasting comfort. This life asks you to build wealth patiently. The trap is wanting more of it than you need; the gift is real stability.',
  Gemini:
    'Rahu in Gemini is hungry for information, conversation and trade. This life pulls you toward media, writing, sales, networks and new skills. The trap is scattering into too many directions at once; the gift is becoming a sharp communicator.',
  Cancer:
    'Rahu in Cancer is hungry for belonging: a home, a family, a place that is yours. This life asks you to care for people and let yourself be cared for. The trap is holding on too tightly; the gift is emotional roots.',
  Leo:
    'Rahu in Leo is hungry to be seen and to lead. This life pushes you toward the stage, authority and creative work with your name on it. The trap is chasing applause; the gift is confident, generous leadership.',
  Virgo:
    'Rahu in Virgo is hungry to be useful and precise. This life pulls you toward analysis, service, editing and fixing systems that others ignore. The trap is anxious perfectionism; the gift is becoming the person everyone trusts with the details.',
  Libra:
    'Rahu in Libra is hungry for partnership and good relations. This life asks you to work with people: contracts, design, law, diplomacy and marriage. The trap is losing yourself to please others; the gift is genuine partnership.',
  Scorpio:
    'Rahu in Scorpio is hungry for depth and control. This life pulls you toward research, investigation, psychology and handling shared money. The trap is suspicion and intensity; the gift is the nerve to look at what others avoid.',
  Sagittarius:
    'Rahu in Sagittarius is hungry for meaning, travel and higher learning. This life pulls you toward teaching, philosophy, law, publishing and foreign places. The trap is preaching before practising; the gift is a hard-won belief of your own.',
  Capricorn:
    'Rahu in Capricorn is hungry for achievement and standing. This life pushes you to climb, take on responsibility and build something that lasts in the world. The trap is ambition at any price; the gift is real authority, earned slowly.',
  Aquarius:
    'Rahu in Aquarius is hungry for change on a large scale. This life pulls you toward technology, networks, social causes and unusual ideas. The trap is being different for its own sake; the gift is improving systems many people use.',
  Pisces:
    'Rahu in Pisces is hungry for the unseen: imagination, spirituality and faraway places. This life pulls you toward art, healing work, retreat and foreign lands. The trap is escaping into fantasy; the gift is inspiration you can share.',
};

/** Card 2 — Rahu by house. Continues "Placed in your Nth house, …". */
export const RAHU_HOUSE: Record<number, string> = {
  1: 'it asks you to build a strong identity of your own. Self-image, daily habits and personal ambition become central. You may reinvent yourself more than once. The work is to become someone on purpose, not by accident.',
  2: 'it asks you to build savings, family ties and a voice people listen to. Money, food and speech become central themes. The work is to earn and speak with care, so that what you build actually stays with you.',
  3: 'it asks you for courage and constant effort. Media, writing, sales, short travel and bold moves are your growth areas, and siblings may play a big role. The work is to keep trying past the point where most people stop.',
  4: 'it asks you to build a home and an inner peace you can rely on. Property, vehicles, your mother and where you live become central. You may settle far from where you were born. The work is to make a real base.',
  5: 'it asks you to create, learn and back your own ideas. Teaching, creative work, speculation and romance become important themes. The work is to trust your intelligence while keeping a cool head about gambles and quick wins.',
  6: 'it asks you to handle work, competition and daily problems head-on. Service, legal matters, routines and rivals are your growth ground, and you can do well where others struggle. The work is to stay disciplined without becoming combative.',
  7: 'it asks you to grow through partnership: marriage, business partners, clients and the public. Relationships may feel intense or come from unexpected backgrounds. The work is to choose partners with open eyes and keep your own centre as you commit.',
  8: 'it asks you to face change and look at what is hidden. Research, shared finances, insurance, inheritance and deep study become central, and life may take sudden turns. The work is to stay steady through change instead of resisting it.',
  9: 'it asks you to find your own belief, teachers and higher learning. Long journeys, study abroad, law or philosophy may pull at you, and you may break with family tradition. The work is to build a faith you have tested yourself.',
  10: 'it asks you to build a career and public standing. Ambition, recognition and responsibility become central, and you may rise in a field unusual for your family. The work is to grow your status without letting it run your life.',
  11: 'it asks you to aim high and build networks. Income, friends, large groups and long-term goals become central, and gains can come suddenly through contacts. The work is to keep your goals honest and your friendships real.',
  12: 'it asks you to explore solitude, foreign lands and the spiritual side of life. Travel abroad, retreats, ashrams or work behind the scenes may play a role, and spending can rise. The work is to let go in a healthy way, not to escape.',
};

/** Conjunctions: a graha in the same sign as Ketu / Rahu. */
export const KETU_CONJ: Record<Lord, string> = {
  Sun: 'The Sun sits with Ketu, so recognition and authority may feel less important to you than they look.',
  Moon: 'The Moon sits with Ketu, so your feelings run deep but are not always easy to name.',
  Mars: 'Mars sits with Ketu, adding sharp instinct and sudden bursts of energy to this area.',
  Mercury: 'Mercury sits with Ketu, giving intuitive thinking that skips steps other people need.',
  Jupiter: 'Jupiter sits with Ketu, a classic sign of inner wisdom and a private spiritual streak.',
  Venus: 'Venus sits with Ketu, so art and love carry an old, familiar quality for you.',
  Saturn: 'Saturn sits with Ketu, making this area a place of quiet, serious, long-term work.',
};

export const RAHU_CONJ: Record<Lord, string> = {
  Sun: 'The Sun sits with Rahu, adding a strong hunger for recognition and authority here.',
  Moon: 'The Moon sits with Rahu, so emotions in this area can run high and restless.',
  Mars: 'Mars sits with Rahu, adding drive and boldness; pacing yourself works better than forcing.',
  Mercury: 'Mercury sits with Rahu, giving an inventive mind that suits technology and trade.',
  Jupiter: 'Jupiter sits with Rahu, pulling you toward unconventional teachers and big, unusual ideas.',
  Venus: 'Venus sits with Rahu, adding a strong desire for beauty, comfort and pleasure.',
  Saturn: 'Saturn sits with Rahu, so growth here comes through persistence and structure, slowly.',
};

/** Card 3 — the past-merit reserve, by level. */
export const MERIT_TEXT: Record<MeritLevel, string> = {
  Strong:
    'A strong 5th lord is read as a good reserve of past merit: learning sticks, ideas land and creative risks tend to repay you. Use it on purpose — merit grows when it is spent on what matters to you.',
  Moderate:
    'A moderate 5th lord is read as a working reserve of past merit: ideas and learning respond to steady effort more than luck. Regular practice, study or prayer is what turns this reserve into results.',
  Developing:
    'A developing 5th lord is read as merit you build in this life rather than inherit. Learning and creative work grow through patience and repetition, and small daily practice adds up here more than single big efforts.',
};

/** Locked sections of the full blueprint (spec S16). Keys are ordered by focus area. */
export const LOCKED_SECTIONS = {
  debt: 'Your karmic-debt house & what eases it',
  windows: 'Rahu–Ketu sensitive windows, next 12 months',
  dasha: 'The life chapter (dasha) you’re in now',
  relationship: 'Relationship karma (7th house + Venus)',
  career: 'Career karma (10th house + Saturn)',
} as const;
export type LockedKey = keyof typeof LOCKED_SECTIONS;

export const LOCKED_ORDER: Record<string, LockedKey[]> = {
  career: ['career', 'dasha', 'windows', 'debt', 'relationship'],
  love: ['relationship', 'windows', 'dasha', 'debt', 'career'],
  family: ['debt', 'dasha', 'relationship', 'windows', 'career'],
  health: ['dasha', 'windows', 'debt', 'career', 'relationship'],
  trust: ['relationship', 'debt', 'windows', 'dasha', 'career'],
};
export const LOCKED_DEFAULT: LockedKey[] = ['debt', 'windows', 'dasha', 'relationship', 'career'];
