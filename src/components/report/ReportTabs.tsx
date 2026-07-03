'use client';

/**
 * ReportTabs — sticky tab navigation shell for the report page.
 *
 * Turns the report's long scroll into tabbed sections. Pure presentation:
 * the parent owns which tab is active (`activeId` + `onChange`) and renders
 * the section content as <TabPanel> children. No data fetching here.
 *
 * A11y: full WAI-ARIA tabs pattern — roving tabindex, Left/Right/Home/End
 * move focus AND selection. The amber underline slides between tabs via a
 * framer-motion layoutId (static under prefers-reduced-motion).
 */

import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

export interface ReportTabDef {
  id: string;
  label: string;
  icon?: string;
}

interface ReportTabsProps {
  tabs: ReportTabDef[];
  activeId: string;
  onChange: (id: string) => void;
  children?: ReactNode;
}

export function ReportTabs({ tabs, activeId, onChange, children }: ReportTabsProps) {
  const reduceMotion = useReducedMotion();
  const listRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const [fades, setFades] = useState({ left: false, right: false });

  // Edge-fade gradients signal that the bar scrolls horizontally on mobile.
  const updateFades = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setFades({ left: el.scrollLeft > 4, right: el.scrollLeft < max - 4 });
  }, []);

  useEffect(() => {
    updateFades();
    window.addEventListener('resize', updateFades);
    return () => window.removeEventListener('resize', updateFades);
  }, [updateFades, tabs.length]);

  // Keep the active tab in view when selection changes (tap, keyboard, or parent).
  useEffect(() => {
    tabRefs.current
      .get(activeId)
      ?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'nearest', inline: 'nearest' });
  }, [activeId, reduceMotion]);

  const selectByIndex = (index: number) => {
    if (tabs.length === 0) return;
    const next = tabs[(index + tabs.length) % tabs.length];
    onChange(next.id);
    tabRefs.current.get(next.id)?.focus();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const current = tabs.findIndex((t) => t.id === activeId);
    if (e.key === 'ArrowRight') { e.preventDefault(); selectByIndex(current + 1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); selectByIndex(current - 1); }
    else if (e.key === 'Home') { e.preventDefault(); selectByIndex(0); }
    else if (e.key === 'End') { e.preventDefault(); selectByIndex(tabs.length - 1); }
  };

  return (
    <div>
      <div className="sticky top-0 z-40 bg-space/90 backdrop-blur-md border-b border-horizon/40">
        <div className="relative">
          <div
            aria-hidden
            className={`pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-space to-transparent transition-opacity duration-250 ${fades.left ? 'opacity-100' : 'opacity-0'}`}
          />
          <div
            aria-hidden
            className={`pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-space to-transparent transition-opacity duration-250 ${fades.right ? 'opacity-100' : 'opacity-0'}`}
          />
          <div
            ref={listRef}
            role="tablist"
            aria-label="Report sections"
            aria-orientation="horizontal"
            onKeyDown={onKeyDown}
            onScroll={updateFades}
            className="flex overflow-x-auto snap-x [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
          >
            {tabs.map((tab) => {
              const active = tab.id === activeId;
              return (
                <button
                  key={tab.id}
                  ref={(el) => {
                    if (el) tabRefs.current.set(tab.id, el);
                    else tabRefs.current.delete(tab.id);
                  }}
                  type="button"
                  role="tab"
                  id={`report-tab-${tab.id}`}
                  aria-selected={active}
                  aria-controls={`report-panel-${tab.id}`}
                  tabIndex={active ? 0 : -1}
                  onClick={() => onChange(tab.id)}
                  className={`relative shrink-0 snap-start inline-flex items-center gap-1.5 px-4 py-3 min-h-[44px] font-body text-body-sm whitespace-nowrap transition-colors duration-250 ${
                    active ? 'text-amber' : 'text-dust hover:text-star'
                  }`}
                >
                  {tab.icon && (
                    <span aria-hidden className="text-sm leading-none">{tab.icon}</span>
                  )}
                  {tab.label}
                  {active &&
                    (reduceMotion ? (
                      <span aria-hidden className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-amber" />
                    ) : (
                      <motion.span
                        aria-hidden
                        layoutId="report-tab-underline"
                        transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                        className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-amber"
                      />
                    ))}
                </button>
              );
            })}
          </div>
        </div>
      </div>
      {children}
    </div>
  );
}

interface TabPanelProps {
  id: string;
  activeId: string;
  children?: ReactNode;
}

/**
 * Lazy tab panel: mounts its children the first time it becomes active, then
 * stays mounted (hidden via the `hidden` attribute) so component state — open
 * accordions, selected day, scroll positions — persists across tab switches.
 */
export function TabPanel({ id, activeId, children }: TabPanelProps) {
  const active = id === activeId;
  const [mounted, setMounted] = useState(active);
  useEffect(() => {
    if (active) setMounted(true);
  }, [active]);
  if (!mounted) return null;
  return (
    <div
      role="tabpanel"
      id={`report-panel-${id}`}
      aria-labelledby={`report-tab-${id}`}
      hidden={!active}
      tabIndex={0}
    >
      {children}
    </div>
  );
}
