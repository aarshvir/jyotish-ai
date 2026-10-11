/**
 * Parse a model's JSON reply, tolerating the one slip seen in practice: a missing closing
 * bracket or brace at the very end (Sonnet 5.5 dropped the last "}" on one of the first real
 * runs). Anything cut off inside a string, or otherwise malformed, still fails.
 *
 * Unlike the general-purpose parser in utils/safeJson, this never falls back to "the first
 * array it can find": the Blueprint asks for one object, and an inner array of a damaged
 * reply is not that object.
 */

export function closeBrackets(text: string): string | null {
  const stack: string[] = [];
  let inString = false;
  let escape = false;
  for (const ch of text) {
    if (inString) {
      if (escape) escape = false;
      else if (ch === '\\') escape = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === '{') stack.push('}');
    else if (ch === '[') stack.push(']');
    else if (ch === '}' || ch === ']') {
      if (stack.pop() !== ch) return null;
    }
  }
  if (inString || stack.length === 0 || stack.length > 3) return null;
  return text + stack.reverse().join('');
}

function tryParse<T>(s: string): T | null {
  try {
    return JSON.parse(s) as T;
  } catch {
    return null;
  }
}

export function parseModelJson<T = unknown>(text: string): T | null {
  const clean = text.replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
  const direct = tryParse<T>(clean);
  if (direct !== null) return direct;
  const start = clean.indexOf('{');
  if (start < 0) return null;
  const end = clean.lastIndexOf('}');
  const braces = end > start ? tryParse<T>(clean.slice(start, end + 1)) : null;
  if (braces !== null) return braces;
  const closed = closeBrackets(clean.slice(start));
  return closed ? tryParse<T>(closed) : null;
}
