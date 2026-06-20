/**
 * KundaliSamplePreview — a REAL sample of the deep Kundli output.
 * All values come from the verified sample chart in sampleData.ts (real engine
 * output for one fixed birth) — chart placements, doshas and current period.
 */
import {
  SAMPLE_SEEKER,
  SAMPLE_KUNDLI,
  SAMPLE_DASHA,
  activeDashaIndex,
} from './sampleData';

const CURRENT_MD = SAMPLE_DASHA[activeDashaIndex(SAMPLE_DASHA)] ?? SAMPLE_DASHA[3];

export default function KundaliSamplePreview() {
  const s = SAMPLE_SEEKER;
  return (
    <section aria-labelledby="kundali-sample-heading" className="my-14">
      <div className="text-center mb-6">
        <p className="section-eyebrow mb-2">Sample Kundli · real chart</p>
        <h2 id="kundali-sample-heading" className="font-display text-2xl sm:text-3xl text-star">
          What a deep Kundli looks like
        </h2>
        <p className="font-body text-body-sm text-dust mt-2">
          A real chart computed from a sample birth ({s.birthLabel}). Yours is built from your exact details.
        </p>
      </div>

      <div className="rounded-card border border-horizon/40 bg-cosmos p-6 sm:p-8 space-y-7">
        {/* Headline facts */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          {[
            { k: 'Lagna (rising)', v: `${s.lagna} ${s.lagnaDegree}°` },
            { k: 'Moon sign', v: s.moonSign },
            { k: 'Nakshatra', v: `${s.moonNakshatra} (${s.moonPada})` },
            { k: 'Current period', v: `${CURRENT_MD.lord} Mahadasha` },
          ].map((x) => (
            <div key={x.k} className="rounded-md bg-bg-3 border border-horizon/30 py-3 px-2">
              <div className="font-mono text-mono-sm text-dust uppercase tracking-wider">{x.k}</div>
              <div className="font-display text-base text-amber mt-1">{x.v}</div>
            </div>
          ))}
        </div>

        {/* Planet placements */}
        <div>
          <h3 className="font-mono text-mono-sm text-dust uppercase tracking-wider mb-3">Planetary placements</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {SAMPLE_KUNDLI.placements.map((p) => (
              <div key={p.planet} className="flex items-baseline justify-between gap-1 rounded-md bg-bg-3/60 border border-horizon/20 px-3 py-2">
                <span className="font-body text-body-sm text-star shrink-0">{p.planet}</span>
                <span className="font-mono text-mono-sm text-dust/70 text-right truncate">{p.sign} · H{p.house}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Dosha checks */}
        <div>
          <h3 className="font-mono text-mono-sm text-dust uppercase tracking-wider mb-3">Classical checks</h3>
          <div className="space-y-2">
            {SAMPLE_KUNDLI.doshas.map((d) => (
              <div key={d.name} className="flex items-start gap-3 rounded-md bg-bg-3/60 border border-horizon/20 px-3 py-2.5">
                <span className={`mt-0.5 shrink-0 font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full ${d.good ? 'bg-success/15 text-success' : 'bg-caution/15 text-caution'}`}>
                  {d.status}
                </span>
                <div>
                  <div className="font-body text-body-sm text-star">{d.name}</div>
                  <div className="font-body text-body-sm text-dust/80 leading-snug">{d.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="font-mono text-mono-sm text-dust italic text-center">
          Swiss Ephemeris · Lahiri Ayanamsa · Parashari principles — the full report explains every placement across seven life areas.
        </p>
      </div>
    </section>
  );
}
