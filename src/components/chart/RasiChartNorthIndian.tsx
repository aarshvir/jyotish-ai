'use client';

import { motion } from 'framer-motion';
import {
  getNorthIndianHouseRegion,
  signNameToNum,
  signNumToHouseNum,
  getPlanetAnchor,
  SIGN_NUM_TO_NAME,
} from './houseGeometry';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ChartPlanet {
  name: string;
  sign: string;
  house: number;
  retrograde?: boolean;
  combust?: boolean;
  exalted?: boolean;
  debilitated?: boolean;
}

export interface RasiChartNorthIndianProps {
  /** Lagna sign name (e.g. "Cancer") */
  lagna: string;
  planets: ChartPlanet[];
  /** SVG size in px (square). Default: 360 */
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

// ─── Sub-components ──────────────────────────────────────────────────────────

function HouseLabel({
  houseNum,
  size,
  lagnaSignNum,
}: {
  houseNum: number;
  size: number;
  lagnaSignNum: number;
}) {
  const region = getNorthIndianHouseRegion(houseNum);
  const anchor = region.labelAnchor;
  const signNum = ((lagnaSignNum + houseNum - 2) % 12) + 1;
  const signName = SIGN_NUM_TO_NAME[signNum] ?? '';
  const abbr = signName.slice(0, 2).toUpperCase();

  return (
    <text
      x={anchor.x * size}
      y={anchor.y * size - 8}
      textAnchor="middle"
      dominantBaseline="middle"
      fontSize={size * 0.028}
      fill="rgba(255,255,255,0.25)"
      fontFamily="ui-monospace, monospace"
    >
      {abbr}
    </text>
  );
}

function HouseNumberLabel({
  houseNum,
  size,
}: {
  houseNum: number;
  size: number;
}) {
  const region = getNorthIndianHouseRegion(houseNum);
  const anchor = region.labelAnchor;

  return (
    <text
      x={anchor.x * size}
      y={anchor.y * size + 8}
      textAnchor="middle"
      dominantBaseline="middle"
      fontSize={size * 0.024}
      fill="rgba(255,255,255,0.18)"
      fontFamily="ui-monospace, monospace"
    >
      {houseNum}
    </text>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export function RasiChartNorthIndian({
  lagna,
  planets,
  size = 360,
  className = '',
}: RasiChartNorthIndianProps) {
  const lagnaSignNum = signNameToNum(lagna);

  // Group planets by house number
  const planetsByHouse: Record<number, ChartPlanet[]> = {};
  for (const planet of planets) {
    const house =
      planet.house > 0
        ? planet.house
        : signNumToHouseNum(signNameToNum(planet.sign), lagnaSignNum);
    if (!planetsByHouse[house]) planetsByHouse[house] = [];
    planetsByHouse[house].push(planet);
  }

  // For off-canvas initial positions (planets animate in from the right edge)
  const offCanvasX = size * 1.3;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={`block ${className}`}
      aria-label={`North Indian Rasi chart, ${lagna} lagna`}
    >
      {/* Background */}
      <rect width={size} height={size} fill="#0a0f1e" rx={4} />

      {/* House polygon regions */}
      {Array.from({ length: 12 }, (_, i) => i + 1).map((houseNum) => {
        const region = getNorthIndianHouseRegion(houseNum);
        // Scale points from 0-1 to px
        const scaledPoints = region.points
          .split(' ')
          .map((pair) => {
            const [x, y] = pair.split(',').map(Number);
            return `${x * size},${y * size}`;
          })
          .join(' ');

        const isLagna = houseNum === 1;
        const fill = isLagna ? 'rgba(212,168,83,0.06)' : 'rgba(255,255,255,0.02)';
        const stroke = isLagna ? 'rgba(212,168,83,0.5)' : 'rgba(255,255,255,0.15)';

        return (
          <polygon
            key={houseNum}
            points={scaledPoints}
            fill={fill}
            stroke={stroke}
            strokeWidth={isLagna ? 1.5 : 0.8}
          />
        );
      })}

      {/* House sign abbreviations + house numbers */}
      {Array.from({ length: 12 }, (_, i) => i + 1).map((houseNum) => (
        <g key={`label-${houseNum}`}>
          <HouseLabel houseNum={houseNum} size={size} lagnaSignNum={lagnaSignNum} />
          <HouseNumberLabel houseNum={houseNum} size={size} />
        </g>
      ))}

      {/* Lagna marker (Ac or As symbol) */}
      {(() => {
        const region = getNorthIndianHouseRegion(1);
        const ax = region.labelAnchor.x * size;
        const ay = region.labelAnchor.y * size + 20;
        return (
          <text
            x={ax}
            y={ay}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={size * 0.03}
            fill="rgba(212,168,83,0.7)"
            fontFamily="ui-monospace, monospace"
            fontWeight="bold"
          >
            Asc
          </text>
        );
      })()}

      {/* Planets — animated in from off-canvas */}
      {Object.entries(planetsByHouse).flatMap(([houseStr, housePlanets]) => {
        const houseNum = parseInt(houseStr, 10);
        return housePlanets.map((planet, idx) => {
          const anchor = getPlanetAnchor(
            houseNum,
            housePlanets.length,
            idx,
            'north',
          );
          const targetX = anchor.x * size;
          const targetY = anchor.y * size;
          const glyph = PLANET_GLYPH[planet.name] ?? planet.name.slice(0, 2);
          const short = PLANET_SHORT[planet.name] ?? planet.name.slice(0, 2);
          const isRetro = planet.retrograde;
          const isCombust = planet.combust;
          const isExalted = planet.exalted;
          const isDebil = planet.debilitated;

          const planetColor = isExalted
            ? '#4ade80'
            : isDebil
            ? '#f87171'
            : isCombust
            ? '#fbbf24'
            : '#e2e8f0';

          return (
            <motion.g
              key={`${planet.name}-h${houseNum}-${idx}`}
              initial={{ x: offCanvasX - targetX, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{
                delay: idx * 0.12 + houseNum * 0.03,
                duration: 0.55,
                ease: 'easeOut',
              }}
            >
              {/* Combust amber halo */}
              {isCombust && (
                <circle
                  cx={targetX}
                  cy={targetY}
                  r={size * 0.025}
                  fill="rgba(251,191,36,0.15)"
                  stroke="rgba(251,191,36,0.4)"
                  strokeWidth={0.8}
                />
              )}

              {/* Planet glyph */}
              <text
                x={targetX}
                y={targetY}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={size * 0.038}
                fill={planetColor}
                fontFamily="serif"
              >
                {glyph}
              </text>

              {/* Short name below glyph */}
              <text
                x={targetX}
                y={targetY + size * 0.032}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={size * 0.022}
                fill={planetColor}
                fontFamily="ui-monospace, monospace"
                opacity={0.85}
              >
                {short}
                {isRetro && (
                  <tspan
                    fontSize={size * 0.016}
                    baselineShift="super"
                    fill="rgba(167,139,250,0.9)"
                  >
                    R
                  </tspan>
                )}
              </text>

              {/* Exalted / debilitated chevron */}
              {(isExalted || isDebil) && (
                <text
                  x={targetX + size * 0.028}
                  y={targetY - size * 0.018}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={size * 0.016}
                  fill={isExalted ? '#4ade80' : '#f87171'}
                >
                  {isExalted ? '▲' : '▼'}
                </text>
              )}
            </motion.g>
          );
        });
      })}
    </svg>
  );
}
