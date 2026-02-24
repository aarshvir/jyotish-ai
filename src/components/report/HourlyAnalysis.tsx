'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HourlyChart } from './HourlyChart';
import { HourlyTable } from './HourlyTable';
import { BestWindows } from './BestWindows';

interface HourData {
  time: string;
  end_time: string;
  score: number;
  hora_planet: string;
  choghadiya: string;
  choghadiya_quality?: string;
  is_rahu_kaal: boolean;
  commentary?: string;
  hora_planet_symbol?: string;
}

interface HourlyAnalysisProps {
  hours: HourData[];
  lagna?: string;
}

export function HourlyAnalysis({ hours, lagna }: HourlyAnalysisProps) {
  const [viewMode, setViewMode] = useState<'visual' | 'table'>('visual');

  return (
    <motion.div
      id="hourly"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      className="space-y-6"
    >
      {/* Header with toggle */}
      <div className="flex items-center justify-between">
        <h2 className="font-display font-semibold text-star text-3xl">
          Hour-by-Hour Intelligence
        </h2>

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
              <HourlyChart hours={hours} />
            </motion.div>
          ) : (
            <motion.div
              key="table"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <HourlyTable hours={hours} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Best windows */}
        <BestWindows hours={hours} lagna={lagna} />
      </div>
    </motion.div>
  );
}
