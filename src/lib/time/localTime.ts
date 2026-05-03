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
