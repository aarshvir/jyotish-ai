import type { NatalChartData, NatalChartInput } from '@/lib/agents/types';
import { natalSchema } from '@/lib/tools/chart';
import { requestJson } from '@/lib/tools/requests';

/** Birth calculations never forward an account secret to a request-derived host. */
export async function calculateNatal(input: NatalChartInput, signal?: AbortSignal, timeoutMs = 16_000): Promise<NatalChartData> {
  const base = (process.env.EPHEMERIS_SERVICE_URL || process.env.EPHEMERIS_API_URL || 'http://localhost:8000').trim().replace(/\/+$/, '');
  const { response, data } = await requestJson(`${base}/natal-chart`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, cache: 'no-store', signal,
    body: JSON.stringify({
      birth_date: input.birth_date, birth_time: input.birth_time, birth_city: input.birth_city,
      birth_lat: input.birth_lat, birth_lng: input.birth_lng,
    }),
  }, timeoutMs);
  const verified = natalSchema.safeParse(data);
  if (!response.ok || !verified.success || !verified.data.lagna || !verified.data.planets.Moon) {
    throw new Error('Birth chart calculation is unavailable');
  }
  // Preserve full dasha sub-periods and functional-lord data after checking the core chart.
  return data as NatalChartData;
}
