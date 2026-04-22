#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';

const path = 'src/app/api/commentary/hourly-batch/route.ts';
let content = readFileSync(path, 'utf8');

// Find and replace the finalizeHourlyCommentary function body
// We identify it by its unique signature and replace the body
const START = 'function finalizeHourlyCommentary(raw: string | undefined, slot: SlotShape): string {';
const END_MARKER = '\nfunction buildFallbackSlot(';

const startIdx = content.indexOf(START);
const endIdx = content.indexOf(END_MARKER);

if (startIdx === -1 || endIdx === -1) {
  console.error('Could not find function markers. startIdx:', startIdx, 'endIdx:', endIdx);
  process.exit(1);
}

const newFn = `function finalizeHourlyCommentary(raw: string | undefined, slot: SlotShape): string {
  const directive = deriveDirective(slot);
  let body = (raw ?? '').trim();
  // Only fall back to minimal text if LLM returned nothing meaningful
  if (body.length < 25) {
    const hora = String(slot?.dominant_hora ?? 'Sun');
    const chog = String(slot?.dominant_choghadiya ?? 'Shubh');
    const th = typeof slot?.transit_lagna_house === 'number' ? slot.transit_lagna_house : 1;
    body = \`\${hora} hora activates H\${th} matters for this lagna. \${chog} choghadiya sets the temporal quality.\`;
  }
  return \`\${directive}\\n\\n\${body}\`;
}
`;

const before = content.slice(0, startIdx);
const after = content.slice(endIdx);
const newContent = before + newFn + after;

writeFileSync(path, newContent, 'utf8');
console.log('Done. finalizeHourlyCommentary updated, file length:', newContent.length);
