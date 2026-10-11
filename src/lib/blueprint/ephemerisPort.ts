/** The real ephemeris port: the FastAPI engine on Railway, through the existing agent. */

import { EphemerisAgent } from '@/lib/agents/EphemerisAgent';
import type { NatalChartData } from '@/lib/agents/types';
import type { EphemerisPort, GridDay } from './deps';

export function createEphemerisPort(baseUrl?: string): EphemerisPort {
  const agent = new EphemerisAgent(baseUrl);
  return {
    async natalChart(input) {
      const raw = (await agent.getNatalChart({
        birth_date: input.date,
        birth_time: input.time,
        birth_city: input.city,
        birth_lat: input.lat,
        birth_lng: input.lng,
      })) as NatalChartData | { data?: NatalChartData };
      return ('data' in raw && raw.data ? raw.data : raw) as NatalChartData;
    },
    async dailyGrid({ dates, lat, lng, lagnaSignIndex }) {
      const out: GridDay[] = [];
      // The engine caps a batch at 800 dates; a year of weekly samples or 30 days is far below that.
      const res = await agent.getDailyGridBatch({ dates, lat, lng, natalLagnaSignIndex: lagnaSignIndex });
      out.push(...(res.days as GridDay[]));
      if (res.errors?.length) throw new Error(`daily grid failed for ${res.errors.length} of ${dates.length} dates: ${res.errors[0].error}`);
      return out;
    },
  };
}
