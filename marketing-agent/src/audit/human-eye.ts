/**
 * THE HUMAN-EYE LENS — the only reviewer in this repo that is NOT a compliance check.
 *
 * WHY IT EXISTS. On 2026-08-16 a reel shipped that passed every gate we own — brand safety,
 * captions, voice plan, capture URL, loudness, jargon, spoken CTA — and the owner's verdict was
 * "this reel is shit... this should look like a real advert that a $1B saas platform will launch".
 * Nine reviewers all checking RULES will confidently pass something boring, because "boring" is
 * not a rule violation. Compliance is a floor, not a standard.
 *
 * So this lens watches the way a bored person scrolling at 11pm watches: it may REJECT a script
 * that breaks no rule at all, and it is not allowed to reward a reel for being safe. Its verdict
 * is weighted heavily in the creative tournament and a "reject" from it is final.
 *
 * It runs PRE-RENDER, on the script + shot list, so it kills a bad concept for $0 — CLAUDE.md §1.
 *
 * This file also carries the two MECHANICAL detectors for the failure the owner named in the same
 * breath — "window shares an image of window while we are talking of time window". The generator
 * turns figures of speech into props. That is catchable in plain text, for free, before spend.
 */

// ---------------------------------------------------------------- literalism

/**
 * Figures of speech that a text-to-video model will happily render as a physical object.
 *
 * These are NOT banned words. Each is banned only as an ECHO: when the copy uses the word
 * figuratively AND a generated shot renders the same word as a thing. "Same Tuesday. Two windows."
 * over a push-in through an apartment window is the exact defect; the copy alone is fine, and a
 * shot of a real window in a reel that never says "window" is merely a choice.
 */
const FIGURATIVE_NOUNS = [
  'window',
  'door',
  'gate',
  'clock',
  'road',
  'path',
  'lane',
  'fork',
  'crossroad',
  'crossroads',
  'bridge',
  'tunnel',
  'key',
  'lock',
  'mirror',
  'wall',
  'storm',
  'compass',
  'map',
  'signal',
  'staircase',
  'ladder',
  'tide',
  'wave',
  'horizon',
  'sunrise',
  'sunset',
  'chapter',
  'page',
  'season',
  'light',
  'green light',
  'red light',
] as const;

/**
 * Cinematography phrases that contain a figurative noun but are describing LIGHT or FRAMING, not
 * a prop. "Soft window light from camera left" is how you light a face; it is not a shot of a
 * window. Without these carve-outs the echo check would reject every presenter shot we write.
 */
const CRAFT_PHRASE_EXCEPTIONS = [
  /\bwindows?[-\s]?(light|lit)\b/gi,
  /\blight\s+(from|through|falling|spilling|source)\b/gi,
  /\b(soft|warm|hard|rim|key|fill|back|natural|golden|available)\s+light\b/gi,
  /\blow[-\s]?key\b/gi,
  /\bkey\s+light\b/gi,
  /\bwall\s+behind\b/gi,
  /\bpage\s+of\s+the\s+report\b/gi,
];

export interface LiteralismHit {
  word: string;
  shotIndex: number; // 1-based
  excerpt: string;
}

/** Strip the craft phrases so "soft window light" cannot look like a shot of a window. */
function scrubCraftPhrases(s: string): string {
  let out = ` ${(s ?? '').toLowerCase()} `;
  for (const re of CRAFT_PHRASE_EXCEPTIONS) out = out.replace(re, ' ');
  return out;
}

const hasWord = (hay: string, w: string): boolean =>
  new RegExp(`\\b${w.replace(/\s+/g, '\\s+')}s?\\b`, 'i').test(hay);

/**
 * THE LITERALISM ECHO CHECK. Returns a hit for every figurative noun that appears in the COPY and
 * is also rendered as a thing in a GENERATED shot's visual prompt.
 *
 * Screencap shots are excluded on purpose: they are real recordings of the live report, so
 * "two windows side by side" there means two hour-slots on the actual product, not a prop.
 */
