'use client';

import { useState } from 'react';
import { FAQS } from '@/lib/faq-data';

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
      aria-hidden
    >
      <path
        d="M6 9l6 6 6-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function FAQ() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <section id="faq" className="py-24 md:py-28 bg-space relative">
      <div className="section-divider absolute top-0 left-0 right-0" />

      <div className="max-w-3xl mx-auto px-6">
        <div className="section-header text-center">
          <p className="section-eyebrow">Questions</p>
          <h2 className="section-title text-display-md">Jyotish &amp; Kundli — Frequently Asked</h2>
          <p className="section-subtitle text-body-lg mx-auto">
            Everything you might want to know about Jyotish, Kundli, and your AI Vedic forecast.
          </p>
        </div>

        <div className="space-y-3 mt-10">
          {FAQS.map((qa, i) => {
            const open = openIdx === i;
            return (
              <div
                key={qa.q}
                className={`card overflow-hidden transition-colors ${open ? 'border-amber/30' : ''}`}
              >
                <button
                  type="button"
                  onClick={() => setOpenIdx(open ? null : i)}
                  aria-expanded={open}
                  aria-controls={`faq-panel-${i}`}
                  className="w-full px-5 sm:px-6 py-4 flex items-center justify-between gap-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber/40 rounded-card"
                >
                  <span className="font-body font-medium text-star text-body-md">
                    {qa.q}
                  </span>
                  <span className="text-amber/70 shrink-0">
                    <ChevronIcon open={open} />
                  </span>
                </button>
                <div
                  id={`faq-panel-${i}`}
                  role="region"
                  className={`grid transition-all duration-250 ease-out ${
                    open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                  }`}
                >
                  <div className="overflow-hidden">
                    <p className="px-5 sm:px-6 pb-5 text-dust text-body-sm leading-relaxed">
                      {qa.a}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-center mt-10 text-dust/60 text-body-sm">
          Something not answered? Email{' '}
          <a
            href="mailto:support@vedichour.com"
            className="text-amber hover:underline"
          >
            support@vedichour.com
          </a>
          .
        </p>
      </div>
    </section>
  );
}
