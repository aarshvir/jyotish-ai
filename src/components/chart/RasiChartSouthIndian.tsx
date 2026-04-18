'use client';

import { motion } from 'framer-motion';
import {
  signNameToNum,
  signNumToHouseNum,
  houseNumToSignNum,
  getPlanetAnchor,
  SOUTH_SIGN_GRID,
  SIGN_NUM_TO_NAME,
} from './houseGeometry';
import type { ChartPlanet } from './RasiChartNorthIndian';

// Re-export ChartPlanet type for consumers
export type { ChartPlanet };

export interface RasiChartSouthIndianProps {
  lagna: string;
  planets: ChartPlanet[];
  size?: number;
  className?: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const PLANET_GLYPH: Record<string, string> = {
  Sun: '☉', Moon: '☽', Mars: '♂', Mercury: '☿',
  Jupiter: '♃', Venus: '♀', Saturn: '♄', Rahu: '☊', Ketu: '☋',
};

const PLANET_SHORT: Record<string, string> = {
  Sun: 'Su', Moon: 'Mo', Mars: 'Ma', Mercury: 'Me',
  Jupiter: 'Ju', Venus: 'Ve', Saturn: 'Sa', Rahu: 'Ra', Ketu: 'Ke',
};

// ─── Main component ──────────────────────────────────────────────────────────

export function RasiChartSouthIndian({
  lagna,
  planets,
  size = 360,
  className = '',
}: RasiChartSouthIndianProps) {
  const lagnaSignNum = signNameToNum(lagna);

  // Group planets by sign number
  const planetsBySign: Record<number, ChartPlanet[]> = {};
  for (const planet of planets) {
    const signNum =
      planet.house > 0
        ? houseNumToSignNum(planet.house, lagnaSignNum)
        : signNameToNum(planet.sign);
    if (!planetsBySign[signNum]) planetsBySign[signNum] = [];
    planetsBySign[signNum].push(planet);
  }

  const offCanvasX = size * 1.3;
  const cellSize = size / 4;

  // All 12 valid sign positions (excludes interior 4 cells)
  const allSignNums = Object.keys(SOUTH_SIGN_GRID).map(Number);

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={`block ${className}`}
      aria-label={`South Indian Rasi chart, ${lagna} lagna`}
    >
      {/* Background */}
      <rect width={size} height={size} fill="#0a0f1e" rx={4} />

      {/* All 4×4 cell outlines */}
      {Array.from({ length: 4 }, (_, row) =>
        Array.from({ length: 4 }, (_, col) => {
          const isInterior = row >= 1 && row <= 2 && col >= 1 && col <= 2;
          const x = col * cellSize;
          const y = row * cellSize;

          if (isInterior) {
            // Interior cells — just subtle fill, no sign
            if (row === 1 && col === 1) {
              // Top-left interior — show nativity label
              return (
                <g key={`cell-${row}-${col}`}>
                  <rect
                    x={x}
                    y={y}
                    width={cellSize * 2}
                    height={cellSize * 2}
                    fill="rgba(212,168,83,0.03)"
                    stroke="rgba(255,255,255,0.08)"
                    strokeWidth={0.5}
                  />
                  <text
                    x={x + cellSize}
                    y={y + cellSize}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={size * 0.028}
                    fill="rgba(212,168,83,0.25)"
                    fontFamily="ui-monospace, monospace"
                  >
                    {lagna.toUpperCase()}
                  </text>
                  <text
                    x={x + cellSize}
                    y={y + cellSize + size * 0.04}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={size * 0.022}
                    fill="rgba(255,255,255,0.15)"
                    fontFamily="ui-monospace, monospace"
                  >
                    LAGNA
                  </text>
                </g>
              );
            }
            if (row === 1 && col === 2) return null; // covered by merged interior rect
            if (row === 2 && col >= 1 && col <= 2) return null; // covered
            return null;
          }

          // Get sign number for this cell
          const signNum = allSignNums.find((s) => {
            const pos = SOUTH_SIGN_GRID[s];
            return pos.row === row && pos.col === col;
          });
          if (signNum === undefined) return null;

          const houseNum = signNumToHouseNum(signNum, lagnaSignNum);
          const isLagna = houseNum === 1;
          const signName = SIGN_NUM_TO_NAME[signNum] ?? '';
          const abbr = signName.slice(0, 2).toUpperCase();

          return (
            <g key={`cell-${row}-${col}`}>
              <rect
                x={x}
                y={y}
                width={cellSize}
                height={cellSize}
                fill={isLagna ? 'rgba(212,168,83,0.08)' : 'rgba(255,255,255,0.02)'}
                stroke={isLagna ? 'rgba(212,168,83,0.45)' : 'rgba(255,255,255,0.15)'}
                strokeWidth={isLagna ? 1.5 : 0.8}
              />
              {/* Sign abbreviation (top-left of cell) */}
              <text
                x={x + 6}
                y={y + 12}
                textAnchor="start"
                dominantBaseline="middle"
                fontSize={size * 0.025}
                fill="rgba(255,255,255,0.3)"
                fontFamily="ui-monospace, monospace"
              >
                {abbr}
              </text>
              {/* House number (top-right of cell) */}
              <text
                x={x + cellSize - 6}
                y={y + 12}
                textAnchor="end"
                dominantBaseline="middle"
                fontSize={size * 0.022}
                fill="rgba(255,255,255,0.18)"
                fontFamily="ui-monospace, monospace"
              >
                {houseNum}
              </text>
            </g>
          );
        })
      )}

      {/* Planets — animated in from off-canvas */}
      {allSignNums.flatMap((signNum) => {
        const housePlanets = planetsBySign[signNum] ?? [];
        if (housePlanets.length === 0) return [];
        const houseNum = signNumToHouseNum(signNum, lagnaSignNum);

        return housePlanets.map((planet, idx) => {
          const anchor = getPlanetAnchor(houseNum, housePlanets.length, idx, 'south', lagnaSignNum);
          const targetX = anchor.x * size;
          const targetY = anchor.y * size;
          const glyph = PLANET_GLYPH[planet.name] ?? planet.name.slice(0, 2);
          const short = PLANET_SHORT[planet.name] ?? planet.name.slice(0, 2);

          const planetColor = planet.exalted
            ? '#4ade80'
            : planet.debilitated
            ? '#f87171'
            : planet.combust
            ? '#fbbf24'
            : '#e2e8f0';

          return (
            <motion.g
              key={`${planet.name}-s${signNum}-${idx}`}
              initial={{ x: offCanvasX - targetX, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{
                delay: idx * 0.12 + signNum * 0.025,
                duration: 0.55,
                ease: 'easeOut',
              }}
            >
              {planet.combust && (
                <circle
                  cx={targetX}
                  cy={targetY}
                  r={size * 0.022}
                  fill="rgba(251,191,36,0.12)"
                  stroke="rgba(251,191,36,0.35)"
                  strokeWidth={0.7}
                />
              )}

              <text
                x={targetX}
                y={targetY}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={size * 0.034}
                fill={planetColor}
                fontFamily="serif"
              >
                {glyph}
              </text>

              <text
                x={targetX}
                y={targetY + size * 0.028}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={size * 0.02}
                fill={planetColor}
                fontFamily="ui-monospace, monospace"
                opacity={0.85}
              >
                {short}
                {planet.retrograde && (
                  <tspan fontSize={size * 0.014} baselineShift="super" fill="rgba(167,139,250,0.9)">
                    R
                  </tspan>
                )}
              </text>

              {(planet.exalted || planet.debilitated) && (
                <text
                  x={targetX + size * 0.026}
                  y={targetY - size * 0.016}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={size * 0.014}
                  fill={planet.exalted ? '#4ade80' : '#f87171'}
                >
                  {planet.exalted ? '▲' : '▼'}
                </text>
              )}
            </motion.g>
          );
        });
      })}
    </svg>
  );
}
