/**
 * Authored text for the Karmic Blueprint: the traditional readings the narrative builds on
 * and the plain fallback shown if a generated section cannot be cleared by the content lint.
 *
 * Writing rules (VEDICHOUR_QUIZ_SPEC H5): themes and tendencies only. No outcome, no
 * prediction of loss, illness, separation or children; nothing to buy; nothing medical.
 * `blueprintLibrary.test.ts` runs the whole of this file through the banned-term lint.
 */

/** Traditional one-line keynote for each nakshatra. */
export const NAKSHATRA_NOTE: Record<string, string> = {
  Ashwini: 'quick starts, a healing impulse, a restless pioneering energy',
  Bharani: 'carrying weight, transformation through responsibility',
  Krittika: 'cutting through, sharp discernment, purifying fire',
  Rohini: 'growth, attraction, a wish to build something lasting and good to look at',
  Mrigashira: 'searching and curiosity, always looking for the next thing',
  Ardra: 'storms that clear the air, intense feeling followed by renewal',
  Punarvasu: 'return and renewal, starting again after a setback',
  Pushya: 'nourishing, caring and teaching, steady support for others',
  Ashlesha: 'insight and entanglement, strong instincts and guarded feelings',
  Magha: 'ancestry, dignity, a sense of inherited standing',
  'Purva Phalguni': 'pleasure, rest, creativity, enjoying what was earned',
  'Uttara Phalguni': 'loyal friendship, dependable partnership, help given and received',
  Hasta: 'skilled hands, craft, practical cleverness',
  Chitra: 'design and craft, a wish to make something striking',
  Swati: 'independence and flexibility, like a reed bending in the wind',
  Vishakha: 'determined pursuit of a goal, single-minded drive',
  Anuradha: 'devotion, friendship, working well in a group',
  Jyeshtha: 'seniority and protection, the weight of being the elder one',
  Mula: 'getting to the root, clearing out what is false',
  'Purva Ashadha': 'confidence and persuasion, early victories',
  'Uttara Ashadha': 'lasting success through principle and patience',
  Shravana: 'listening and learning, connecting through what is heard',
  Dhanishta: 'rhythm, resources, group achievement',
  Shatabhisha: 'healing, privacy, a mind that works best alone',
  'Purva Bhadrapada': 'intensity, transformation, fierce idealism',
  'Uttara Bhadrapada': 'depth and calm, wisdom from long reflection',
  Revati: 'completion, protecting the vulnerable, a gentle ending to a journey',
};

/**
 * The Rahu–Ketu axis as a pair of houses, read from the house Rahu is in.
 * Index: Rahu's house 1–12. Rahu is where this life pulls; Ketu is what is carried in.
 */
export const AXIS_THEME: Record<number, string> = {
  1: 'This life pulls you toward building a self of your own: identity, initiative, being seen as an individual. What you carry in is a habit of defining yourself through partners, deals and other people’s expectations. The work of this life is to choose from your own centre first, then partner from strength.',
  2: 'This life pulls you toward building resources of your own: earnings, savings, a settled family life, a voice you trust. What you carry in is a comfort with shared or inherited resources and with other people’s crises. The work is to earn, keep and speak plainly in your own name.',
  3: 'This life pulls you toward effort, courage and communication: learning a craft, writing, making things, showing up. What you carry in is a set of fixed beliefs and a teacher’s voice. The work is to act and practise, not only to hold the right view.',
  4: 'This life pulls you toward roots: home, inner steadiness, belonging somewhere. What you carry in is an established public ambition and the habit of finding identity in status. The work is to build a home life that matters as much as the title.',
  5: 'This life pulls you toward creating and learning in your own name: ideas, study, romance, taking a personal risk. What you carry in is comfort in groups and networks, and gains that come through other people. The work is to put your own ideas in front.',
  6: 'This life pulls you toward daily work and service: skills, routines, solving real problems for real people. What you carry in is an old habit of withdrawing, escaping or dissolving into solitude. The work is to show up, in practical ways, again and again.',
  7: 'This life pulls you toward partnership: being truly met by another person, and making agreements that hold. What you carry in is strong self-reliance and the habit of managing alone. The work is to let others in without losing yourself.',
  8: 'This life pulls you toward depth: shared resources, research, honest change, what is usually hidden. What you carry in is a settled sense of your own worth and family values. The work is to open up, trust others with what is shared, and let some things be changed.',
  9: 'This life pulls you toward meaning: teachers, higher learning, long journeys, a worldview of your own. What you carry in is the habit of doing and talking, and a restlessness that skips the question of why. The work is to slow down, commit to a path and understand it.',
  10: 'This life pulls you toward a public role: career, responsibility, a reputation you build. What you carry in is a familiar pull to retreat into comfort, home or the past. The work is to take visible responsibility without waiting for everything to feel settled.',
  11: 'This life pulls you toward networks and long-term goals: communities, friendships, gains built with others. What you carry in is individual creative intensity and a need to be the centre. The work is to build with groups and let go of needing to be the star.',
  12: 'This life pulls you toward solitude and release: rest, spiritual practice, time away, letting go. What you carry in is the old habit of busyness, duty and service to everyone. The work is to make space, and to rest without guilt.',
};

