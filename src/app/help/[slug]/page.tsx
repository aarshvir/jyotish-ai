import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { findHelpArticle, helpArticles } from '@/components/help/articles';
import { ChartWalkthrough } from '@/components/help/ChartWalkthrough';

export function generateStaticParams() { return helpArticles.map(({ slug }) => ({ slug })); }

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const article = findHelpArticle(params.slug);
  return article ? { title: article.title, description: article.summary, alternates: { canonical: `/help/${article.slug}` } } : { title: 'Help article not found', robots: { index: false } };
}

export default function HelpArticlePage({ params }: { params: { slug: string } }) {
  const article = findHelpArticle(params.slug);
  if (!article) notFound();
  return <article>
    <Link href="/help" className="mb-6 inline-flex min-h-11 items-center gap-2 text-sm text-amber"><ArrowLeft aria-hidden="true" className="h-4 w-4" />All help</Link>
    <p className="mb-2 text-sm text-dust">{article.category}</p>
    <h1 className="text-3xl font-semibold leading-tight text-star">{article.title}</h1>
    <p className="mt-3 text-base leading-relaxed text-dust">{article.summary}</p>
    {article.slug === 'free-birth-chart' && <ChartWalkthrough />}
    <div className="mt-8 space-y-8">{article.sections.map(section => <section key={section.heading}>
      <h2 className="mb-3 text-xl font-semibold text-star">{section.heading}</h2>
      {section.paragraphs.map(paragraph => <p key={paragraph} className="mb-3 text-base leading-relaxed text-dust">{paragraph}</p>)}
      {section.steps && <ol className="mt-4 list-decimal space-y-3 pl-6 text-base leading-relaxed text-star">{section.steps.map(step => <li key={step}>{step}</li>)}</ol>}
    </section>)}</div>
    <Link href={article.action.href} className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-lg bg-amber px-5 py-3 text-sm font-semibold text-space focus-visible:ring-2 focus-visible:ring-star">{article.action.label}<ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0" /></Link>
    <section className="mt-10 border-t border-horizon pt-6"><h2 className="mb-3 text-lg font-semibold">Related tasks</h2><ul className="space-y-1">{article.related.map(slug => { const related = findHelpArticle(slug); return related ? <li key={slug}><Link href={`/help/${slug}`} className="inline-block py-2 text-sm text-amber underline underline-offset-4">{related.title}</Link></li> : null; })}</ul></section>
  </article>;
}
