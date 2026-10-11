/**
 * What each second-level quiz answer means for how a report should be written.
 *
 * `angle` is the practical lens a writer takes for that situation. It is passed to the
 * narrative step as an instruction, and it is also what lets two people with the same chart
 * and different answers receive visibly different advice.
 *
 * Health and family-planning answers are deliberately narrow: the report speaks about
 * routine, energy rhythm and timing windows only, never about a condition, a diagnosis,
 * conception or children (VEDICHOUR_QUIZ_SPEC H5).
 */

export interface Situation {
  /** How the person put it, as a clause: "you are thinking of changing jobs". */
  clause: string;
  /** The practical lens for advice. */
  angle: string;
  /** Plain-language things worth checking in real life, whatever the chart says. */
  checks: string[];
}

export const SITUATIONS: Record<string, Situation> = {
  // career
  switch: {
    clause: 'you are thinking of changing jobs',
    angle: 'Whether and when to move. Separate the weeks that suit conversations and applications from the weeks that suit signing. Never tell them to resign.',
    checks: ['notice period and what you owe your current employer', 'the offer in writing, including the review date', 'who you would report to'],
  },
  promotion: {
    clause: 'you want growth where you are',
    angle: 'Visibility and timing inside the current job: when to ask, show work or raise the question of a review.',
    checks: ['when the next review cycle is', 'what your manager says success looks like', 'one piece of work that others have seen'],
  },
  money: {
    clause: 'money is tight and you want it to improve',
    angle: 'Steady earning and a calm 90-day plan. Favour small, checkable steps over big bets. No investment tips.',
    checks: ['what comes in and goes out each month', 'one extra source of income you could test', 'the smallest debt you could clear first'],
  },
  stuck: {
    clause: 'you feel stuck and cannot see the way',
    angle: 'Small experiments and one conversation at a time. Distinguish what the chart shows as slow from what is simply unfinished.',
    checks: ['one conversation you have been postponing', 'one thing you could try for two weeks', 'what you would do if the next step were easy'],
  },
  // relationships
  someone: {
    clause: 'there is someone specific',
    angle: 'How the reader tends to show up in a close bond, and when conversations are easier. Describe only the reader’s side; there is no chart for the other person.',
    checks: ['one thing you have not yet said plainly', 'what each of you wants in the next year', 'how you both handle disagreement'],
  },
  searching: {
    clause: 'you are looking but have not found the right person',
    angle: 'What the chart says about how the reader meets people and what they look for, with realistic steps rather than a prediction of who or when.',
    checks: ['where you actually meet new people', 'what you will not compromise on', 'what you are open to changing'],
  },
  delay: {
    clause: 'it keeps getting delayed and you do not know why',
    angle: 'Themes of timing and readiness, never blame or a verdict. Speak of patience and preparation, not of a block.',
    checks: ['what has changed each time it got close', 'what your family expects and what you expect', 'one step within your control this month'],
  },
  strain: {
    clause: 'your marriage is under strain',
    angle: 'Communication and rhythm. Gentle, practical, and never a prediction about the marriage continuing or ending. Suggest that serious difficulty deserves a counsellor.',
    checks: ['one subject you both avoid', 'time together with no problem-solving', 'a counsellor, if the strain is heavy'],
  },
  // family
  planning: {
    clause: 'family planning is on your mind',
    angle: 'Readiness and the general rhythm of the next year only. Say nothing about conception, outcomes or children; point to a doctor for anything medical.',
    checks: ['what you both want the next two years to look like', 'practical readiness at home', 'a doctor, for any medical question'],
  },
  timing: {
    clause: 'you are deciding when to start a family',
    angle: 'Readiness and general timing themes only. Say nothing about outcomes or children; encourage an open conversation between partners.',
    checks: ['what each of you needs to feel ready', 'work and home arrangements', 'a doctor, for any medical question'],
  },
  childcare: {
    clause: 'something about your child concerns you',
    angle: 'Home rhythm and the reader’s own patience. Never read the child’s future or health from this chart; suggest the child’s teacher or doctor for real concerns.',
    checks: ['what you have actually noticed, written down', 'one calm conversation with your child', 'the teacher or doctor, for real concerns'],
  },
  family: {
    clause: 'family matters at home need attention',
    angle: 'Home and family rhythm: who to talk to and when conversations land more easily.',
    checks: ['who needs to hear what from you', 'one practical thing to fix at home', 'a fixed weekly call with one relative'],
  },
  // business
  start: {
    clause: 'you are starting something new',
    angle: 'Readiness and sequencing. Which months suit groundwork and which suit launching. No promise of success.',
    checks: ['the smallest version you could test', 'money you could lose without hardship', 'one paying customer or buyer'],
  },
  launch: {
    clause: 'you need to time a launch or a deal',
    angle: 'Which windows suit announcing, negotiating and signing, as separate steps. Always mark that dates are a tie-breaker, not a reason.',
    checks: ['the contract reviewed by someone who reads contracts', 'the date your own team is truly ready', 'a backup date'],
  },
  invest: {
    clause: 'you are deciding on an investment',
    angle: 'How the reader tends to make money decisions and which weeks are better for thinking than acting. Never name an asset or promise a return.',
    checks: ['what you could afford to lose', 'who benefits if you say yes', 'a day to sleep on it'],
  },
  scale: {
    clause: 'you want to grow what you already run',
    angle: 'Where growth fits the chart’s rhythm: hiring, partners, new products, and what to consolidate first.',
    checks: ['the one number that tells you it is working', 'what breaks first if sales doubled', 'who you could delegate to'],
  },
  // health (non-medical)
  energy: {
    clause: 'your energy is low most days',
    angle: 'Daily rhythm and routine only: when the day’s energy tends to dip, and when to put demanding work. Not medical; suggest a doctor for persistent tiredness.',
    checks: ['sleep and wake times for two weeks', 'the part of the day you feel best', 'a doctor, for tiredness that does not lift'],
  },
  ongoing: {
    clause: 'you are managing something ongoing',
    angle: 'Routine and pacing only. Say nothing about the condition, its course or treatment; defer entirely to their doctor.',
    checks: ['keeping to the plan your doctor gave you', 'rest built into the weekly routine', 'someone who can help on harder days'],
  },
  prevent: {
    clause: 'you want to stay ahead of problems',
    angle: 'Habits and routine: what to build while the days are steady. Not medical.',
    checks: ['regular check-ups with your own doctor', 'one habit you can keep for 21 days', 'sleep as a fixed appointment'],
  },
};

export const FRUSTRATION_PHRASE: Record<string, string> = {
  vague: 'too vague to act on',
  fear: 'made you anxious rather than clearer',
  upsell: 'constant pressure to buy gemstones or pujas',
  generic: 'the same answer for everyone',
  cost: 'charged by the minute',
  nothing: 'nothing, it has helped you',
};
