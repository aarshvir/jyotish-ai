'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { saveQuiz } from '@/lib/quiz/persist';
import { firstStepId } from '@/lib/quiz/engine';
import type { Answers } from '@/lib/quiz/questions';
import { track } from '@/components/analytics/PostHogProvider';

/**
 * Landing for the win-back email's button.
 *
 * Resolves the signed token into the birth details this person already gave us and
 * pre-fills the quiz with them, keeping the question they typed last time. Reports now
 * start from the quiz and a subscription (owner, 2026-09-13), so this no longer lands on
 * the old one-time checkout.
 *
 * An expired or broken link still forwards — they reach the quiz either way, just
 * without the pre-fill.
 */

interface Prefill {
  name?: string;
  birthDate?: string;
  birthTime?: string;
  birthCity?: string;
  birthLat?: number | null;
  birthLng?: number | null;
  personalContext?: string;
}

function answersFrom(d: Prefill): Answers {
  const a: Answers = {};
  if (d.name) a.first_name = d.name;
  if (d.birthDate) a.birth_date = d.birthDate;
  // 12:00 is also what the old checkout stored when no time was given, so it is not
  // trusted as a real birth time — the quiz asks again.
  const hhmm = (d.birthTime ?? '').slice(0, 5);
  if (/^\d{2}:\d{2}$/.test(hhmm) && hhmm !== '12:00') {
    a.birth_time_known = 'exact';
    a.birth_time = hhmm;
  }
  if (d.birthCity && d.birthLat != null && d.birthLng != null) {
    a.birth_city = d.birthCity;
    a.birth_city_lat = String(d.birthLat);
    a.birth_city_lng = String(d.birthLng);
  }
  if (d.personalContext) a.prior_question = d.personalContext;
  return a;
}

export function ResumeRedirect() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    const utm: string[] = [];
    params.forEach((value, key) => {
      if (key.startsWith('utm_')) utm.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
    });
    const onward = utm.length ? `/start?${utm.join('&')}` : '/start';

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
        saveQuiz(answersFrom(d), firstStepId());
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
