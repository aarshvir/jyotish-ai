'use client';

import { useEffect, useState } from 'react';

const NAV_ITEMS = [
  { id: 'nativity', label: 'Nativity' },
  { id: 'monthly', label: 'Monthly' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'daily', label: 'Daily' },
  { id: 'hourly', label: 'Hourly' },
  { id: 'synthesis', label: 'Synthesis' },
];

export function ReportSidebar({ reportLoaded = false }: { reportLoaded?: boolean }) {
  const [activeSection, setActiveSection] = useState('nativity');

  useEffect(() => {
    if (!reportLoaded) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveSection(entry.target.id);
        });
      },
      { rootMargin: '-20% 0px -70% 0px', threshold: 0 }
    );

    NAV_ITEMS.forEach((item) => {
      const element = document.getElementById(item.id);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, [reportLoaded]);

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <>
      {/* Desktop sidebar */}
      <nav
        className="pdf-exclude hidden lg:block fixed left-0 top-[var(--nav-height)] w-48 h-[calc(100vh-var(--nav-height))] overflow-y-auto scrollbar-thin z-40"
        aria-label="Report sections"
      >
        <div className="space-y-0.5 px-4 pt-6">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => scrollToSection(item.id)}
              aria-current={activeSection === item.id ? 'location' : undefined}
              className={`w-full text-left py-2.5 px-3.5 rounded-button font-mono text-label-sm uppercase tracking-wider transition-all min-h-[40px] ${
                activeSection === item.id
                  ? 'text-amber bg-amber/[0.06] border-l-2 border-amber'
                  : 'text-dust hover:text-star hover:bg-nebula/30'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Mobile/Tablet tabs */}
      <div className="pdf-exclude lg:hidden sticky top-[var(--nav-height)] z-40 bg-space/95 backdrop-blur-sm border-b border-horizon/40">
        <div className="overflow-x-auto scrollbar-thin" role="tablist" aria-label="Report sections">
          <div className="flex gap-1.5 px-5 py-3 min-w-max">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={() => scrollToSection(item.id)}
                role="tab"
                aria-selected={activeSection === item.id}
                className={`px-3.5 py-2 rounded-button font-mono text-label-sm uppercase tracking-wider whitespace-nowrap transition-all min-h-[36px] ${
                  activeSection === item.id
                    ? 'bg-amber text-space'
                    : 'bg-cosmos border border-horizon text-dust hover:border-amber/30 hover:text-star'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
