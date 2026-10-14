import { getSouthIndianSignRegion, SIGN_NUM_TO_NAME, signNameToNum } from '@/components/chart/houseGeometry';
import { SAMPLE_FORECAST } from './sampleForecast';

const chart = SAMPLE_FORECAST.chart;

/** Reuse fixed-sign chart geometry with the existing engine-calculated sample. */
export default function SampleBirthChart() {
  return (
    <svg viewBox="0 0 400 400" role="img" aria-labelledby="sample-chart-title sample-chart-desc" className="public-birth-chart">
      <title id="sample-chart-title">Calculated sample birth chart: Cancer rising</title>
      <desc id="sample-chart-desc">
        {chart.placements.map((p) => `${p.planet} in ${p.sign}, house ${p.house}`).join('. ')}.
      </desc>
      {Array.from({ length: 12 }, (_, i) => i + 1).map((sign) => {
        const { labelAnchor } = getSouthIndianSignRegion(sign);
        const x = labelAnchor.x * 400;
        const y = labelAnchor.y * 400;
        const planets = chart.placements.filter((p) => signNameToNum(p.sign) === sign);
        const rising = signNameToNum(chart.lagna) === sign;
        return (
          <g key={sign}>
            <rect x={x - 50} y={y - 50} width="100" height="100" fill={rising ? 'var(--public-teal)' : 'var(--public-paper)'} stroke="var(--public-line)" />
            <text x={x} y={y - 28} textAnchor="middle" fontSize="12" fill="var(--public-muted)">{SIGN_NUM_TO_NAME[sign]}</text>
            {rising && <text x={x} y={y - 8} textAnchor="middle" fontSize="13" fontWeight="600" fill="var(--public-ink)">Lagna</text>}
            {planets.map((p, i) => (
              <text key={p.planet} x={x} y={y - 5 + i * 17} textAnchor="middle" fontSize="13" fontWeight="500" fill="var(--public-ink)">{p.planet}</text>
            ))}
          </g>
        );
      })}
      <text x="200" y="175" textAnchor="middle" fontSize="15" fill="var(--public-muted)">Sample birth chart</text>
      <text x="200" y="205" textAnchor="middle" fontSize="22" fontWeight="600" fill="var(--public-ink)">{chart.lagna} rising</text>
      <text x="200" y="232" textAnchor="middle" fontSize="13" fill="var(--public-muted)">Lahiri / whole-sign houses</text>
    </svg>
  );
}
