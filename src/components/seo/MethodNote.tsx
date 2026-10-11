import Link from 'next/link';
import { METHOD_REVIEWED, METHOD_SHORT } from '@/lib/seo/methodology';

function longDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}

/** "How this is calculated" — shown under every calculator so the method is stated where the result is. */
export function MethodNote() {
  return (
    <aside aria-label="How this is calculated" className="mt-10 card border border-amber/20 rounded-card p-5">
      <h2 className="font-display text-xl text-star mb-2">How this is calculated</h2>
      <p className="font-body text-body-md text-dust leading-relaxed">{METHOD_SHORT}</p>
      <p className="font-body text-body-sm text-dust mt-3">
        Method last reviewed {longDate(METHOD_REVIEWED)} ·{' '}
        <Link href="/methodology" className="text-amber underline">
          Read the full methodology
        </Link>
      </p>
    </aside>
  );
}
