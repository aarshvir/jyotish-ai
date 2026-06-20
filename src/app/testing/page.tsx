'use client';

import { useEffect, useRef, useState } from 'react';

interface GenResult {
  ok: boolean;
  horizonDays: number;
  startDate: string;
  endDate: string;
  natal: { lagnaSign: string; lagnaIndex: number; mahadasha: string; antardasha: string };
  timings: { natalMs: number; gridMs: number; llmSampleMs: number; totalMs: number };
  gridSource: 'batch' | 'per-day-fallback';
  gridErrors: number;
  days: Array<{ date: string; dayScore: number; slotScores: number[] }>;
  llmSample: { date: string; partial: boolean; slots: Array<{ slot_index: number; display_label: string; score: number; is_rahu_kaal: boolean; commentary: string }> } | null;
  projection: { llmBatchesForFullHorizon: number; note: string };
}

const SAMPLE = {
  birth_date: '1995-08-15',
  birth_time: '14:30',
  birth_city: 'Dubai',
  birth_lat: 25.2048,
  birth_lng: 55.2708,
  current_lat: 25.2048,
  current_lng: 55.2708,
  timezone_offset_minutes: 240,
  horizon_days: 30,
};

function scoreColor(score: number, rahu = false): string {
  if (rahu) return '#dc2626';
  if (score >= 65) return '#10b981';
  if (score >= 45) return '#f59e0b';
  return '#ef4444';
}

