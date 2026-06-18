import Navbar from '@/components/shared/Navbar';
import Footer from '@/components/shared/Footer';
import { StarField } from '@/components/ui/StarField';
import { ChartTool, type ToolView } from '@/components/tools/ChartTool';
import { JsonLd } from '@/components/seo/JsonLd';
import { SeoProse, FaqSection } from '@/components/seo/SeoSection';
import type { Faq } from '@/lib/seo/jsonLd';

export type CalculatorConfig = {
  eyebrow: string;
  /** Lead with the keyword. */
  h1: string;
  h1Accent?: string;
  intro: string;
  view: ToolView;
  ctaHref?: string;
  ctaLabel?: string;
  proseHeading: string;
  proseId: string;
  sections: { h: string; p: string }[];
  faqs: Faq[];
  faqHeading?: string;
  /** Array of JSON-LD objects (SoftwareApplication + FAQPage + HowTo + BreadcrumbList). */
  schema: unknown[];
};

/** Shared scaffold for every free calculator tool page: hero → tool → education → FAQ → schema. */
export function CalculatorPage(cfg: CalculatorConfig) {
  return (
    <div className="min-h-screen bg-space text-star flex flex-col relative overflow-hidden">
      <StarField />
      <Navbar />

      <main id="main-content" className="flex-1 max-w-5xl mx-auto px-5 sm:px-8 py-16 sm:py-24 relative z-10 w-full">
        <div className="text-center mb-10">
          <p className="section-eyebrow mb-3">{cfg.eyebrow}</p>
          <h1 className="text-display-md font-display text-star mb-4">
            {cfg.h1}
            {cfg.h1Accent ? <> <span className="text-amber">{cfg.h1Accent}</span></> : null}
          </h1>
          <p className="text-body-lg text-dust max-w-2xl mx-auto leading-relaxed">{cfg.intro}</p>
        </div>

        <ChartTool view={cfg.view} ctaHref={cfg.ctaHref} ctaLabel={cfg.ctaLabel} />

        <SeoProse heading={cfg.proseHeading} id={cfg.proseId}>
          {cfg.sections.map((s) => (
            <div key={s.h || 'intro'}>
              {s.h ? <h3>{s.h}</h3> : null}
              <p>{s.p}</p>
            </div>
          ))}
        </SeoProse>

        <FaqSection faqs={cfg.faqs} heading={cfg.faqHeading} />
      </main>

      <JsonLd data={cfg.schema} />
      <Footer />
    </div>
  );
}