/** Three plain practices for the house Ketu sits in. Free, practical, and not medical. */
export const DEBT_PRACTICES: Record<number, string[]> = {
  1: [
    'Each Sunday, write one paragraph on what you want, before anyone else’s opinion enters.',
    'Decide one small thing a day without asking anyone.',
    'Keep one promise to yourself every week: a walk, a bedtime, a call you owe yourself.',
  ],
  2: [
    'For 30 days, write down every rupee spent. No budget yet, just the numbers.',
    'Once a week, tell one family member something kind and specific.',
    'On the day you are paid, move a fixed small amount to savings before you spend anything.',
  ],
  3: [
    'Finish one small thing you started and left, every week.',
    'Call a sibling or close friend on a fixed day, and keep the day.',
    'Write or record for 15 minutes a day, then stop.',
  ],
  4: [
    'Do one practical thing for your home each week: fix, clean or cook.',
    'Call your mother or an elder at home at a fixed time.',
    'Keep one corner of your home quiet and phone-free.',
  ],
  5: [
    'Study one subject for 20 minutes a day for 40 days.',
    'Make something with your hands each week, however small.',
    'Teach what you know to one person each month.',
  ],
  6: [
    'Clear one small pending obligation a month, smallest first.',
    'Fix a daily routine for wake-up, work, food and sleep, and keep it for 21 days.',
    'Do one useful act of service each month with no credit.',
  ],
  7: [
    'Write your side of one repeating disagreement, then the other person’s side as fairly as you can.',
    'Put agreements in writing, even with people you trust.',
    'Spend one hour a week with your partner or closest friend on something neither of you is trying to fix.',
  ],
  8: [
    'List on one page what you owe and what is owed to you.',
    'Learn one thing about joint finances, insurance or paperwork that you have been avoiding.',
    'Keep a private journal of what you worry about, and read it once a month.',
  ],
  9: [
    'Contact one teacher or mentor you have lost touch with.',
    'Read a few pages a week about a tradition different from your own.',
    'Do one duty to your father or an elder that you have been postponing.',
  ],
  10: [
    'Name the one piece of work you are proudest of and show it to someone this month.',
    'Write what you would do if your job title did not matter.',
    'Keep a weekly log of finished work, not hours.',
  ],
  11: [
    'Reach out to one old contact a week without asking for anything.',
    'Join, or restart, one group that meets regularly.',
    'Write down three goals and review them each month with a friend.',
  ],
  12: [
    'Protect eight hours in bed for two weeks and note what changes.',
    'Spend 15 minutes alone each morning without a screen.',
    'Give time, not money, to one cause this month.',
  ],
};

/** What each major period is traditionally about. */
export const DASHA_LORD_NOTE: Record<string, string> = {
  Sun: 'identity, authority, recognition, relations with fathers and bosses',
  Moon: 'feelings, home, mother, public mood and daily comfort',
  Mars: 'energy, action, property, courage and how conflict is handled',
  Mercury: 'study, trade, communication, skills and short journeys',
  Jupiter: 'growth, learning, teachers, advice and widening of horizons',
  Venus: 'relationships, comfort, art, pleasure and money matters',
  Saturn: 'discipline, slow work, responsibility, structure and what endures',
  Rahu: 'ambition, unusual paths, foreign things, technology and restlessness',
  Ketu: 'detachment, research, finishing things and a turn toward inner life',
};

/** Houses that read each area, in plain words. */
export const HOUSE_THEME: Record<number, string> = {
  1: 'self, body and how you meet the world',
  2: 'income, savings, family and speech',
  3: 'effort, courage, skills and siblings',
  4: 'home, mother and inner peace',
  5: 'learning, creativity, romance and past merit',
  6: 'daily work, routine, service and obligations',
  7: 'partnership, marriage and open dealings with others',
  8: 'shared resources, hidden matters and deep change',
  9: 'belief, teachers, luck, long journeys and father',
  10: 'career, public role and responsibility',
  11: 'gains, friends, networks and long-term goals',
  12: 'rest, time apart, foreign places and letting go',
};

/** Standing statements for the closing "what this report cannot tell you" section. */
export const LIMITS_FIXED = [
  'It cannot tell you what will happen. Jyotish reads tendencies and timing; it does not know your decisions, your health, other people’s choices or luck.',
  'It is not medical, legal or financial advice. Please do not change treatment, sign, borrow or end a relationship because of anything here.',
  'A window marked sensitive is not a warning. It is a stretch in which the themes of two houses are easier to notice, so plan with more care and more patience, not with fear.',
  'The interpretations are traditional readings, not measurements. Two good astrologers can read the same chart differently, and no study has shown that these readings predict life events.',
  'Nothing in this report asks you to buy anything. The practices are free and ordinary, and they would be reasonable advice with or without astrology.',
];
