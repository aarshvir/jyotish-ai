/** Server-side events. Birth data and onboarding questions are a hard error. */

const FORBIDDEN_KEYS = new Set([
  'birth',
  'birth_date',
  'birth_time',
  'birth_place',
  'birth_city',
  'personal_context',
  'native_name',
  'display_name',
  'email',
  'phone',
  'lat',
  'lng',
  'name',
]);

export interface CapiEvent {
  name: 'trial_start' | 'subscribe' | 'page_view';
  event_id: string;
  value?: number;
  currency?: string;
  utm?: Record<string, string>;
}

export function assertAnalyticsSafe(payload: Record<string, unknown>): void {
  for (const key of Object.keys(payload)) {
    if (FORBIDDEN_KEYS.has(key.toLowerCase())) {
      throw new Error(`analytics refused key "${key}" — no personal or birth data in payloads`);
    }
  }
}

export function buildCapiBody(evt: CapiEvent): Record<string, unknown> {
  const body = {
    event_name: evt.name,
    event_id: evt.event_id,
    event_time: Math.floor(Date.now() / 1000),
    action_source: 'website',
    custom_data: {
      currency: evt.currency ?? 'INR',
      value: evt.value ?? 0,
      ...evt.utm,
    },
  };
  assertAnalyticsSafe(body as unknown as Record<string, unknown>);
  assertAnalyticsSafe(body.custom_data as Record<string, unknown>);
  return body;
}
