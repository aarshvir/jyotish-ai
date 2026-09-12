'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { writeOnboardDraft } from '@/lib/onboard/draft';
import { track } from '@/components/analytics/PostHogProvider';

/**
 * Landing for the win-back email's button.
 *
 * Resolves the signed token into the birth details this person already gave us,
 * writes them into the same draft /onboard restores on mount, and forwards to the
 * 7-day plan with NEWUSER30 applied. The onboard form itself is untouched: it
 * already knows how to restore a draft, apply ?plan= and apply ?promo=.
 *
 * An expired or broken link still forwards — they reach checkout either way,
 * just without the pre-fill.
 */

const BASE = '/onboard?plan=7day&promo=NEWUSER30';

interface Prefill {
  name?: string;
  birthDate?: string;
  birthTime?: string;
  birthCity?: string;
  birthLat?: number | null;
  birthLng?: number | null;
  personalContext?: string;
}

export function ResumeRedirect() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    const utm: string[] = [];
    params.forEach((value, key) => {
      if (key.startsWith('utm_')) utm.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
    });
    const onward = utm.length ? `${BASE}&${utm.join('&')}` : BASE;

    const token = params.get('t');
    if (!token) {
      router.replace(onward);
      return;
    }

    let cancelled = false;
    fetch(`/api/onboard/resume?t=${encodeURIComponent(token)}`, { cache: 'no-store' })
      .then((r) => (r.ok ? (r.json() as Promise<Prefill>) : Promise.reject(new Error(String(r.status)))))
      .then((d) => {
        if (cancelled) return;
        writeOnboardDraft({
          name: d.name ?? '',
          birthDate: d.birthDate ?? '',
          birthTime: d.birthTime ?? '',
          birthCity: d.birthCity ?? '',
          birthLat: d.birthLat ?? null,
          birthLng: d.birthLng ?? null,
          reportType: '7day',
          promoCode: 'NEWUSER30',
          personalContext: d.personalContext ?? '',
        });
        track('winback_resumed', { prefilled: true });
        router.replace(onward);
      })
      .catch(() => {
        if (cancelled) return;
        track('winback_resumed', { prefilled: false });
        router.replace(onward);
      });

    return () => {
      cancelled = true;
    };
  }, [params, router]);

  return (
    <main className="min-h-screen bg-space flex items-center justify-center px-6">
      <p className="font-body text-body-md text-dust">Opening your reading…</p>
    </main>
  );
}
