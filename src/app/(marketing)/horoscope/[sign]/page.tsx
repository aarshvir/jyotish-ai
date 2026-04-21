import Link from 'next/link';
import type { Metadata } from 'next';
import { StarField } from '@/components/ui/StarField';
import { HOROSCOPE_SIGNS } from '@/lib/seo/horoscopeContent';

export const revalidate = 3600;

interface Props {
  params: { sign: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const s = params.sign?.charAt(0).toUpperCase() + params.sign?.slice(1).toLowerCase();
  return {
    title: `${s} horoscope — daily dates`,
    description: `Browse ${s} daily Vedic-style horoscope stubs for the week ahead.`,
  };
}

export default function HoroscopeSignIndex({ params }: Props) {
  const sign = params.sign?.toLowerCase() ?? '';
  if (!HOROSCOPE_SIGNS.includes(sign as (typeof HOROSCOPE_SIGNS)[number])) {
    return (
      <div className="min-h-screen bg-space text-star p-8">
        <Link href="/" className="text-amber">Home</Link>
      </div>
    );
  }

  const dates: string[] = [];
  const today = new Date();
  for (let i = 0; i < 8; i++) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() + i);
    dates.push(d.toISOString().split('T')[0]);
  }

  return (
    <div className="min-h-screen bg-space text-star relative overflow-hidden">
      <StarField />
      <main className="max-w-lg mx-auto px-5 py-16 relative z-10">
        <h1 className="text-display-sm font-display text-amber mb-6 capitalize">{sign} — pick a date</h1>
        <ul className="space-y-2">
          {dates.map((d) => (
            <li key={d}>
              <Link
                href={`/horoscope/${sign}/${d}`}
                className="text-dust hover:text-amber underline font-mono text-mono-sm"
              >
                {d}
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
