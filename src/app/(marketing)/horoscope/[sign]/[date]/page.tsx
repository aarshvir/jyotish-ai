import Link from 'next/link';
import type { Metadata } from 'next';
import { StarField } from '@/components/ui/StarField';
import {
  buildHoroscopeCopy,
  isValidHoroscopeSign,
  HOROSCOPE_SIGNS,
} from '@/lib/seo/horoscopeContent';

export const revalidate = 3600;

interface Props {
  params: { sign: string; date: string };
}

export async function generateStaticParams() {
  const dates: string[] = [];
  const today = new Date();
  for (let i = 0; i < 8; i++) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() + i);
    dates.push(d.toISOString().split('T')[0]);
  }
  const params: { sign: string; date: string }[] = [];
  for (const sign of HOROSCOPE_SIGNS) {
    for (const date of dates) {
      params.push({ sign, date });
    }
  }
  return params;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const sign = params.sign?.toLowerCase() ?? '';
  const date = params.date ?? '';
  if (!isValidHoroscopeSign(sign)) {
    return { title: 'Horoscope' };
  }
  const { title, metaDescription } = buildHoroscopeCopy(sign, date);
  return {
    title,
    description: metaDescription,
    openGraph: { title, description: metaDescription },
  };
}

export default function HoroscopeDayPage({ params }: Props) {
  const sign = params.sign?.toLowerCase() ?? '';
  const date = params.date ?? '';
  if (!isValidHoroscopeSign(sign) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return (
      <div className="min-h-screen bg-space text-star p-8">
        <p>Invalid horoscope URL.</p>
        <Link href="/" className="text-amber underline">Home</Link>
      </div>
    );
  }

  const { title, body } = buildHoroscopeCopy(sign, date);

  return (
    <div className="min-h-screen bg-space text-star relative overflow-hidden">
      <StarField />
      <main className="max-w-2xl mx-auto px-5 py-16 relative z-10">
        <p className="text-mono-sm text-dust mb-2">VedicHour · Programmatic daily</p>
        <h1 className="text-display-sm font-display text-amber mb-6">{title}</h1>
        <div className="space-y-4 text-dust leading-relaxed">
          {body.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
        <div className="mt-10 flex flex-wrap gap-4">
          <Link href="/onboard" className="btn-primary inline-flex px-6 py-3">
            Full personalised forecast
          </Link>
          <Link href={`/horoscope/${sign}`} className="btn-secondary inline-flex px-6 py-3">
            More dates
          </Link>
        </div>
      </main>
    </div>
  );
}
