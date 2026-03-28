/**
 * Phase 2 — server-side report orchestration (SSE, incremental DB saves) lives here.
 * The browser still runs the full pipeline in `report/[id]/page.tsx`; migrate steps
 * into this module when moving generation server-side.
 */
export { batchedPromiseAll } from '@/lib/async/batchedPromiseAll';
