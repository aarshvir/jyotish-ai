export type LocalSlotInput = {
  display_label?: string | null;
  start_iso?: string | null;
  end_iso?: string | null;
  time?: string | null;
  end_time?: string | null;
};

export type LocalSlotTimes = {
  display_label?: string;
  time: string;
  end_time: string;
};

const TIME_RE = /([01]?\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?/g;

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function normalizeHHMM(value: string | null | undefined): string {
  const trimmed = value?.trim();
  if (!trimmed) return '';
  const match = /^([01]?\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/.exec(trimmed);
  if (!match) return '';
  return `${pad2(Number(match[1]))}:${match[2]}`;
}

export function parseDisplayLabelTimeRange(
  label: string | null | undefined,
): { start: string; end: string } | null {
  if (!label?.trim()) return null;

  const matches = Array.from(label.matchAll(TIME_RE));
  if (matches.length < 2) return null;

  const start = `${pad2(Number(matches[0][1]))}:${matches[0][2]}`;
  const end = `${pad2(Number(matches[1][1]))}:${matches[1][2]}`;
  return { start, end };
}

export function formatIsoTimeInOffset(
  iso: string | null | undefined,
  offsetMinutes: number | null | undefined,
): string {
  if (!iso?.trim() || !isFiniteNumber(offsetMinutes)) return '';

  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return '';

  const shifted = new Date(ms + offsetMinutes * 60_000);
  return `${pad2(shifted.getUTCHours())}:${pad2(shifted.getUTCMinutes())}`;
}

export function resolveLocalSlotTimes(
  slot: LocalSlotInput,
  offsetMinutes: number | null | undefined,
): LocalSlotTimes {
  const labelTimes = parseDisplayLabelTimeRange(slot.display_label);
  const start =
    labelTimes?.start ||
    normalizeHHMM(slot.time) ||
    formatIsoTimeInOffset(slot.start_iso, offsetMinutes);
  const end =
    labelTimes?.end ||
    normalizeHHMM(slot.end_time) ||
    formatIsoTimeInOffset(slot.end_iso, offsetMinutes);
  const label = slot.display_label?.trim() || (start && end ? `${start}-${end}` : undefined);

  return {
    display_label: label,
    time: start,
    end_time: end,
  };
}

/**
 * Civil YYYY-MM-DD for `instant` in a fixed UTC offset (minutes east of UTC).
 * Matches TodayCard / report-TZ "today" so forecast day-1 is the seeker's local day,
 * not the server/UTC calendar date.
 */
export function civilDateYmd(
  instant: Date,
  offsetMinutes: number | null | undefined,
): string {
  const offset = isFiniteNumber(offsetMinutes) ? offsetMinutes : 0;
  const shifted = new Date(instant.getTime() + offset * 60_000);
  return `${shifted.getUTCFullYear()}-${pad2(shifted.getUTCMonth() + 1)}-${pad2(shifted.getUTCDate())}`;
}

/** Add whole civil days to a YYYY-MM-DD string (calendar arithmetic in UTC noon space). */
export function addCivilDays(ymd: string, days: number): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim());
  if (!m) return ymd;
  const utc = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0) + days * 86_400_000;
  const d = new Date(utc);
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

/** Build a contiguous YYYY-MM-DD range anchored on a civil start date. */
export function civilDateRange(startYmd: string, count: number): string[] {
  const n = Math.max(0, Math.floor(count));
  return Array.from({ length: n }, (_, i) => addCivilDays(startYmd, i));
}
