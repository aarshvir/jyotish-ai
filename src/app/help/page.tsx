import type { Metadata } from 'next';
import Link from 'next/link';
import { HelpSearch } from '@/components/help/HelpSearch';

export const metadata: Metadata = {
  title: 'Help with charts and your account',
  description: 'Find help with birth time, city selection, chart terms, existing reports, account access and privacy.',
  alternates: { canonical: '/help' },
};

export default function HelpPage({ searchParams }: { searchParams: { q?: string | string[] } }) {
  const query = typeof searchParams.q === 'string' ? searchParams.q.slice(0, 200) : '';
  return <>
    <h1 className="mb-2 text-3xl font-semibold text-star">Help</h1>
    <p className="mb-8 text-base leading-relaxed text-dust">Find the next step for your chart or existing report.</p>
    <HelpSearch initialQuery={query} />
    <section className="mt-10 border-t border-horizon pt-6"><h2 className="text-lg font-semibold">Still need help?</h2><p className="mt-2 text-sm leading-relaxed text-dust">Tell us which task failed and the error you saw. Never share passwords, reset links or card details.</p><a href="mailto:support@vedichour.com" className="mt-3 inline-block py-2 text-sm text-amber">support@vedichour.com</a><p className="mt-4 text-sm text-dust"><Link href="/free-kundli" className="text-amber underline underline-offset-4">Free birth chart</Link>{' or '}<Link href="/sample-report" className="text-amber underline underline-offset-4">example reading</Link>. No purchase needed.</p></section>
  </>;
}
