'use client';

import { useEffect, useState } from 'react';

const NAV_ITEMS = [
  { id: 'nativity', label: 'Nativity' },
  { id: 'monthly', label: 'Monthly' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'daily', label: 'Daily' },
  { id: 'hourly', label: 'Hourly' },
];

export function ReportSidebar() {
  const [activeSection, setActiveSection] = useState('nativity');

  useEffect(() => {
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
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <>
      {/* Desktop sidebar */}
      <nav className="hidden lg:block fixed left-0 top-24 w-48 h-[calc(100vh-6rem)] overflow-y-auto scrollbar-thin">
        <div className="space-y-1 px-6">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => scrollToSection(item.id)}
              className={`w-full text-left py-3 px-4 rounded-sm font-mono text-xs uppercase tracking-wider transition-all ${
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
      <div className="lg:hidden sticky top-0 z-40 bg-space/95 backdrop-blur-sm border-b border-horizon">
        <div className="overflow-x-auto scrollbar-thin">
          <div className="flex gap-2 px-6 py-4 min-w-max">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={() => scrollToSection(item.id)}
                className={`px-4 py-2 rounded-sm font-mono text-xs uppercase tracking-wider whitespace-nowrap transition-all ${
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
