'use client';

import { useState } from 'react';

export interface Point { label: string; value: number; }

/** Tiny inline sparkline for KPI cards. */
export function Sparkline({ data, color = 'var(--amber)', width = 120, height = 34 }: { data: number[]; color?: string; width?: number; height?: number }) {
  if (!data.length) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const span = max - min || 1;
  const step = data.length > 1 ? width / (data.length - 1) : 0;
  const pts = data.map((v, i) => `${(i * step).toFixed(1)},${(height - ((v - min) / span) * height).toFixed(1)}`);
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible" aria-hidden>
      <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={(data.length - 1) * step} cy={height - ((data[data.length - 1] - min) / span) * height} r={2} fill={color} />
    </svg>
  );
}

/** Responsive single-series area/line chart with hover crosshair + tooltip. */
export function LineChart({ points, color = 'var(--amber)', valuePrefix = '', height = 220 }: { points: Point[]; color?: string; valuePrefix?: string; height?: number }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 760, H = height, padL = 8, padR = 8, padT = 14, padB = 22;
  if (!points.length) return <p className="text-dust/50 text-body-sm">No data in range.</p>;
  const max = Math.max(...points.map((p) => p.value), 1);
  const innerW = W - padL - padR, innerH = H - padT - padB;
  const step = points.length > 1 ? innerW / (points.length - 1) : 0;
  const x = (i: number) => padL + i * step;
  const y = (v: number) => padT + innerH - (v / max) * innerH;
  const line = points.map((p, i) => `${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');
  const area = `${padL},${padT + innerH} ${line} ${padL + (points.length - 1) * step},${padT + innerH}`;
  const ticks = [0, Math.ceil(points.length / 2) - 1, points.length - 1].filter((v, i, a) => a.indexOf(v) === i && v >= 0);

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" onMouseLeave={() => setHover(null)}>
        <defs>
          <linearGradient id="lc-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={area} fill="url(#lc-fill)" />
        <polyline points={line} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {hover !== null && (
          <line x1={x(hover)} y1={padT} x2={x(hover)} y2={padT + innerH} stroke="var(--amber)" strokeOpacity="0.4" strokeWidth={1} strokeDasharray="3 3" />
        )}
        {points.map((p, i) => (
          <circle key={i} cx={x(i)} cy={y(p.value)} r={hover === i ? 3.5 : 0} fill={color} />
        ))}
        {/* hover hit areas */}
        {points.map((p, i) => (
          <rect key={`h${i}`} x={x(i) - step / 2} y={0} width={Math.max(step, 6)} height={H} fill="transparent" onMouseEnter={() => setHover(i)} />
        ))}
        {ticks.map((i) => (
          <text key={`t${i}`} x={x(i)} y={H - 6} textAnchor={i === 0 ? 'start' : i === points.length - 1 ? 'end' : 'middle'} className="fill-[var(--color-dust)]" fontSize="11" opacity="0.5">
            {points[i].label}
          </text>
        ))}
      </svg>
      {hover !== null && (
        <div className="pointer-events-none absolute top-1 left-1/2 -translate-x-1/2 rounded-md bg-space border border-horizon/60 px-3 py-1.5 text-center">
          <div className="font-mono text-mono-sm text-dust/60">{points[hover].label}</div>
          <div className="font-display text-lg text-amber">{valuePrefix}{points[hover].value.toLocaleString()}</div>
        </div>
      )}
    </div>
  );
}

/** Stacked bars: two series (e.g. free vs paid) per day, with native hover tooltips. */
export function StackedBars({ points, height = 200 }: { points: { label: string; a: number; b: number }[]; height?: number }) {
  if (!points.length) return <p className="text-dust/50 text-body-sm">No data in range.</p>;
  const max = Math.max(...points.map((p) => p.a + p.b), 1);
  const W = 760, H = height, padB = 22, padT = 8;
  const innerH = H - padB - padT;
  const slot = W / points.length;
  const bw = Math.min(slot * 0.6, 26);
  const ticks = [0, Math.floor(points.length / 2), points.length - 1].filter((v, i, arr) => arr.indexOf(v) === i);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
      {points.map((p, i) => {
        const cx = i * slot + slot / 2;
        const aH = (p.a / max) * innerH;
        const bH = (p.b / max) * innerH;
        return (
          <g key={i}>
            <rect x={cx - bw / 2} y={padT + innerH - aH} width={bw} height={aH} fill="var(--color-dust)" opacity="0.35">
              <title>{p.label}: {p.a} free</title>
            </rect>
            <rect x={cx - bw / 2} y={padT + innerH - aH - bH} width={bw} height={bH} fill="var(--amber)">
              <title>{p.label}: {p.b} paid</title>
            </rect>
          </g>
        );
      })}
      {ticks.map((i) => (
        <text key={i} x={i * slot + slot / 2} y={H - 6} textAnchor="middle" className="fill-[var(--color-dust)]" fontSize="11" opacity="0.5">
          {points[i].label}
        </text>
      ))}
    </svg>
  );
}