function fmtMs(ms: number): string {
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`;
}

export default function TestingPage() {
  const [form, setForm] = useState(SAMPLE);
  const [busy, setBusy] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<GenResult | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function run(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null); setResult(null); setElapsed(0);
    const startedAt = Date.now();
    timerRef.current = setInterval(() => setElapsed(Date.now() - startedAt), 100);
    try {
      const res = await fetch('/api/testing/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { setErr(j.error ?? `HTTP ${res.status}`); return; }
      setResult(j as GenResult);
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'Network error');
    } finally {
      if (timerRef.current) clearInterval(timerRef.current);
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-space text-star px-4 py-8 sm:p-12">
      <div className="max-w-5xl mx-auto">
        <header className="mb-8">
          <p className="section-eyebrow mb-2">Internal · admin only · no DB writes</p>
          <h1 className="font-display text-3xl sm:text-display-sm text-amber mb-2">Report-gen speed harness</h1>
          <p className="font-body text-body-sm text-dust max-w-2xl">
            Runs the proposed fast pipeline live: natal chart → the full deterministic score grid in ONE batched
            ephemeris call → a bounded LLM prose sample. Proves the ≤10-minute design with real measured timings.
          </p>
        </header>

        <form onSubmit={run} className="card bg-cosmos border-horizon/40 mb-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="block font-body text-body-sm text-dust">Birth date
            <input type="date" className="cosmic-input mt-1" value={form.birth_date} onChange={(e) => set('birth_date', e.target.value)} required />
          </label>
          <label className="block font-body text-body-sm text-dust">Birth time
            <input type="time" className="cosmic-input mt-1" value={form.birth_time} onChange={(e) => set('birth_time', e.target.value)} />
          </label>
          <label className="block font-body text-body-sm text-dust">Birth city
            <input className="cosmic-input mt-1" value={form.birth_city} onChange={(e) => set('birth_city', e.target.value)} />
          </label>
          <label className="block font-body text-body-sm text-dust">Timezone offset (minutes east of UTC)
            <input type="number" className="cosmic-input mt-1" value={form.timezone_offset_minutes} onChange={(e) => set('timezone_offset_minutes', Number(e.target.value))} />
          </label>
          <label className="block font-body text-body-sm text-dust">Birth lat
            <input type="number" step="any" className="cosmic-input mt-1" value={form.birth_lat} onChange={(e) => set('birth_lat', Number(e.target.value))} />
          </label>
          <label className="block font-body text-body-sm text-dust">Birth lng
            <input type="number" step="any" className="cosmic-input mt-1" value={form.birth_lng} onChange={(e) => set('birth_lng', Number(e.target.value))} />
          </label>
          <label className="block font-body text-body-sm text-dust">Current lat
            <input type="number" step="any" className="cosmic-input mt-1" value={form.current_lat} onChange={(e) => set('current_lat', Number(e.target.value))} />
          </label>
          <label className="block font-body text-body-sm text-dust">Current lng
            <input type="number" step="any" className="cosmic-input mt-1" value={form.current_lng} onChange={(e) => set('current_lng', Number(e.target.value))} />
          </label>
          <label className="block font-body text-body-sm text-dust sm:col-span-2">Horizon
            <select className="cosmic-input mt-1" value={form.horizon_days} onChange={(e) => set('horizon_days', Number(e.target.value))}>
              <option value={7}>1 week (7 days)</option>
              <option value={30}>1 month (30 days)</option>
              <option value={90}>3 months (90 days)</option>
              <option value={365}>1 year (365 days)</option>
              <option value={730}>2 years (730 days)</option>
            </select>
          </label>
          <div className="sm:col-span-2 flex items-center gap-3 pt-1">
            <button type="submit" disabled={busy} className="btn-primary px-6 py-2.5 disabled:opacity-50">
              {busy ? `Running… ${fmtMs(elapsed)}` : 'Generate'}
            </button>
            {busy && <span className="font-mono text-mono-sm text-dust">computing {form.horizon_days} days…</span>}
          </div>
        </form>

        {err && (
          <div className="card border-caution/40 bg-caution/5 mb-8">
            <p className="font-body text-body-sm text-caution">⚠ {err}</p>
          </div>
        )}

        {result && <Results result={result} />}
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-md bg-bg-3 border border-horizon/30 px-4 py-3">
      <div className="font-mono text-mono-sm text-dust/50 uppercase tracking-wider">{label}</div>
      <div className={`font-display text-2xl mt-1 ${accent ? 'text-amber' : 'text-star'}`}>{value}</div>
    </div>
  );
}

function Results({ result }: { result: GenResult }) {
  const { timings, days, natal, llmSample } = result;
  const avgPerDay = days.length ? timings.gridMs / days.length : 0;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Headline timings */}
      <section>
        <h2 className="section-eyebrow mb-3">Measured timings</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat label="Natal chart" value={fmtMs(timings.natalMs)} />
          <Stat label={`Score grid · ${days.length}d`} value={fmtMs(timings.gridMs)} accent />
          <Stat label="LLM sample · 1d" value={fmtMs(timings.llmSampleMs)} />
          <Stat label="Total" value={fmtMs(timings.totalMs)} />
        </div>
        <p className="font-body text-body-sm text-dust mt-3">
          Deterministic grid for <span className="text-star">{days.length} days</span> in{' '}
          <span className="text-amber">{fmtMs(timings.gridMs)}</span> ({avgPerDay.toFixed(1)}ms/day) via{' '}
          <span className={`font-mono text-mono-sm px-2 py-0.5 rounded ${result.gridSource === 'batch' ? 'bg-success/15 text-success' : 'bg-caution/15 text-caution'}`}>
            {result.gridSource === 'batch' ? 'batch endpoint' : 'per-day fallback (deploy Railway for batch)'}
          </span>
          {result.gridErrors > 0 && <span className="text-caution"> · {result.gridErrors} day errors</span>}
        </p>
        <p className="font-body text-body-sm text-dust mt-2">{result.projection.note}</p>
      </section>

      {/* Natal facts */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Lagna" value={natal.lagnaSign} />
        <Stat label="Mahadasha" value={natal.mahadasha} />
        <Stat label="Antardasha" value={natal.antardasha} />
        <Stat label="Window" value={`${result.startDate} → ${result.endDate}`} />
      </section>

      {/* Heatmap — one cell per day, colored by day score */}
      <section>
        <h2 className="section-eyebrow mb-3">Day-score heatmap ({days.length} days)</h2>
        <div className="card bg-cosmos border-horizon/40">
          <div className="flex flex-wrap gap-1">
            {days.map((d) => (
              <div
                key={d.date}
                title={`${d.date} · score ${d.dayScore}`}
                className="h-4 w-4 rounded-sm"
                style={{ backgroundColor: scoreColor(d.dayScore), opacity: 0.35 + Math.min(0.65, d.dayScore / 100) }}
              />
            ))}
          </div>
          <div className="flex items-center gap-4 mt-4 font-mono text-mono-sm text-dust/60">
            <span><span className="inline-block h-3 w-3 rounded-sm align-middle mr-1" style={{ backgroundColor: '#10b981' }} /> ≥65</span>
            <span><span className="inline-block h-3 w-3 rounded-sm align-middle mr-1" style={{ backgroundColor: '#f59e0b' }} /> 45–64</span>
            <span><span className="inline-block h-3 w-3 rounded-sm align-middle mr-1" style={{ backgroundColor: '#ef4444' }} /> &lt;45</span>
          </div>
        </div>
      </section>

      {/* LLM prose sample — first day's slots */}
      {llmSample && (
        <section>
          <h2 className="section-eyebrow mb-3">
            Bounded LLM prose sample — {llmSample.date}
            {llmSample.partial && <span className="ml-2 font-mono text-mono-sm text-caution">(partial / fell back — LLM throttled or no key)</span>}
          </h2>
          <div className="space-y-2">
            {llmSample.slots.filter((s) => s.commentary).slice(0, 6).map((s) => (
              <div key={s.slot_index} className="card bg-cosmos border-horizon/40 py-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-mono-sm" style={{ color: scoreColor(s.score, s.is_rahu_kaal) }}>{s.display_label}</span>
                  <span className="font-mono text-mono-sm text-dust/50">score {s.score}{s.is_rahu_kaal ? ' · Rahu Kaal' : ''}</span>
                </div>
                <p className="font-body text-body-sm text-dust whitespace-pre-line leading-relaxed">{s.commentary}</p>
              </div>
            ))}
            {!llmSample.slots.some((s) => s.commentary) && (
              <p className="font-body text-body-sm text-dust">No prose returned (LLM unavailable). The deterministic grid above is unaffected.</p>
            )}
          </div>
          <p className="font-body text-body-sm text-dust/60 mt-2">
            Showing the first day only. In production the near-window gets full prose; far periods load on demand.
          </p>
        </section>
      )}
    </div>
  );
}
