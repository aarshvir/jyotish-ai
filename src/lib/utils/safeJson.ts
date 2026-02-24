export function safeParseJson(raw: string): unknown {
  // Strip markdown code fences
  let text = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()

  // Try direct parse first
  try { return JSON.parse(text) } catch {}

  // Find the last complete } or ] by scanning backwards
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
    try { return JSON.parse(text.slice(0, lastCompletePos + 1)) } catch {}
  }

  // Last resort: extract first complete JSON object with regex
  const match = text.match(/\{[\s\S]*\}/)
  if (match) {
    try { return JSON.parse(match[0]) } catch {}
  }

  throw new Error(`Could not parse JSON from response. Raw length: ${raw.length}`)
}
