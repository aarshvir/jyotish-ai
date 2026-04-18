'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { PHASE_LABELS, ORDERED_PHASES } from '@/lib/reports/phases/slugs';
import type { PhaseSlug } from '@/lib/reports/phases/slugs';

// ─── Types ───────────────────────────────────────────────────────────────────

export type TelemetryLineType = 'phase' | 'info' | 'warn' | 'done';

export interface TelemetryLine {
  id: string;
  type: TelemetryLineType;
  /** Raw slug from SSE; if not a known slug, rendered as-is */
  slug: string;
  pct: number;
  ts: number;
}

// ─── PhaseProgressBar ────────────────────────────────────────────────────────

interface PhaseProgressBarProps {
  /** Current reported progress (0-100) */
  progress: number;
  /** Current phase slug */
  currentSlug: string | null;
}

const TYPE_COLORS: Record<TelemetryLineType, string> = {
  phase: 'text-amber',
  info:  'text-star',
  warn:  'text-caution',
  done:  'text-success',
};

export function PhaseProgressBar({ progress, currentSlug }: PhaseProgressBarProps) {
  // Find the index of the current phase in ORDERED_PHASES
  const currentIdx = ORDERED_PHASES.findIndex((p) => p.slug === currentSlug);

  return (
    <div className="w-full space-y-2">
      {/* Segmented bar */}
      <div className="flex gap-0.5 h-1.5 w-full rounded-full overflow-hidden bg-horizon/30">
        {ORDERED_PHASES.map((phase, idx) => {
          const isComplete = idx < currentIdx || progress >= phase.pct;
          const isCurrent = idx === currentIdx;
          return (
            <motion.div
              key={phase.slug}
              className={`h-full flex-1 transition-colors duration-700 ${
                isComplete
                  ? 'bg-amber'
                  : isCurrent
                  ? 'bg-amber/50 animate-pulse'
                  : 'bg-horizon/20'
              }`}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: idx * 0.03, duration: 0.4 }}
            />
          );
        })}
      </div>

      {/* Labels */}
      <div className="flex justify-between">
        <span className="font-mono text-xs text-dust/50 uppercase tracking-widest">
          {currentSlug
            ? (PHASE_LABELS[currentSlug as PhaseSlug] ?? currentSlug)
            : 'Aligning with the cosmos…'}
        </span>
        <span className="font-mono text-xs text-amber/70 tabular-nums">
          {progress}%
        </span>
      </div>
    </div>
  );
}

// ─── LiveTelemetry ───────────────────────────────────────────────────────────

interface LiveTelemetryProps {
  lines: TelemetryLine[];
  /** Max visible lines (older lines fade out above). Default: 6 */
  maxVisible?: number;
  className?: string;
}

export function LiveTelemetry({ lines, maxVisible = 6, className = '' }: LiveTelemetryProps) {
  const visible = lines.slice(-maxVisible);

  return (
    <div
      className={`w-full bg-[#0D1426]/80 backdrop-blur-md border border-horizon/60 rounded-card p-5 text-left h-40 flex flex-col justify-end overflow-hidden relative shadow-inner-light ${className}`}
      aria-live="polite"
      aria-label="Generation progress log"
    >
      {/* Top fade */}
      <div className="absolute top-0 left-0 w-full h-10 bg-gradient-to-b from-[#0D1426] to-transparent z-10 pointer-events-none" />

      <ul className="space-y-2.5 font-mono text-xs z-0">
        <AnimatePresence initial={false}>
          {visible.map((line, i) => {
            const isLast = i === visible.length - 1;
            const label = PHASE_LABELS[line.slug as PhaseSlug] ?? line.slug;
            const colorClass = TYPE_COLORS[line.type] ?? 'text-star';

            return (
              <motion.li
                key={line.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: isLast ? 1 : 0.35, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className={`flex items-start gap-2.5 ${isLast ? colorClass : 'text-dust'}`}
              >
                {/* Prompt */}
                <span className="shrink-0 opacity-40 select-none">&gt;</span>

                {/* Message */}
                <span className={isLast ? '' : 'truncate'}>
                  {label}
                </span>

                {/* Blinking cursor on last active line */}
                {isLast && line.type !== 'done' && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 1, 0] }}
                    transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                    className="inline-block w-1.5 h-3.5 bg-current ml-0.5 relative top-0.5 shrink-0"
                  />
                )}

                {/* Done checkmark */}
                {line.type === 'done' && (
                  <span className="ml-1 text-success shrink-0">✓</span>
                )}
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ul>
    </div>
  );
}
