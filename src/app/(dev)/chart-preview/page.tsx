'use client';

import { useState } from 'react';
import { RasiChartNorthIndian } from '@/components/chart/RasiChartNorthIndian';
import { RasiChartSouthIndian } from '@/components/chart/RasiChartSouthIndian';
import { StarField } from '@/components/ui/StarField';

const MOCK_PLANETS = [
  { name: 'Sun', sign: 'Aries', house: 1 },
  { name: 'Moon', sign: 'Taurus', house: 2 },
  { name: 'Mars', sign: 'Capricorn', house: 10, exalted: true },
  { name: 'Jupiter', sign: 'Cancer', house: 4, exalted: true },
  { name: 'Venus', sign: 'Pisces', house: 12, exalted: true },
  { name: 'Saturn', sign: 'Libra', house: 7, exalted: true },
  { name: 'Mercury', sign: 'Virgo', house: 6, ownSign: true },
];

export default function ChartPreviewPage() {
  const [lagna, setLagna] = useState('Aries');

  return (
    <div className="min-h-screen bg-space text-star p-12">
      <StarField />
      
      <div className="max-w-6xl mx-auto relative z-10">
        <header className="mb-12">
          <h1 className="text-display-sm font-display text-amber mb-2">Cosmic Forge: Chart Preview</h1>
          <p className="text-dust">Visual regression testing for Rasi charts (North vs South Indian styles).</p>
        </header>

        <div className="flex gap-4 mb-12">
          {['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'].map(s => (
            <button
              key={s}
              onClick={() => setLagna(s)}
              className={`px-3 py-1 rounded-sm font-mono text-xs ${lagna === s ? 'bg-amber text-space' : 'bg-horizon/20 text-dust'}`}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-12">
          <div className="card p-8 bg-cosmos border-horizon/40">
            <h2 className="text-xl font-display mb-6 text-center">North Indian (Diamond)</h2>
            <div className="flex justify-center">
              <RasiChartNorthIndian 
                lagna={lagna} 
                planets={MOCK_PLANETS as unknown as Parameters<typeof RasiChartNorthIndian>[0]['planets']} 
                size={400} 
                className="border border-horizon/20"
              />
            </div>
          </div>

          <div className="card p-8 bg-cosmos border-horizon/40">
            <h2 className="text-xl font-display mb-6 text-center">South Indian (Fixed)</h2>
            <div className="flex justify-center">
              <RasiChartSouthIndian 
                lagna={lagna} 
                planets={MOCK_PLANETS as unknown as Parameters<typeof RasiChartSouthIndian>[0]['planets']} 
                size={400}
                className="border border-horizon/20"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
