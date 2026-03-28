/**
 * Defensive JSON parser that strips markdown code fences, then tries multiple
 * extraction strategies. Returns `null` on failure rather than throwing.
 * Use in API routes where LLM output may be wrapped in prose or fences.
 *
 * Wrapping strategy for arrays: pass `arrayKey` (e.g. 'slots') to get
 * `{ slots: [...] }` back when the LLM returns a bare array.
 */
export function parseJsonDefensively<T = unknown>(
  text: string,
  arrayKey?: string
): T | null {
  const clean = text
    .replace(/^```json\s*/im, '')
    .replace(/^```\s*/im, '')
    .replace(/```\s*$/im, '')
    .trim();

  // 1. Direct parse
  try { return JSON.parse(clean) as T; } catch {}

  // 2. Code-fence block
  const fence = clean.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) {
    try { return JSON.parse(fence[1].trim()) as T; } catch {}
  }

  // 3. Brace extraction
  const s1 = clean.indexOf('{'), e1 = clean.lastIndexOf('}');
  if (s1 >= 0 && e1 > s1) {
    try { return JSON.parse(clean.slice(s1, e1 + 1)) as T; } catch {}
  }

  // 4. Array extraction (wrap in object if arrayKey provided)
  const s2 = clean.indexOf('['), e2 = clean.lastIndexOf(']');
  if (s2 >= 0 && e2 > s2) {
    try {
      const arr = JSON.parse(clean.slice(s2, e2 + 1));
      return (arrayKey ? { [arrayKey]: arr } : arr) as T;
    } catch {}
  }

  return null;
}

export function safeParseJson<T = unknown>(raw: string): T {
  let text = raw
    .replace(/^```json\s*/im, '')
    .replace(/^```\s*/im, '')
    .replace(/```\s*$/im, '')
    .trim()

  // Direct parse
  try { return JSON.parse(text) as T } catch {}

  // Find last complete JSON structure by tracking depth
  let depth = 0
  let inString = false
  let escape = false
  let lastCompletePos = -1

  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (escape) { escape = false; continue }
    if (c === '\\' && inString) { escape = true; continue }
    if (c === '"') { inString = !inString; continue }
    if (inString) continue
    if (c === '{' || c === '[') depth++
    if (c === '}' || c === ']') {
      depth--
      if (depth === 0) lastCompletePos = i
    }
  }

  if (lastCompletePos > 0) {
    try { return JSON.parse(text.slice(0, lastCompletePos + 1)) as T } catch {}
  }

  // Regex fallback
  const match = text.match(/\{[\s\S]*\}/)
  if (match) {
    try { return JSON.parse(match[0]) as T } catch {}
  }

  throw new Error(`JSON parse failed. Response length: ${raw.length} chars`)
}
