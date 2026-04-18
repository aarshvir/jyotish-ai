'use client';

import { useState } from 'react';
import { RasiChartNorthIndian } from '@/components/chart/RasiChartNorthIndian';
import { RasiChartSouthIndian } from '@/components/chart/RasiChartSouthIndian';
import type { ChartPlanet } from '@/components/chart/RasiChartNorthIndian';

// Sample chart data for preview (Cancer lagna)
const SAMPLE_LAGNA = 'Cancer';

const SAMPLE_PLANETS: ChartPlanet[] = [
  { name: 'Sun',     sign: 'Aries',       house: 10, exalted: true },
  { name: 'Moon',    sign: 'Taurus',      house: 11, exalted: true },
  { name: 'Mars',    sign: 'Cancer',      house: 1  },
  { name: 'Mercury', sign: 'Pisces',      house: 9,  debilitated: true },
  { name: 'Jupiter', sign: 'Cancer',      house: 1,  exalted: true },
  { name: 'Venus',   sign: 'Pisces',      house: 9,  exalted: true },
  { name: 'Saturn',  sign: 'Capricorn',   house: 7,  retrograde: true },
  { name: 'Rahu',    sign: 'Scorpio',     house: 5  },
  { name: 'Ketu',    sign: 'Taurus',      house: 11 },
];

const LAGNAS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
];

export function ChartPreviewClient() {
  const [lagna, setLagna] = useState(SAMPLE_LAGNA);
  const [style, setStyle] = useState<'north' | 'south'>('north');

  return (
    <div className="min-h-screen bg-[#080d1a] p-8 text-white">
      <h1 className="text-2xl font-mono text-amber mb-2">Rasi Chart Preview</h1>
      <p className="text-sm text-gray-400 mb-6 font-mono">Dev only — not accessible in production</p>

      {/* Controls */}
      <div className="flex items-center gap-4 mb-8 flex-wrap">
        {/* Style toggle */}
        <div className="flex gap-2">
          {(['north', 'south'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStyle(s)}
              className={`px-4 py-1.5 rounded-full font-mono text-xs uppercase tracking-wider border transition-colors ${
                style === s
                  ? 'bg-amber/20 text-amber border-amber/40'
                  : 'text-gray-400 border-gray-700 hover:border-gray-500'
              }`}
            >
              {s === 'north' ? 'North Indian' : 'South Indian'}
            </button>
          ))}
        </div>

        {/* Lagna selector */}
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-gray-400">Lagna:</span>
          <select
            value={lagna}
            onChange={(e) => setLagna(e.target.value)}
            className="bg-[#0d1530] border border-gray-700 rounded px-2 py-1 font-mono text-xs text-white"
          >
            {LAGNAS.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Chart */}
      <div className="inline-block">
        {style === 'north' ? (
          <RasiChartNorthIndian
            lagna={lagna}
            planets={SAMPLE_PLANETS}
            size={460}
            className="rounded border border-gray-700"
          />
        ) : (
          <RasiChartSouthIndian
            lagna={lagna}
            planets={SAMPLE_PLANETS}
            size={460}
            className="rounded border border-gray-700"
          />
        )}
      </div>

      {/* Legend */}
      <div className="mt-8 font-mono text-xs text-gray-400 space-y-1">
        <p><span className="text-green-400">▲ green</span> = exalted</p>
        <p><span className="text-red-400">▼ red</span> = debilitated</p>
        <p><span className="text-yellow-300">amber halo</span> = combust</p>
        <p><span className="text-violet-400">R superscript</span> = retrograde</p>
      </div>
    </div>
  );
}
