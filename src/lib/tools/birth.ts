import { z } from 'zod';

export const timeAccuracySchema = z.enum(['known', 'approximate', 'unknown']);
export type TimeAccuracy = z.infer<typeof timeAccuracySchema>;

export function todayLocal(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function isRealDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value && value >= '0001-01-01';
}

export function normalizeTime(value: string): string | null {
  return /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(value)
    ? (value.length === 5 ? `${value}:00` : value)
    : null;
}

export const birthDraftSchema = z.object({
  birth_date: z.string().max(10),
  birth_time: z.string().max(8),
  birth_time_accuracy: timeAccuracySchema.optional(),
  birth_city: z.string().max(240),
  birth_lat: z.number().min(-90).max(90).nullable(),
  birth_lng: z.number().min(-180).max(180).nullable(),
});
export type BirthDraft = z.infer<typeof birthDraftSchema>;

const birthSchema = z.object({
  birth_date: z.string().refine(isRealDate),
  birth_time: z.string().max(8).optional().default(''),
  // Existing quiz callers already collect time explicitly; no new required prop.
  birth_time_accuracy: timeAccuracySchema.optional().default('known'),
  birth_city: z.string().trim().min(1).max(240),
  birth_lat: z.number().min(-90).max(90),
  birth_lng: z.number().min(-180).max(180),
}).refine(p => p.birth_lat !== 0 || p.birth_lng !== 0);
export type ValidBirth = z.infer<typeof birthSchema>;

export const UNKNOWN_TIME_MESSAGE = 'A birth time is needed for this calculation. Moon signs, birth stars and periods can change during a day. We do not substitute noon. Check a birth record or read the birth-time help.';

export function validateBirth(input: unknown, today = todayLocal()):
  | { ok: true; person: ValidBirth }
  | { ok: false; code: 'INVALID_BIRTH' | 'UNKNOWN_TIME'; message: string } {
  const parsed = birthSchema.safeParse(input);
  if (!parsed.success || parsed.data.birth_date > today) {
    return { ok: false, code: 'INVALID_BIRTH', message: 'Enter a real birth date that is not in the future and select your birth city.' };
  }
  const person = parsed.data;
  if (person.birth_time_accuracy === 'unknown') {
    return { ok: false, code: 'UNKNOWN_TIME', message: UNKNOWN_TIME_MESSAGE };
  }
  const time = normalizeTime(person.birth_time);
  if (!time) return { ok: false, code: 'INVALID_BIRTH', message: 'Enter your birth time in 24-hour format, or choose unknown time.' };
  return { ok: true, person: { ...person, birth_time: time } };
}

export const cityCandidateSchema = z.object({
  lat: z.union([z.string().trim().min(1), z.number()]).transform(Number).pipe(z.number().min(-90).max(90)),
  lon: z.union([z.string().trim().min(1), z.number()]).transform(Number).pipe(z.number().min(-180).max(180)),
  display_name: z.string().trim().min(1).max(240),
}).refine(p => p.lat !== 0 || p.lon !== 0);
export type CityCandidate = z.infer<typeof cityCandidateSchema>;

export function cityCandidates(input: unknown): CityCandidate[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  return input.slice(0, 20).flatMap(raw => {
    const p = cityCandidateSchema.safeParse(raw);
    if (!p.success) return [];
    const key = `${p.data.lat},${p.data.lon}`;
    if (seen.has(key)) return [];
    seen.add(key);
    return [p.data];
  }).slice(0, 5);
}
