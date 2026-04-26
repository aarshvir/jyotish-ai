'use client';

import { useEffect, useRef, useState, type MutableRefObject } from 'react';
import { motion } from 'framer-motion';
import { MandalaRing } from '@/components/ui/MandalaRing';
import { StarField } from '@/components/ui/StarField';
import { LiveTelemetry, PhaseProgressBar, type TelemetryLine } from '@/components/report/LiveTelemetry';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ServerPollState {
  status: string;
  progress: number;
  generation_step?: string | null;
}

interface GeneratingScreenProps {
  reportId: string;
  elapsedSeconds: number;
  onElapsed: (s: number) => void;
  generationStartRef: MutableRefObject<number | null>;
  serverPoll: ServerPollState | null;
  /** Transient status/poll failures — generation may still be running on the server. */
  reconnecting?: boolean;
  /** Tier A copy (non-terminal); overrides default reconnecting label when set. */
  connectionHint?: string | null;
  /** Kept for compatibility; main UI progress now uses Realtime + polling only. */
  extraHeaders?: Record<string, string>;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

let _lineCounter = 0;
function makeLineId(): string {
  return `tl-${Date.now()}-${++_lineCounter}`;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function GeneratingScreen({
  elapsedSeconds,
  onElapsed,
  generationStartRef,
  serverPoll,
  reconnecting = false,
  connectionHint = null,
}: GeneratingScreenProps) {
  const [telemetryLines, setTelemetryLines] = useState<TelemetryLine[]>([]);
  const lastSlugRef = useRef<string | null>(null);

  // Elapsed timer
  useEffect(() => {
    const t = setInterval(() => {
      const start = generationStartRef.current ?? Date.now();
      onElapsed(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(t);
  }, [generationStartRef, onElapsed]);

  // Also push phase updates from Supabase Realtime (serverPoll) into telemetry
  useEffect(() => {
    const step = serverPoll?.generation_step ?? null;
    if (step && step !== lastSlugRef.current) {
      lastSlugRef.current = step;
      setTelemetryLines((prev) => [
        ...prev,
        {
          id: makeLineId(),
          type: 'phase',
          slug: step,
          pct: serverPoll?.progress ?? 0,
          ts: Date.now(),
        },
      ]);
    }
  }, [serverPoll?.generation_step, serverPoll?.progress]);

  // Display progress
  const realProgress = serverPoll?.progress ?? 0;
  const fallbackProgress = serverPoll ? 0 : Math.min(4, Math.floor(elapsedSeconds / 5));
  const displayProgress = Math.max(realProgress, fallbackProgress);
  const currentSlug = lastSlugRef.current ?? serverPoll?.generation_step ?? null;

  // Elapsed label
  const mins = Math.floor(elapsedSeconds / 60);
  const secs = elapsedSeconds % 60;
  const elapsed = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;

  return (
    <div className="min-h-[calc(100vh-var(--nav-height))] bg-space flex flex-col items-center justify-center gap-8 px-6 overflow-hidden relative">
      <StarField />

      {/* Ambient glow that grows with progress */}
      <div
        className="absolute w-[600px] h-[600px] rounded-full bg-amber opacity-[0.03] blur-3xl transition-transform duration-1000 ease-out"
        style={{ transform: `scale(${0.8 + (displayProgress / 100) * 0.4})` }}
      />

      <div className="relative z-10 flex flex-col items-center text-center max-w-lg w-full">

        {/* Orbital animation */}
        <div className="relative w-32 h-32 mb-10 flex flex-col items-center justify-center">
          <MandalaRing className="absolute inset-0 w-full h-full text-amber opacity-30 animate-spin-slow" />
          <motion.div
            className="w-16 h-16 rounded-full border border-amber/50 flex items-center justify-center bg-space/80 shadow-glow-amber backdrop-blur-sm"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 1, ease: 'easeOut' }}
          >
            <span className="text-xl font-mono text-amber">{displayProgress}%</span>
          </motion.div>
          <motion.div
            className="absolute origin-center w-28 h-28 border border-horizon/60 rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
          >
            <div className="absolute top-0 left-1/2 -ml-1 -mt-1 w-2 h-2 bg-amber rounded-full shadow-[0_0_8px_2px_rgba(212,168,83,0.8)]" />
          </motion.div>
        </div>

        <h1 className="text-star text-3xl font-display font-semibold mb-3 tracking-tight">
          Focusing the Heavens
        </h1>
        <p className="text-dust text-sm mb-8">
          Your blueprint is generating securely in the background. You may close this tab.
        </p>
        {reconnecting ? (
          <p
            className="text-amber/85 text-xs font-mono mb-6 -mt-4 animate-pulse"
            role="status"
            aria-live="polite"
          >
            {connectionHint?.trim() ? connectionHint : 'Reconnecting…'}
          </p>
        ) : null}

        {/* Phase progress bar with per-segment boundaries */}
        <div className="w-full mb-6">
          <PhaseProgressBar progress={displayProgress} currentSlug={currentSlug} />
          <div className="flex justify-between items-center mt-3">
            <span className="font-mono text-xs text-dust/60 uppercase tracking-widest">
              {elapsed} ELAPSED
            </span>
            {displayProgress > 80 ? (
              <span className="font-mono text-xs text-success tracking-widest uppercase">Finalizing</span>
            ) : (
              <span className="font-mono text-xs text-amber/60 tracking-widest uppercase animate-pulse">
                Calculating…
              </span>
            )}
          </div>
        </div>

        {/* Live telemetry terminal */}
        <LiveTelemetry lines={telemetryLines} maxVisible={6} className="w-full" />

        {/* 60s escape hatch — shown only after a minute of waiting */}
        {elapsedSeconds >= 60 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mt-6 w-full rounded-card border border-horizon/30 bg-horizon/10 px-5 py-4 text-center"
          >
            <p className="text-dust/70 text-body-sm mb-2">
              Taking longer than expected?
            </p>
            <p className="text-dust/50 text-mono-sm font-mono mb-3">
              Your report will complete in the background. You can safely close this tab — we&apos;ll have it ready in your dashboard.
            </p>
            <a
              href="/dashboard"
              className="inline-block text-amber/80 hover:text-amber text-body-sm transition-colors underline underline-offset-4"
            >
              Go to Dashboard →
            </a>
          </motion.div>
        )}

      </div>
    </div>
  );
}
