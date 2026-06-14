/**
 * SynastrySamplePreview — a REAL sample Gun Milan (Ashtakoot) for two real
 * birth charts, scored by the SAME engine the product uses (see sampleData.ts).
 */
import { SAMPLE_SYNASTRY } from './sampleData';

export default function SynastrySamplePreview() {
  const s = SAMPLE_SYNASTRY;
  const pct = Math.round((s.total / s.max) * 100);
  return (
    <section aria-labelledby="synastry-sample-heading" className="my-14">
      <div className="text-center mb-6">
        <p className="section-eyebrow mb-2">Sample match · real Gun Milan</p>
        <h2 id="synastry-sample-heading" className="font-display text-2xl sm:text-3xl text-star">
          What a Kundli match looks like
        </h2>
        <p className="font-body text-body-sm text-dust mt-2">
          A real Ashtakoot score for two sample charts. Yours is computed from both partners&apos; exact birth details.
        </p>
      </div>

      <div className="rounded-card border border-horizon/40 bg-cosmos p-6 sm:p-8">
        {/* Partners + total */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-5 mb-7">
          <div className="text-center sm:text-left">
            <div className="font-display text-lg text-star">{s.partnerA.name}</div>
            <div className="font-mono text-mono-sm text-dust/60">{s.partnerA.detail}</div>
            <div className="font-mono text-mono-sm text-amber/70">{s.partnerA.moon}</div>
          </div>

          <div className="text-center shrink-0">
            <div className="font-display text-4xl text-amber">{s.total}<span className="text-dust/40 text-2xl">/{s.max}</span></div>
            <div className="font-mono text-mono-sm text-success uppercase tracking-wider mt-1">{s.verdict} · {pct}%</div>
          </div>

          <div className="text-center sm:text-right">
            <div className="font-display text-lg text-star">{s.partnerB.name}</div>
            <div className="font-mono text-mono-sm text-dust/60">{s.partnerB.detail}</div>
            <div className="font-mono text-mono-sm text-amber/70">{s.partnerB.moon}</div>
          </div>
        </div>

        {/* 8-koota breakdown */}
        <div className="space-y-2">
          {s.breakdown.map((k) => {
            const full = k.score >= k.max;
            const zero = k.score === 0;
            const bar = zero ? 'bg-caution/70' : full ? 'bg-success' : 'bg-amber';
            return (
              <div key={k.name} className="flex items-center gap-3">
                <div className="font-body text-body-sm text-star w-28 shrink-0">{k.name}</div>
                <div className="flex-1 h-2 bg-bg-3 rounded-full overflow-hidden">
                  <div className={`h-full ${bar} rounded-full`} style={{ width: `${(k.score / k.max) * 100}%` }} />
                </div>
                <div className="font-mono text-mono-sm tabular-nums text-star/80 w-12 text-right shrink-0">{k.score}/{k.max}</div>
                <div className="font-body text-body-sm text-dust/60 w-44 shrink-0 hidden md:block">{k.note}</div>
              </div>
            );
          })}
        </div>

        <p className="font-mono text-mono-sm text-dust/40 italic text-center mt-6">
          All eight kootas scored from real Moon nakshatra &amp; sign positions — your report adds the full interpretation and remedies.
        </p>
      </div>
    </section>
  );
}
