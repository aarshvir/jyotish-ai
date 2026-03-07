'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HourlyChart } from './HourlyChart';
import { HourlyTable } from './HourlyTable';
import { BestWindows } from './BestWindows';

interface HourData {
  slot_index?: number;
  display_label?: string;
  time: string;
  end_time: string;
  score: number;
  hora_planet: string;
  choghadiya: string;
  choghadiya_quality?: string;
  is_rahu_kaal: boolean;
  commentary?: string;
  hora_planet_symbol?: string;
  transit_lagna?: string;
  transit_lagna_house?: number;
}

interface HourlyAnalysisProps {
  hours: HourData[];
  lagna?: string;
}

function toMinutes(t: string): number {
  const [h, m] = (t || '00:00').split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function HourlyAnalysis({ hours, lagna }: HourlyAnalysisProps) {
  const [viewMode, setViewMode] = useState<'visual' | 'table'>('table');
  const [timeFilter, setTimeFilter] = useState<'waking' | 'full'>('waking');

  // Filter hours based on time range
  const filteredHours = (hours ?? []).filter((h) => {
    if (timeFilter === 'full') return true;
    // "Waking hours" = 06:00 to 23:00 (6am to 11pm)
    const mins = toMinutes(h.time);
    return mins >= 360 && mins < 1380; // 6:00 to 23:00
  });

  const displayHours = filteredHours.length > 0 ? filteredHours : (hours ?? []);

  return (
    <motion.div
      id="hourly"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      className="space-y-6"
    >
      {/* Header with toggles */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display font-semibold text-star text-3xl">
          Hour-by-Hour Intelligence
        </h2>

        <div className="flex items-center gap-2">
          {/* Time filter toggle */}
          <div className="flex items-center gap-1 p-1 bg-cosmos border border-horizon rounded-sm">
            <button
              onClick={() => setTimeFilter('waking')}
              className={`px-3 py-1.5 rounded-sm font-mono text-xs uppercase tracking-wider transition-colors ${
                timeFilter === 'waking'
                  ? 'bg-amber/20 text-amber'
                  : 'text-dust hover:text-star'
              }`}
            >
              6am–11pm
            </button>
            <button
              onClick={() => setTimeFilter('full')}
              className={`px-3 py-1.5 rounded-sm font-mono text-xs uppercase tracking-wider transition-colors ${
                timeFilter === 'full'
                  ? 'bg-amber/20 text-amber'
                  : 'text-dust hover:text-star'
              }`}
            >
              Full 24h
            </button>
          </div>

          {/* View mode toggle */}
          <div className="flex items-center gap-1 p-1 bg-cosmos border border-horizon rounded-sm">
            <button
              onClick={() => setViewMode('visual')}
              className={`px-4 py-2 rounded-sm font-mono text-xs uppercase tracking-wider transition-colors ${
                viewMode === 'visual'
                  ? 'bg-amber text-space'
                  : 'text-dust hover:text-star'
              }`}
            >
              ▦ Visual
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-4 py-2 rounded-sm font-mono text-xs uppercase tracking-wider transition-colors ${
                viewMode === 'table'
                  ? 'bg-amber text-space'
                  : 'text-dust hover:text-star'
              }`}
            >
              ≡ Table
            </button>
          </div>
        </div>
      </div>

      {/* Slot count info */}
      <div className="flex items-center gap-3">
        <span className="font-mono text-xs text-dust/50">
          {viewMode === 'table' ? '18 fixed hourly buckets (06:00–24:00)' : `${displayHours.length} hora slots shown`}
          {viewMode !== 'table' && timeFilter === 'waking' && hours?.length > displayHours.length && (
            <span className="text-dust/30 ml-1">
              ({hours.length - displayHours.length} overnight slots hidden)
            </span>
          )}
        </span>
      </div>

      {/* Content */}
      <div className="bg-cosmos border border-horizon rounded-sm p-6">
        <AnimatePresence mode="wait">
          {viewMode === 'visual' ? (
            <motion.div
              key="visual"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <HourlyChart hours={displayHours} />
            </motion.div>
          ) : (
            <motion.div
              key="table"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <HourlyTable hours={hours ?? []} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Best windows */}
        <BestWindows hours={displayHours} lagna={lagna} />
      </div>
    </motion.div>
  );
}
