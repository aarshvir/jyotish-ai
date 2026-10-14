import Link from 'next/link';
import { ArrowUpRight, BookOpen } from 'lucide-react';
import SampleBirthChart from './SampleBirthChart';
import { SAMPLE_FORECAST } from './sampleForecast';

const chart = SAMPLE_FORECAST.chart;
const moon = chart.placements.find((p) => p.planet === 'Moon')!;

export default function SampleReportPreview() {
  return (
    <section id="sample-chart" className="public-sample public-band" aria-labelledby="sample-heading">
      <div className="public-container">
        <header className="public-section-heading">
          <div>
            <p className="public-kicker">A calculated example</p>
            <h2 id="sample-heading">A birth chart, made readable.</h2>
          </div>
          <p className="public-meta">Sample birth: 15 Jun 1992, 09:00, New Delhi</p>
        </header>
        <div className="public-sample-grid">
          <figure className="public-chart-figure">
            <SampleBirthChart />
            <figcaption className="public-meta mt-3">South Indian chart. Signs stay fixed; houses begin at the rising sign.</figcaption>
          </figure>
          <div className="min-w-0">
            <dl className="public-facts">
              {[
                { label: 'Rising sign (Lagna)', value: `${chart.lagna}, ${chart.lagnaDegree.toFixed(2)} degrees` },
                { label: 'Moon sign (Rashi)', value: moon.sign },
                { label: 'Birth star (Nakshatra)', value: `${chart.moonNakshatra}, pada ${chart.moonPada}` },
                { label: 'Main period in the sample', value: `${chart.currentDasha.mahadasha} Mahadasha` },
              ].map(({ label, value }) => (
                <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
              ))}
            </dl>
            <p className="public-body mt-5">
              These positions come from the existing calculation engine for an invented sample birth.
              They are not a customer testimonial or a prediction of what will happen.
            </p>
            <div className="public-sample-note">
              <BookOpen size={19} aria-hidden="true" className="shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Curious about interpretation?</p>
                <p className="public-body mt-1">The example reading adds written commentary and timing. Those are separate from the free chart facts.</p>
                <Link href="/sample-report" className="public-text-link mt-3">
                  Read the example <ArrowUpRight size={16} aria-hidden="true" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
