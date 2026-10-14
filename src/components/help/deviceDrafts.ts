import { ONBOARD_DRAFT_KEY } from '@/lib/onboard/draft';
import { CALCULATOR_STORAGE_KEY } from '@/lib/tools/storage';

const SESSION_DRAFT_KEYS = [ONBOARD_DRAFT_KEY, 'vh_quiz_state_v1'] as const;
const LOCAL_DRAFT_PREFIX = 'vh_q_state_v1:';
type DraftStorage = Pick<Storage, 'length' | 'key' | 'getItem' | 'removeItem'>;

export function clearDeviceDrafts(getSession: () => DraftStorage, getLocal: () => DraftStorage): { cleared: number; failed: boolean } {
  let cleared = 0;
  let failed = false;
  const remove = (storage: DraftStorage, key: string) => {
    try { if (storage.getItem(key) !== null) { storage.removeItem(key); cleared += 1; } } catch { failed = true; }
  };
  try { const storage = getSession(); SESSION_DRAFT_KEYS.forEach(key => remove(storage, key)); } catch { failed = true; }
  try {
    const storage = getLocal();
    remove(storage, CALCULATOR_STORAGE_KEY);
    // Snapshot keys before removal so adjacent drafts cannot be skipped.
    const keys = Array.from({ length: storage.length }, (_, index) => storage.key(index));
    keys.forEach(key => { if (key?.startsWith(LOCAL_DRAFT_PREFIX)) remove(storage, key); });
  } catch { failed = true; }
  return { cleared, failed };
}
