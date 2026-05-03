export type ScriptureGroundingSummary = {
  hasContext: boolean;
  hasBphs: boolean;
  sourceCount: number;
  sources: string[];
};

const SOURCE_HEADER_RE = /^\[([^\]\n]+)\]/gm;

export function summarizeScriptureGrounding(context: string | null | undefined): ScriptureGroundingSummary {
  const raw = (context ?? '').trim();
  if (!raw) {
    return { hasContext: false, hasBphs: false, sourceCount: 0, sources: [] };
  }

  const sources: string[] = [];
  SOURCE_HEADER_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = SOURCE_HEADER_RE.exec(raw)) !== null) {
    const label = match[1]?.trim();
    if (label) sources.push(label);
  }

  const uniqueSources = Array.from(new Set(sources));
  const haystack = `${raw}\n${uniqueSources.join('\n')}`;
  return {
    hasContext: raw.length > 0,
    hasBphs: /BPHS|Brihat\s+Parashara|Brihat\s+Parasara|Parashara\s+Hora/i.test(haystack),
    sourceCount: uniqueSources.length,
    sources: uniqueSources,
  };
}

export function assertRequiredScriptureGrounding(
  context: string | null | undefined,
  stepName: string,
  opts: { requireBphs?: boolean } = {},
): void {
  const summary = summarizeScriptureGrounding(context);
  if (!summary.hasContext) {
    throw new Error(`${stepName}: missing classical scripture RAG context`);
  }
  if (opts.requireBphs !== false && !summary.hasBphs) {
    throw new Error(`${stepName}: scripture RAG context does not include BPHS/Parashara material`);
  }
}

export function buildScripturePromptBlock(context: string | null | undefined): string {
  const raw = (context ?? '').trim();
  if (!raw) return '';
  return [
    'CLASSICAL SOURCE CHECK:',
    '- Use the retrieved classical references below as grounding evidence.',
    '- Do not contradict the verified planetary data supplied by the pipeline.',
    '- Prefer BPHS/Parashara rules when there is tension between generic astrology and the retrieved corpus.',
    raw,
  ].join('\n');
}
