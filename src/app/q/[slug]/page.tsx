import type { Metadata } from 'next';
import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { DEFAULT_SLUG, getQuizSlug } from '@/config/quiz_slugs';
import { Funnel } from './_Funnel';

/**
 * Ad landing funnel: /q/{slug}. Each slug is the question its paired short-video ad asks
 * (src/config/quiz_slugs.ts). Not indexed — these pages exist for ad traffic, and the
 * same question under six URLs would only compete with the real SEO pages.
 */

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const s = getQuizSlug(params.slug);
  return {
    title: s ? s.s01.en : 'Your Karmic Blueprint',
    description: 'A two-minute quiz, then your Rahu–Ketu axis worked out from your real birth chart.',
    robots: { index: false, follow: false },
    alternates: { canonical: `/q/${params.slug}` },
  };
}

export default function QuizFunnelPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: Record<string, string | string[] | undefined>;
}) {
  // A mistyped ad URL should still land on a quiz (keeping its UTM tags), not a 404.
  if (!getQuizSlug(params.slug)) {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(searchParams)) if (typeof v === 'string') qs.set(k, v);
    const q = qs.toString();
    redirect(`/q/${DEFAULT_SLUG}${q ? `?${q}` : ''}`);
  }
  return (
    <Suspense fallback={<main className="min-h-screen bg-space" />}>
      <Funnel slugKey={params.slug} />
    </Suspense>
  );
}
