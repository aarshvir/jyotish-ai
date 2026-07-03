'use client';

/**
 * MobileSectionNav — sticky scroll-spy tab bar for the report on mobile/tablet.
 *
 * The desktop ReportSidebar is hidden below lg, leaving phones (most users) with
 * no way to move between report sections except a very long scroll. This mounts
 * ReportTabs in scroll-nav mode: tapping a tab smooth-scrolls to the section,
 * and an IntersectionObserver keeps the active tab in sync while reading.
 * Sections stay mounted (no TabPanel), so print/PDF and deep links are untouched.
 */

import { useEffect, useRef, useState } from 'react';
import { ReportTabs, type ReportTabDef } from './ReportTabs';

const SECTIONS: (ReportTabDef & { previewHidden?: boolean })[] = [
  { id: 'today', label: 'Today', previewHidden: true },
  { id: 'snapshot', label: 'Summary' },
  { id: 'decide', label: 'Decide', previewHidden: true },
  { id: 'monthly', label: 'Year', previewHidden: true },
  { id: 'weekly', label: 'Weeks', previewHidden: true },
  { id: 'daily', label: 'Days' },
  { id: 'correlations', label: 'Patterns', previewHidden: true },
  { id: 'synthesis', label: 'Calendar', previewHidden: true },
  { id: 'nativity', label: 'Chart' },
];

export function MobileSectionNav({ preview = false }: { preview?: boolean }) {
  const tabs = SECTIONS.filter((s) => !(preview && s.previewHidden));
  const [activeId, setActiveId] = useState(tabs[0]?.id ?? 'snapshot');
  // Suppress observer updates briefly while a tap-initiated smooth scroll runs,
  // so the indicator doesn't flicker across every section it passes.
  const scrollingUntil = useRef(0);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (Date.now() < scrollingUntil.current) return;
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveId(entry.target.id);
        });
      },
      { rootMargin: '-15% 0px -75% 0px', threshold: 0 },
    );
    tabs.forEach((t) => {
      const el = document.getElementById(t.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preview]);

  const onChange = (id: string) => {
    setActiveId(id);
    scrollingUntil.current = Date.now() + 900;
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="pdf-exclude lg:hidden -mx-4 sm:mx-0 mb-6" data-print-hide>
      <ReportTabs tabs={tabs} activeId={activeId} onChange={onChange} />
    </div>
  );
}
