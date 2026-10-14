import Link from 'next/link';

export function TimingBridge({ anchorLabel = 'Your chart' }: { anchorLabel?: string; href?: string }) {
  return (
    <section aria-labelledby="timing-bridge-heading" className="mt-8 border-t border-horizon py-6 text-left">
      <h2 id="timing-bridge-heading" className="font-display text-headline-sm text-star">{anchorLabel}: interpretation and timing</h2>
      <p className="text-body-sm text-dust mt-3">A calculated position is different from its astrological interpretation. A timing reading is not a guarantee of a career, relationship or financial outcome.</p>
      <div className="mt-4 flex flex-wrap gap-5">
        <Link href="/sample-report" className="text-body-sm text-star underline">View a sample reading</Link>
        <Link href="/help" className="text-body-sm text-star underline">Calculation help</Link>
      </div>
    </section>
  );
}
