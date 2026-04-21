'use client';

import Link from 'next/link';

/** Dashboard upsell to the Ashtakoot synastry flow (Pillar 4). */
export function SynastryTeaser() {
  return (
    <div className="card border border-amber/25 bg-amber/5 p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h2 className="font-body font-semibold text-star text-lg mb-1">Partner compatibility</h2>
        <p className="text-dust text-body-sm max-w-xl">
          Run an eight-koota (36-point) Ashtakoot from both Moons — grounded with classical scripture
          retrieval when you compute a chart.
        </p>
      </div>
      <Link href="/synastry" className="btn-primary text-body-sm px-5 py-2.5 whitespace-nowrap shrink-0">
        Open Synastry
      </Link>
    </div>
  );
}