export function literalismHits(
  copy: string,
  shots: { kind: string; visualPrompt: string }[],
): LiteralismHit[] {
  const said = scrubCraftPhrases(copy);
  const spoken = FIGURATIVE_NOUNS.filter((w) => hasWord(said, w));
  if (!spoken.length) return [];

  const hits: LiteralismHit[] = [];
  shots.forEach((sh, i) => {
    if (sh.kind === 'screencap') return;
    const vis = scrubCraftPhrases(sh.visualPrompt ?? '');
    for (const w of spoken) {
      if (!hasWord(vis, w)) continue;
      const m = new RegExp(`[^.]{0,40}\\b${w.replace(/\s+/g, '\\s+')}s?\\b[^.]{0,40}`, 'i').exec(sh.visualPrompt ?? '');
      hits.push({ word: w, shotIndex: i + 1, excerpt: (m?.[0] ?? sh.visualPrompt ?? '').trim().slice(0, 90) });
    }
  });
  return hits;
}

/**
 * Props that are pure figure-of-speech furniture. Unlike the echo list these are banned outright
 * in a generated shot, because there is no version of a VedicHour ad that legitimately needs an
 * hourglass. They are the visual vocabulary of a stock-footage timing ad, which is precisely the
 * "$9 AI astrology" register the owner is trying to escape.
 */
export const LITERAL_PROP_BAN = [
  'hourglass',
  'sand timer',
  'egg timer',
  'ticking clock',
  'clock hands',
  'clock face',
  'stopwatch',
  'sundial',
  'metronome',
  'traffic light',
  'traffic signal',
  'green light',
  'red light',
  'crossroads',
  'fork in the road',
  'maze',
  'labyrinth',
  'compass',
  'weighing scales',
  'balance scale',
  'chessboard',
  'chess piece',
  'domino',
  'lighthouse',
  'calendar pages',
  'flipping calendar',
  'locked door',
  'key in a lock',
  'open doorway',
  'closing door',
] as const;

export interface PropHit {
  prop: string;
  shotIndex: number;
}

/** Banned metaphor props anywhere in a GENERATED shot's visual prompt. */
export function propBanHits(shots: { kind: string; visualPrompt: string }[]): PropHit[] {
  const hits: PropHit[] = [];
  shots.forEach((sh, i) => {
    if (sh.kind === 'screencap') return;
    const vis = (sh.visualPrompt ?? '').toLowerCase();
    for (const p of LITERAL_PROP_BAN) if (vis.includes(p)) hits.push({ prop: p, shotIndex: i + 1 });
  });
  return hits;
}

/** The instruction block injected into the script prompt so the writer never produces the defect. */
export const LITERALISM_BAN_BLOCK = `NEVER RENDER A METAPHOR AS AN OBJECT — the owner's rejection, verbatim: "window shares an image of window while we are talking of time window."
The video model has no idea a "window" is a stretch of TIME. If your copy uses a figure of speech, the picture must show the ACTUAL SUBJECT of that sentence — the person making the decision, the moment itself, or the real product — and never the figure of speech as a prop.
- copy says "do windows" (two time windows) -> show the two hour-slots ON THE REAL REPORT, or the person deciding. NEVER an apartment window.
- copy says "green light" / "signal" -> show the person about to hit send. NEVER a traffic light.
- copy says "darwaza khul gaya" / "the right door" -> show the person walking into the room. NEVER a door.
- copy says "time nikal raha hai" -> show the person hesitating with the phone. NEVER a ticking clock, an hourglass, or clock hands.
- copy says "do raaste" / "crossroads" -> show the person's face choosing. NEVER a fork in a road.
This is checked MECHANICALLY before any money is spent: if a distinctive noun from your hook or script also appears in a generated shot's visualPrompt, the variant is rejected automatically. Write the visual as the literal true SUBJECT of the moment, not as an illustration of the words.
Also never generate any of these props at all: ${LITERAL_PROP_BAN.slice(0, 14).join(', ')}.`;

