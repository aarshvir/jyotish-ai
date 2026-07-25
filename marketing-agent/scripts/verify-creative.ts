// Guards the most fragile surface of the creative engine: parsing JSON out of raw
// LLM output. Every case here is something a CLI has actually been observed to do.
// Run: npx tsx scripts/verify-creative.ts
import { extractJson } from '../src/loops/creative';

type Check = { name: string; input: string; expect: (r: any) => boolean };

const isArr = (r: any) => Array.isArray(r);
const isObj = (r: any) => r !== null && !Array.isArray(r) && typeof r === 'object';
const isNull = (r: any) => r === null;
/** Truncated output must never be handed to a caller as a usable array. */
const notUsableArray = (r: any) => !Array.isArray(r);

const checks: Check[] = [
  { name: 'plain array', input: '[{"a":1}]', expect: isArr },
  { name: 'json fence', input: '```json\n[{"a":1}]\n```', expect: isArr },
  { name: 'bare fence', input: '```\n{"a":1}\n```', expect: isObj },
  { name: 'prose prefix + suffix', input: 'Sure! Here you go:\n\n[{"a":1},{"a":2}]\n\nHope this helps!', expect: (r) => isArr(r) && r.length === 2 },
  { name: 'trailing commas', input: '[{"a":1,},]', expect: isArr },
  { name: 'braces inside a string', input: '[{"hook":"kal 11 baje {meeting} rakhun?"}]', expect: (r) => isArr(r) && r[0].hook.includes('{meeting}') },
  { name: 'escaped quotes', input: '[{"hook":"he said \\"kal\\" to me"}]', expect: isArr },
  { name: 'unparsable object before the real array', input: 'Note: {this is not json}\n[{"a":1}]', expect: isArr },
  { name: 'object when object comes first', input: '{"ranked":["a#1","b#2"],"why":"x"}', expect: (r) => isObj(r) && r.ranked.length === 2 },
  { name: 'nested arrays survive', input: '[{"shotList":[{"kind":"presenter","seconds":4}]}]', expect: (r) => isArr(r) && r[0].shotList[0].kind === 'presenter' },
  { name: 'refusal text', input: 'I cannot help with that.', expect: isNull },
  { name: 'empty', input: '', expect: isNull },
  { name: 'truncated array is not passed off as an array', input: '[{"a":1}', expect: notUsableArray },
  { name: 'truncated object yields nothing', input: '{"ranked":["a"', expect: isNull },
];

let pass = 0;
let fail = 0;
for (const c of checks) {
  const r = extractJson(c.input);
  const ok = c.expect(r);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${c.name}`);
  if (!ok) console.log(`      got: ${JSON.stringify(r)?.slice(0, 100)}`);
  ok ? pass++ : fail++;
}
console.log(`\nextractJson: ${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
