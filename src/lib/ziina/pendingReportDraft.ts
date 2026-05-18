export interface PendingPaymentReportDraft {
  native_name: string;
  birth_date: string;
  birth_time: string;
  birth_city: string;
  birth_lat: number;
  birth_lng: number;
  current_city: string | null;
  current_lat: number | null;
  current_lng: number | null;
  timezone_offset: number;
  forecast_start: string | null;
}

function nonEmptyString(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const trimmed = v.trim();
  return trimmed ? trimmed : null;
}

function finiteNumber(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v !== 'string' || v.trim() === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function normalizeBirthTime(v: unknown): string | null {
  const raw = nonEmptyString(v);
  if (!raw) return null;
  const parts = raw.split(':');
  if (parts.length === 2) return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}:00`;
  if (parts.length >= 3) return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}:${parts[2].padStart(2, '0')}`;
  return raw;
}

export function buildPendingPaymentReportDraft(body: Record<string, unknown>): PendingPaymentReportDraft | null {
  const nativeName = nonEmptyString(body.name);
  const birthDate = nonEmptyString(body.birth_date ?? body.date);
  const birthTime = normalizeBirthTime(body.birth_time ?? body.time);
  const birthCity = nonEmptyString(body.birth_city ?? body.city);
  const birthLat = finiteNumber(body.birth_lat ?? body.lat);
  const birthLng = finiteNumber(body.birth_lng ?? body.lng);

  if (!nativeName || !birthDate || !birthTime || !birthCity || birthLat == null || birthLng == null) {
    return null;
  }

  const currentLat = finiteNumber(body.current_lat ?? body.currentLat);
  const currentLng = finiteNumber(body.current_lng ?? body.currentLng);
  const currentCity = currentLat != null && currentLng != null
    ? nonEmptyString(body.current_city ?? body.currentCity)
    : null;
  const timezoneOffset = finiteNumber(body.timezone_offset ?? body.currentTz) ?? 0;

  return {
    native_name: nativeName,
    birth_date: birthDate,
    birth_time: birthTime,
    birth_city: birthCity,
    birth_lat: birthLat,
    birth_lng: birthLng,
    current_city: currentCity,
    current_lat: currentLat,
    current_lng: currentLng,
    timezone_offset: timezoneOffset,
    forecast_start: nonEmptyString(body.forecast_start ?? body.forecastStart),
  };
}