// ---------------------------------------------------------------- the cold open

/**
 * COLD OPENS THAT POINT AT NOTHING.
 *
 * The format asks for a line that starts mid-thought, and the writer keeps answering that with a
 * sentence whose subject is a pronoun: "Haan, isi baat pe atka hoon." — stuck on WHICH thing? A
 * viewer arriving cold has no antecedent, so the sentence carries no information at all and the
 * first second is spent parsing instead of watching. Mid-thought is not the same as referentially
 * empty: "Teen hafte se yeh message draft mein pada hai" is also mid-thought and a stranger
 * understands it completely.
 *
 * Every entry below is a phrase from a draft the human-eye lens or the hostile reviewer actually
 * killed, so this list is evidence rather than taste.
 */
const EMPTY_REFERENT_OPENERS = [
  /\b(isi|is|us|usi|yeh|ye|wahi|wo)\s+(baat|cheez|chakkar|soch|sawaal)\b/i,
  /\bsame\s+thing\b/i,
  /\b(yeh|ye|wo)\s+wala\b/i,
] as const;

/**
 * Opening moves the reviewers have already thrown out by name. "POV:" was killed at 0s ("a
 * scroll-past signal before anything plays"); "Shayad" was killed at 0s ("passive and implies
 * nothing worth watching"); the rest are the greeting-and-warm-up openers the format forbids in
 * prose but never checked.
 */
const TIRED_OPENERS = [
  /^\s*pov\b/i,
  /^\s*shayad\b/i,
  /^\s*maybe\b/i,
  /^\s*(kya)\s+(aapko|tumhe|tumhein)\b/i,
  /^\s*(imagine|socho\s+zara)\b/i,
  /^\s*(namaste|hello|hi|guys|dosto)\b/i,
  /^\s*aaj\s+main\b/i,
] as const;

/**
 * The cold open, checked as plain text for $0. Returns the defect as a sentence, or null.
 *
 * This runs on shot 1's dialogue only. It is deliberately a short, evidence-backed list rather
 * than a general "is this line good" heuristic — the lens below is what judges quality; this
 * catches the two failures that have now recurred across four consecutive batches.
 */
export function coldOpenDefect(line: string): string | null {
  const s = (line ?? '').trim();
  if (!s) return 'the cold open has no dialogue — the reel opens on a silent face';
  for (const re of TIRED_OPENERS) {
    const m = re.exec(s);
    if (m) return `the cold open starts with "${m[0].trim()}" — an opener the reviewers have already killed at second 0; open on the sentence the viewer has said in their own head, not on a format signal or a hedge`;
  }
  for (const re of EMPTY_REFERENT_OPENERS) {
    const m = re.exec(s);
    if (m) return `the cold open says "${m[0].trim()}" — it points at something the viewer cannot see. A stranger arriving cold has no antecedent, so the first second is spent parsing. Name the actual thing: not "isi baat pe atka hoon" but "Teen hafte se yeh message draft mein pada hai"`;
  }
  return null;
}

// ---------------------------------------------------------------- the lens

export const HUMAN_EYE_FLOOR = 62;
/** Score used when the lens is unreachable — low enough not to win, high enough not to reject. */
export const HUMAN_EYE_DEGRADED = 55;

export interface HumanEyeShot {
  kind: 'presenter' | 'broll' | 'screencap';
  seconds: number;
  visualPrompt: string;
  line: string;
  /**
   * THE L-CUT. Seconds of THIS presenter's own on-camera voice that keep running over the NEXT
   * shot's picture, so his picture is that much shorter and the screen after it is not silent.
   * A renderer capability since 2026-08-19 (Shot.audioExtendsSec in src/render/types.ts), built
   * because this lens asked for it about twenty-one times. It has to be SHOWN the thing: a lens
   * cannot reward what the timeline never told it happened.
   */
  audioExtendsSec?: number;
}

