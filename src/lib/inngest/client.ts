import { Inngest } from 'inngest';

/**
 * Inngest client instance for VedicHour.
 * 
 * Required env vars:
 *   INNGEST_EVENT_KEY   — for sending events (production)
 *   INNGEST_SIGNING_KEY — for verifying webhook signatures (production)
 * 
 * In development, use `npx inngest-cli@latest dev` for a local dashboard.
 */
export const inngest = new Inngest({
  id: 'vedichour',
});
