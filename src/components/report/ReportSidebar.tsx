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
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      {
        rootMargin: '-20% 0px -70% 0px',
        threshold: 0,
      }
    );

    NAV_ITEMS.forEach((item) => {
      const element = document.getElementById(item.id);
      if (element) {
        observer.observe(element);
      }
    });

    return () => observer.disconnect();
  }, [reportLoaded]);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <>
      {/* Desktop sidebar */}
      <nav className="pdf-exclude hidden lg:block fixed left-0 top-[var(--nav-height)] w-48 h-[calc(100vh-var(--nav-height))] overflow-y-auto scrollbar-thin z-40">
        <div className="space-y-1 px-6">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => scrollToSection(item.id)}
              aria-current={activeSection === item.id ? 'location' : undefined}
              className={`w-full text-left py-3 px-4 rounded-sm font-mono text-xs uppercase tracking-wider transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber/60 ${
                activeSection === item.id
                  ? 'text-amber bg-amber/5 border-l-2 border-amber'
                  : 'text-dust hover:text-star hover:bg-nebula/40'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Mobile/Tablet top tabs */}
      <div className="pdf-exclude lg:hidden sticky top-[var(--nav-height)] z-40 bg-space/95 backdrop-blur-sm border-b border-horizon">
        <div className="overflow-x-auto scrollbar-thin">
          <div className="flex gap-2 px-6 py-4 min-w-max">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={() => scrollToSection(item.id)}
                aria-current={activeSection === item.id ? 'location' : undefined}
              className={`px-4 py-2 rounded-sm font-mono text-xs uppercase tracking-wider whitespace-nowrap transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber/60 ${
                  activeSection === item.id
                    ? 'bg-amber text-space'
                    : 'bg-cosmos border border-horizon text-dust hover:border-amber/40 hover:text-star'
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