export interface HumanEyeReel {
  index: number;
  hookText: string;
  spokenScript: string;
  captions: string[];
  shots: HumanEyeShot[];
}

export interface HumanEyeVerdict {
  index: number;
  stopScroll: number;
  looksExpensive: number;
  humanTruth: number;
  notSlop: number;
  overall: number;
  verdict: 'keep' | 'reject';
  diesAt: string;
  oneFix: string;
  degraded: boolean;
}

function timeline(r: HumanEyeReel): string {
  let t = 0;
  return r.shots
    .map((sh, i) => {
      const from = t;
      // An L-cut hands this shot's last seconds to the NEXT shot's picture, so it is on screen for
      // less time than it was filmed for. The timeline must be what a viewer WATCHES.
      const lcut = Number(sh.audioExtendsSec) || 0;
      t += Math.max(0, (sh.seconds || 0) - lcut);
      const what = sh.kind === 'screencap' ? `REAL PRODUCT SCREEN: ${sh.visualPrompt}` : `${sh.kind.toUpperCase()}: ${sh.visualPrompt}`;
      // A wordless product beat is not dead air: src/render/assemble.ts mixes a music bed under
      // the WHOLE reel and refuses to render without one. Describing it as "silent" made the lens
      // score a deliberate cut as a broken file, so it is described as what the viewer gets.
      const carried = Number(r.shots[i - 1]?.audioExtendsSec) || 0;
      const say = sh.line
        ? ` — you HEAR: "${sh.line}"` +
          (lcut
            ? ` — AND HIS VOICE DOES NOT STOP AT THE CUT: the last ${lcut.toFixed(1)}s of this same on-camera line keep playing over the NEXT shot's picture. That is an L-cut — his own take, no voiceover, no second voice.`
            : '')
        : carried
          ? ` — NO NEW VOICE, BUT NOT SILENT: the previous shot's presenter is still finishing his sentence over this picture for the first ${carried.toFixed(1)}s; then the music bed carries the rest and you read the screen yourself`
          : ' — NO WORDS: just the music bed and the screen, you read it yourself';
      return `  ${from.toFixed(1)}s-${t.toFixed(1)}s  ${what}${say}`;
    })
    .join('\n');
}

/**
 * The lens prompt. Deliberately gives the reviewer NO rulebook: no brand-safety list, no caption
 * spec, no voice law. Those are already enforced elsewhere and handing them over is what turns a
 * taste reviewer back into a compliance reviewer.
 */
