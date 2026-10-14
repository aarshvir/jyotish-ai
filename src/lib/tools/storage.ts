import { z } from 'zod';
import { birthDraftSchema, type BirthDraft } from './birth';
import { chartResultSchema, type ChartResult } from './chart';

export const CALCULATOR_STORAGE_KEY = 'vh_calculator_v1';
export const CALCULATOR_TTL_MS = 7 * 24 * 60 * 60 * 1000;
type StoragePort = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
const savedSchema = z.object({
  version: z.literal(1), savedAt: z.number().finite(),
  draft: birthDraftSchema, result: chartResultSchema.nullable(),
});

export function readCalculator(storage: StoragePort, now = Date.now()): z.infer<typeof savedSchema> | null {
  try {
    const raw = storage.getItem(CALCULATOR_STORAGE_KEY);
    if (!raw) return null;
    const parsed = savedSchema.safeParse(JSON.parse(raw));
    if (!parsed.success || now - parsed.data.savedAt >= CALCULATOR_TTL_MS || parsed.data.savedAt > now) {
      storage.removeItem(CALCULATOR_STORAGE_KEY);
      return null;
    }
    return parsed.data;
  } catch {
    try { storage.removeItem(CALCULATOR_STORAGE_KEY); } catch { /* storage denied */ }
    return null;
  }
}

export function saveCalculator(storage: StoragePort, draft: BirthDraft, result: ChartResult | null, now = Date.now()): boolean {
  try {
    // Parsing strips names, contact details, query text and unrelated form state.
    const data = savedSchema.parse({ version: 1, savedAt: now, draft, result });
    storage.setItem(CALCULATOR_STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch { return false; }
}

export function clearCalculator(storage: StoragePort): boolean {
  try { storage.removeItem(CALCULATOR_STORAGE_KEY); return true; }
  catch { return false; }
}
