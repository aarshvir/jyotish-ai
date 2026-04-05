/**
 * Sanitizes user-supplied strings before embedding them into LLM prompts.
 * Strips prompt-injection patterns: role headers, XML/system tags, repeated
 * instruction-style phrases, and non-printable control characters.
 */

/** Max length for any user-supplied field embedded in a prompt */
const MAX_FIELD_LENGTH = 200;

/**
 * Strip characters and patterns that can hijack LLM instructions.
 * Keeps alphanumerics, spaces, common punctuation, and Unicode letters.
 */
export function sanitizeForPrompt(input: unknown): string {
  if (typeof input !== 'string') return '';

  return input
    // Truncate first to avoid regex DoS on huge strings
    .slice(0, MAX_FIELD_LENGTH)
    // Remove control characters (0x00–0x1F except tab/newline) and DEL
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Strip XML/HTML-style tags that could be interpreted as system instructions
    .replace(/<[^>]{0,200}>/g, '')
    // Strip common prompt-injection prefixes (case-insensitive)
    .replace(/\b(system|assistant|user|human|instruction|ignore previous|disregard|forget|new task|jailbreak)\b/gi, '')
    // Collapse multiple whitespace to single space
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Sanitize a Vedic lagna/zodiac sign name.
 * Only allows known sign names to prevent injection via this field.
 */
const VALID_SIGNS = new Set([
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
]);

export function sanitizeLagnaSign(input: unknown): string {
  if (typeof input !== 'string') return 'Cancer';
  const trimmed = input.trim();
  // Exact match (case-sensitive canonical)
  if (VALID_SIGNS.has(trimmed)) return trimmed;
  // Case-insensitive match
  const lower = trimmed.toLowerCase();
  for (const sign of Array.from(VALID_SIGNS)) {
    if (sign.toLowerCase() === lower) return sign;
  }
  return 'Cancer'; // Safe fallback
}

/**
 * Sanitize a dasha lord name (planet name).
 * Only allows known planet names.
 */
const VALID_PLANETS = new Set([
  'Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu',
]);

export function sanitizePlanetName(input: unknown): string {
  if (typeof input !== 'string') return 'Sun';
  const trimmed = input.trim();
  if (VALID_PLANETS.has(trimmed)) return trimmed;
  const lower = trimmed.toLowerCase();
  for (const p of Array.from(VALID_PLANETS)) {
    if (p.toLowerCase() === lower) return p;
  }
  return 'Sun'; // Safe fallback
}
