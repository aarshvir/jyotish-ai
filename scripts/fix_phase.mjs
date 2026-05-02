import * as fs from 'fs';

const file = 'src/lib/reports/orchestrator.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(/\| 'commentary_months'/g, "| 'commentary_months_1'\n  | 'commentary_months_2'\n  | 'commentary_months'");

fs.writeFileSync(file, code);
console.log('Fixed PipelinePhaseName.');