export function humanEyePrompt(reels: HumanEyeReel[]): string {
  const blocks = reels
    .map(
      (r) => `--- REEL ${r.index} ---
FIRST FRAME, burned-in text: "${r.hookText}"
TIMELINE (what a viewer sees and hears, second by second):
${timeline(r)}
On-screen captions through the reel: ${r.captions.join(' | ') || '(none)'}`,
    )
    .join('\n\n');

  return `You are NOT a compliance reviewer. Do not check rules. Someone else already did that, and that is exactly the problem: the last reel this company shipped passed every safety, caption and voice check we own, and the founder's verdict was "this reel is shit".

You are a 29-year-old in Bengaluru, lying in bed at 11pm, thumb moving, three reels deep into a feed of things that are funnier and prettier than an ad. You have no loyalty to this brand and no patience. You are the only reviewer allowed to reject something for being BORING, and you should use that power.

Watch each reel below and answer honestly, as a viewer, not as a marketer.

HOW THESE PLAY, so you judge what a viewer actually gets: one music bed runs unbroken under the entire reel, and the presenter's lines are performed on camera by the man himself. A beat marked NO WORDS is therefore not a broken file or dead air — it is a cut to the screen with the music still running and nobody explaining it. Judge whether that beat earns its silence, not whether silence is allowed.

SOME REELS WILL DO SOMETHING NEW, and you should know what you are looking at. A beat may say HIS VOICE DOES NOT STOP AT THE CUT, or NO NEW VOICE BUT NOT SILENT. That is an L-cut: the picture cuts to the product screen while the SAME man's SAME on-camera sentence keeps playing over it, so the screen lands inside his thought instead of after it. There is no voiceover, no narrator and no second voice anywhere in these reels — it is his one take, still running, while you are looking at something else. It exists because it is the thing you have asked for more than any other. It is OPTIONAL: a reel that lets the screen land in clean silence is equally legal, and you should say which one this reel needed. Judge whether the sentence carrying over is worth still hearing, and whether the screen underneath it is answering that sentence — not whether the technique is present.

1. THE FIRST SECOND. The first frame is on screen and you have not decided yet. Does anything make you stop? A hook that describes a feeling, states a benefit, or sounds like a company talking is a scroll-past. A specific human sentence you have said yourself is a stop.
2. DO YOU EVEN KNOW WHAT HE IS TALKING ABOUT? You arrive with ZERO context. The reel opens mid-thought on purpose — but mid-thought is not the same as empty. If his first sentence points at something with "this" / "yeh" / "isi baat" and you cannot tell what it is, you spent your one second parsing instead of watching, and you are gone. Judge the first line the way a stranger would: does it stand completely on its own?
3. THE FIRST THREE SECONDS. Is there a moment of genuine interest — something happening, something shown, a real thing on screen — or is it a person warming up before the content starts? Talking-head preamble is the most common way a reel dies. Say the exact second at which you would have flicked away.
4. WHEN THE PRODUCT APPEARS — IS IT THE ANSWER, OR AN INTERRUPTION? This is the failure you have named more than any other and it is the one that matters most. He says something real, and then the reel cuts away to a product demo and a voice explains a feature at you. That is an AD PIVOT: the emotional beat is broken and a commercial has started, and you scroll. The version that works is the opposite — he says the thing, the screen answers it WITHOUT A WORD, and he is still talking two seconds later. Ask specifically: does this screen arrive because the sentence before it needed answering, or because it was time to show the product? If it is the second one, that alone is a reject, however good the writing is.
5. DOES IT LOOK EXPENSIVE? Picture the actual frames. Does this look like an ad a funded company paid for — considered, specific, one idea, a real product on screen — or does it look like generic AI b-roll cut to a voiceover? Stock-feeling atmosphere shots, an illustration of the words rather than the subject, and pretty-but-empty imagery are all CHEAP, however tasteful they read on paper. So is a metronome: face, screen, face, screen, face, in equal beats. You have written "I've already seen this reel" about that pattern before — say it again if it is true.
6. DOES THE HUMAN RING TRUE? The presenter is a real face saying these words. Does the line sound like a person who has actually had this problem, or like a script being performed? Would the expression the shot asks for match what he is saying? Anyone who sounds like an ad read is a scroll-past. Watch in particular for a FEATURE WEARING A HINDI COAT — a sentence with the rhythm of speech but the content of a landing page ("har ghanta samjhaya hai", "birth chart se rate hote hain", "saare 18 personal hours"). Nobody talks like that about their own life.
7. THE SLOP TEST. Be blunt. Does this look like AI slop — the kind of reel a viewer scrolls past while thinking "another one of these"? Would you be faintly embarrassed to be seen watching it?
8. DOES THE END PAY OFF THE BEGINNING? The last thing he says should land on the thing the first thing he said opened. If the closing line is just a place to put the website, the reel stopped being about anything a few seconds before it ended, and you felt it.
9. WOULD YOU FINISH IT? And if it were your own money, would you put it behind this?

SCORE HONESTLY. Most short-form ads deserve 40-60. A score above 80 means you genuinely stopped and watched to the end, and you should give that to almost nothing. A reel that breaks no rule but that you would scroll past is a "reject" — that verdict is the entire reason you exist.

${blocks}

Return STRICT JSON — an array, one object per reel, nothing before or after it, no fences:
[{"index":1,"stopScroll":0,"looksExpensive":0,"humanTruth":0,"notSlop":0,"overall":0,"verdict":"keep|reject","diesAt":"<the exact second you would flick away, and why, max 15 words>","oneFix":"<the single change that would make you stop, max 15 words>"}]`;
}

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(Number(n) || 0)));

