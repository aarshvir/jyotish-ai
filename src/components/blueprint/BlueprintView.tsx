import type { ReactNode } from 'react';
import type { BlueprintDoc, BlueprintSection, ClaimKind } from '@/lib/blueprint/types';

/**
 * The Karmic Blueprint as a document: NIGHT cover, PAPER reading canvas (docs/DESIGN_SYSTEM.md).
 * Server- and client-safe (no hooks), so /sample-report can render it statically.
 *
 * Each paragraph carries a plain-word label for what kind of claim it is; the colour is only a
 * cue. Tables become stacked cards below 640px so nothing scrolls sideways at phone width.
 * Hidden `source_keys` are deliberately never rendered.
 */

const KIND: Record<ClaimKind, { label: string; hint: string }> = {
  fact: { label: 'Calculated', hint: 'A position or date worked out from your chart' },
  interpretation: { label: 'Traditional reading', hint: 'What Jyotish traditionally reads from it' },
  hypothesis: { label: 'May show up as', hint: 'A possibility for your life, not a prediction' },
  advice: { label: 'Try this', hint: 'A practical step that stands on its own' },
  limit: { label: 'Limit', hint: 'What this cannot tell you' },
};

const KIND_STYLE: Record<ClaimKind, string> = {
  fact: 'bg-parchment-3 text-ink-muted',
  interpretation: 'bg-[#EFE7F5] text-[#4A3566]',
  hypothesis: 'bg-[#FBEFD8] text-[#7A5410]',
  advice: 'bg-[#E3F1E8] text-[#1F6141]',
  limit: 'bg-[#F6E4DD] text-[#8A3A1E]',
};

function Table({ section }: { section: BlueprintSection }) {
  const t = section.table;
  if (!t) return null;
  const named = t.head.some((h) => h.trim() !== '');
  return (
    <div className="my-5">
      {t.caption && <p className="mb-2 font-body text-body-md font-medium text-ink">{t.caption}</p>}
      {/* Wide screens: a real table */}
      <div className="hidden overflow-hidden rounded-[1rem] border border-paper-line bg-white sm:block">
        <table className="w-full border-collapse text-left font-body text-body-md text-ink-muted">
          {named && (
            <thead className="bg-parchment-2 text-ink-soft">
              <tr>
                {t.head.map((h, i) => (
                  <th key={i} scope="col" className="px-3 py-2 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            {t.rows.map((r, i) => (
              <tr key={i} className="border-t border-paper-line align-top">
                {r.map((c, j) => (
                  <td key={j} className={`px-3 py-2 ${j === 0 ? 'font-medium text-ink' : ''}`}>
                    {c}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Phones: one card per row */}
      <ul className="space-y-2 sm:hidden">
        {t.rows.map((r, i) => (
          <li key={i} className="rounded-[1rem] border border-paper-line bg-white p-3">
            <p className="font-body text-body-md font-medium text-ink">{r[0]}</p>
            <dl className="mt-1 space-y-0.5">
              {r.slice(1).map((c, j) => (
                <div key={j} className="flex gap-2 font-body text-body-md text-ink-muted">
                  {named && t.head[j + 1] && <dt className="shrink-0 text-ink-soft">{t.head[j + 1]}:</dt>}
                  <dd className="min-w-0 break-words">{c}</dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Section({ s }: { s: BlueprintSection }) {
  return (
    <section id={s.id} aria-labelledby={`h-${s.id}`} className="scroll-mt-6 border-t border-paper-line pt-8 first:border-t-0 first:pt-0">
      <h2 id={`h-${s.id}`} className="font-display text-headline-lg text-ink">
        {s.title}
      </h2>
      {/* Provenance: which answer put this here. */}
      <p className="mt-2 font-body text-body-md italic leading-relaxed text-ink-soft">
        <span className="font-medium not-italic text-ink-muted">Why this is in your report: </span>
        {s.why}
      </p>
      <Table section={s} />
      <div className="mt-4 space-y-4">
        {s.paragraphs.map((p, i) => (
          <div key={i}>
            <span
              className={`mb-1.5 inline-block rounded-pill px-2.5 py-0.5 font-body text-[0.8125rem] font-medium ${KIND_STYLE[p.kind]}`}
              title={KIND[p.kind].hint}
            >
              {KIND[p.kind].label}
            </span>
            <p className="font-body text-body-lg leading-relaxed text-ink-muted">{p.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function BlueprintView({ doc, actions }: { doc: BlueprintDoc; actions?: ReactNode }) {
  const first = (doc.name || '').trim().split(/\s+/)[0];
  return (
    <div className="min-h-screen bg-space print:bg-white">
      <header
        className="px-4 pb-14 pt-8 sm:px-6 print:bg-white print:pb-6"
        style={{ background: 'radial-gradient(120% 90% at 50% -10%, #2A1C42 0%, #120C1E 55%, #0A0713 100%)' }}
      >
        <div className="mx-auto w-full max-w-2xl">
          <p className="font-body text-body-md text-indigo print:text-ink-soft">Your Karmic Blueprint</p>
          <h1 className="mt-2 font-display text-display-md text-star print:text-ink">
            {first ? `${first}, here is your Rahu–Ketu axis` : 'Your Rahu–Ketu axis'}
          </h1>
          <p className="mt-4 font-body text-body-lg leading-relaxed text-dust-light print:text-ink-muted">
            Calculated from your birth chart, with houses counted from your {doc.reference === 'lagna' ? 'rising sign' : 'Moon sign'},{' '}
            {doc.referenceSign}. Every section says why it is here, and every paragraph says whether it is a calculation, a tradition or a possibility.
          </p>
          {actions && <div className="mt-6 flex flex-wrap gap-3 print:hidden">{actions}</div>}
        </div>
      </header>

      <main id="main-content" className="-mt-6 rounded-[24px] bg-parchment px-4 pb-14 pt-8 sm:px-6 sm:pt-10 print:mt-0 print:rounded-none">
        <div className="mx-auto w-full max-w-2xl space-y-8">
          <section id="brief" aria-labelledby="h-brief" className="rounded-[1.25rem] border border-paper-line bg-white p-5">
            <h2 id="h-brief" className="font-display text-headline-lg text-ink">
              {doc.brief.heading}
            </h2>
            {doc.brief.selections.length > 0 ? (
              <dl className="mt-4 space-y-2">
                {doc.brief.selections.map((s, i) => (
                  <div key={i} className="font-body text-body-lg text-ink-muted">
                    <dt className="inline text-ink-soft">{s.topic}: </dt>
                    <dd className="inline font-medium text-ink">{s.value}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="mt-3 font-body text-body-lg text-ink-muted">You skipped the questions, so this is the standard report.</p>
            )}
            {doc.brief.arrangement.length > 0 && (
              <>
                <h3 className="mt-5 font-body text-body-lg font-medium text-ink">How this report is arranged for you</h3>
                <ul className="mt-2 list-disc space-y-1.5 pl-5 font-body text-body-lg text-ink-muted">
                  {doc.brief.arrangement.map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                </ul>
              </>
            )}
          </section>

          {doc.sections.map((s) => (
            <Section key={s.id} s={s} />
          ))}

          <p className="border-t border-paper-line pt-6 font-body text-body-md leading-relaxed text-ink-soft">
            Written for you on {doc.generatedAt.slice(0, 10)}. Positions are calculated with the Swiss Ephemeris (Lahiri ayanamsa, whole-sign houses). This is a tool for thinking, not a prediction of events, and not medical, legal or financial advice.
          </p>
        </div>
      </main>
    </div>
  );
}
