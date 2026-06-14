import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import Navbar from '@/components/shared/Navbar';
import Footer from '@/components/shared/Footer';
import { StarField } from '@/components/ui/StarField';
import { NewsletterSignup } from '@/components/newsletter/NewsletterSignup';
import { POSTS, getPost } from '@/content/blog';
import { JsonLd } from '@/components/seo/JsonLd';
import { FaqSection } from '@/components/seo/SeoSection';
import { absUrl, faqPageLd, breadcrumbLd } from '@/lib/seo/jsonLd';

export function generateStaticParams() {
  return POSTS.map((p) => ({ slug: p.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const post = getPost(params.slug);
  if (!post) return {};
  return {
    title: `${post.title} | VedicHour`,
    description: post.description,
    keywords: post.keywords,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: { title: post.title, description: post.description, type: 'article' },
  };
}

function fmt(date: string) {
  return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

export default function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = getPost(params.slug);
  if (!post) notFound();

  return (
    <div className="min-h-screen bg-space text-star flex flex-col relative overflow-hidden">
      <StarField />
      <Navbar />
      <main className="flex-1 max-w-3xl mx-auto px-5 sm:px-8 py-16 sm:py-20 relative z-10 w-full">
        <Link href="/blog" className="font-body text-body-sm text-dust hover:text-star transition-colors">← All articles</Link>
        <h1 className="text-display-md font-display text-star mt-3 mb-2">{post.title}</h1>
        <p className="font-mono text-mono-sm text-dust/50 mb-8">{fmt(post.date)} · {post.readingTimeMin} min read</p>

        <article
          className="space-y-4 font-body text-body-md text-dust leading-relaxed [&_h2]:font-display [&_h2]:text-2xl [&_h2]:text-star [&_h2]:mt-10 [&_h2]:mb-3 [&_h3]:font-display [&_h3]:text-xl [&_h3]:text-amber [&_h3]:mt-7 [&_h3]:mb-2 [&_strong]:text-star [&_a]:text-amber [&_a]:underline [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-1 [&_p]:mb-4"
          dangerouslySetInnerHTML={{ __html: post.html }}
        />

        {post.faqs && post.faqs.length > 0 && <FaqSection faqs={post.faqs} heading="Frequently asked" />}

        <div className="mt-14 card border border-amber/30 rounded-card p-6 text-center">
          <p className="font-display text-headline-sm text-star mb-3">Get weekly Vedic timing tips</p>
          <div className="flex justify-center"><NewsletterSignup source={`blog:${post.slug}`} /></div>
        </div>
      </main>

      <JsonLd
        data={[
          {
            '@context': 'https://schema.org',
            '@type': 'BlogPosting',
            headline: post.title,
            description: post.description,
            datePublished: post.date,
            dateModified: post.date,
            author: { '@type': 'Organization', name: 'VedicHour' },
            publisher: { '@type': 'Organization', name: 'VedicHour' },
            mainEntityOfPage: absUrl(`/blog/${post.slug}`),
            keywords: post.keywords.join(', '),
          },
          ...(post.faqs && post.faqs.length ? [faqPageLd(post.faqs)] : []),
          breadcrumbLd([
            { name: 'Home', path: '/' },
            { name: 'Blog', path: '/blog' },
            { name: post.title, path: `/blog/${post.slug}` },
          ]),
        ]}
      />
      <Footer />
    </div>
  );
}