/**
 * Pull the verdict array out of whatever the model actually returned.
 *
 * On the first live run the lens answered in 3517 characters and every variant still came back
 * "human eye: UNAVAILABLE", because the reply was not a bare array and the parser accepted nothing
 * else. A taste gate that silently reports itself unavailable is worse than no gate — it looks
 * like a pass. So the shapes a model genuinely emits are all accepted here.
 */
function asVerdictArray(parsed: unknown): Record<string, unknown>[] {
  if (Array.isArray(parsed)) return parsed as Record<string, unknown>[];
  if (parsed && typeof parsed === 'object') {
    const o = parsed as Record<string, unknown>;
    for (const k of ['reels', 'results', 'verdicts', 'reviews', 'items', 'data', 'output']) {
      if (Array.isArray(o[k])) return o[k] as Record<string, unknown>[];
    }
    // A single reel reviewed on its own, returned unwrapped.
    if ('verdict' in o || 'overall' in o) return [o];
    // An object keyed by index: {"1": {...}, "2": {...}}
    const keyed = Object.entries(o).filter(([k, v]) => /^\d+$/.test(k) && v && typeof v === 'object');
    if (keyed.length) return keyed.map(([k, v]) => ({ index: Number(k), ...(v as Record<string, unknown>) }));
  }
  return [];
}

/**
 * `order` is the list of variant indexes that were sent, in order. It is used only when the model
 * answers without usable index fields — then position is the only honest mapping, and it is safe
 * because the reply length must match what we asked about.
 */
export function parseHumanEye(parsed: unknown, order: number[] = []): Map<number, HumanEyeVerdict> {
  const map = new Map<number, HumanEyeVerdict>();
  const rows = asVerdictArray(parsed);
  const positional = order.length === rows.length;
  rows.forEach((r, i) => {
    const index = Number(r?.index ?? r?.variantIndex ?? r?.reel ?? r?.id ?? (positional ? order[i] : NaN));
    if (!Number.isFinite(index)) return;
    const stopScroll = clamp(r?.stopScroll as number);
    const looksExpensive = clamp(r?.looksExpensive as number);
    const humanTruth = clamp(r?.humanTruth as number);
    const notSlop = clamp(r?.notSlop as number);
    // Trust the reviewer's own overall when it gave one; otherwise average the four sub-scores.
    const overall = r?.overall != null ? clamp(r.overall as number) : clamp((stopScroll + looksExpensive + humanTruth + notSlop) / 4);
    map.set(index, {
      index,
      stopScroll,
      looksExpensive,
      humanTruth,
      notSlop,
      overall,
      verdict: String(r?.verdict ?? '').toLowerCase() === 'reject' ? 'reject' : 'keep',
      diesAt: String(r?.diesAt ?? '').slice(0, 120),
      oneFix: String(r?.oneFix ?? '').slice(0, 120),
      degraded: false,
    });
  });
  return map;
}

export function degradedHumanEye(index: number): HumanEyeVerdict {
  return {
    index,
    stopScroll: HUMAN_EYE_DEGRADED,
    looksExpensive: HUMAN_EYE_DEGRADED,
    humanTruth: HUMAN_EYE_DEGRADED,
    notSlop: HUMAN_EYE_DEGRADED,
    overall: HUMAN_EYE_DEGRADED,
    verdict: 'keep',
    diesAt: '',
    oneFix: '',
    degraded: true,
  };
}
