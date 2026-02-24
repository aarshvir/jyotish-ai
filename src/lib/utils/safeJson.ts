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
