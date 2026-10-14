import type { UserChartsResponse } from '@/app/api/user/charts/route';

export function mergeSavedCharts(previous: UserChartsResponse | null, response: UserChartsResponse): UserChartsResponse {
  return {
    kundali: response.unavailable.kundali ? previous?.kundali ?? [] : response.kundali,
    synastry: response.unavailable.synastry ? previous?.synastry ?? [] : response.synastry,
    unavailable: response.unavailable,
  };
}
