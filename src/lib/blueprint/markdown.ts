import type { BlueprintDoc } from './types';

const LABEL: Record<string, string> = {
  fact: 'Calculated',
  interpretation: 'Traditional reading',
  hypothesis: 'May show up as',
  advice: 'Try this',
  limit: 'Limit',
};

/** Plain-text rendering of a Blueprint, for logs, QA and the report's markdown export. */
export function blueprintToMarkdown(doc: BlueprintDoc, opts: { sourceKeys?: boolean } = {}): string {
  const out: string[] = [];
  out.push(`# Karmic Blueprint: ${doc.name}`, '');
  out.push(`## ${doc.brief.heading}`, '');
  for (const s of doc.brief.selections) out.push(`- ${s.topic}: ${s.value}`);
  if (doc.brief.arrangement.length) {
    out.push('', 'How this report is arranged for you:');
    for (const a of doc.brief.arrangement) out.push(`- ${a}`);
  }
  for (const sec of doc.sections) {
    out.push('', `## ${sec.title}${sec.flagged ? '  [FLAGGED]' : ''}`, `_Why this is in your report: ${sec.why}_`, '');
    if (sec.table) {
      if (sec.table.caption) out.push(`**${sec.table.caption}**`, '');
      out.push(`| ${sec.table.head.join(' | ')} |`, `|${sec.table.head.map(() => '---').join('|')}|`);
      for (const r of sec.table.rows) out.push(`| ${r.join(' | ')} |`);
      out.push('');
    }
    for (const p of sec.paragraphs) out.push(`[${LABEL[p.kind]}] ${p.text}${opts.sourceKeys ? `  {${p.source_keys.join(', ')}}` : ''}`, '');
  }
  return out.join('\n');
}
