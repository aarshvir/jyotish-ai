/**
 * What a visitor reads when /api/reports/start fails.
 *
 * Never the raw server error. On 2026-09-12 a failed ephemeris call surfaced an entire HTML page —
 * doctype, class names, script tags — in the red banner at the top of the onboarding form, at the
 * exact moment someone had just finished entering their birth details. The raw text is still logged
 * to the console by the caller; this decides only what a person sees.
 *
 * Short, clean server sentences written for people (e.g. a free-report limit message) pass through.
 * Anything that looks like machinery — markup, JSON, URLs, stack or HTTP fragments — is replaced.
 */

export interface ReportStartErrorBody {
  error?: string;
  code?: string;
}

export const GENERIC_REPORT_START_ERROR =
  'We couldn’t start your chart just now — nothing is lost. Please try again in a moment.';

const MACHINERY = /[<>{}[\]]|https?:\/\/|\bError:|\bHTTP \d{3}\b|\bat [\w.]+ \(|\bundefined\b|\bnull\b|\bECONN|\bfetch failed\b|\btimeout\b/i;

export function reportStartErrorMessage(body: ReportStartErrorBody | null | undefined): string {
  if (body?.code === 'INNGEST_DISPATCH_FAILED') {
    return 'Our report queue is busy right now — please try again in a minute.';
  }
  const raw = (body?.error ?? '').trim();
  if (raw.length === 0 || raw.length > 160 || MACHINERY.test(raw)) return GENERIC_REPORT_START_ERROR;
  return raw;
}
