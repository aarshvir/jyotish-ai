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
  /** Auth headers (bypass token etc.) for SSE connection */
  extraHeaders?: Record<string, string>;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

let _lineCounter = 0;
function makeLineId(): string {
  return `tl-${Date.now()}-${++_lineCounter}`;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function GeneratingScreen({
  reportId,
  elapsedSeconds,
  onElapsed,
  generationStartRef,
  serverPoll,
  extraHeaders = {},
}: GeneratingScreenProps) {
  const [telemetryLines, setTelemetryLines] = useState<TelemetryLine[]>([]);
  const lastSlugRef = useRef<string | null>(null);
  const sseRef = useRef<EventSource | null>(null);
  const watchdogTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const WATCHDOG_MS = 15_000; // 15s without any SSE event → fall back to poll data

  // Elapsed timer
  useEffect(() => {
    const t = setInterval(() => {
      const start = generationStartRef.current ?? Date.now();
      onElapsed(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(t);
  }, [generationStartRef, onElapsed]);

  // SSE connection to /api/reports/[id]/stream
  // Only open if the report is still generating.
  useEffect(() => {
    if (!reportId || serverPoll?.status === 'complete') return;

    // EventSource doesn't support custom headers — we use a URL param for bypass.
    // The auth cookie is sent automatically by the browser.
    const bypassToken = extraHeaders['x-bypass-token'];
    const url = bypassToken
      ? `/api/reports/${reportId}/stream?bypass=${encodeURIComponent(bypassToken)}`
      : `/api/reports/${reportId}/stream`;

    const es = new EventSource(url, { withCredentials: true });
    sseRef.current = es;

    function resetWatchdog() {
      if (watchdogTimerRef.current) clearTimeout(watchdogTimerRef.current);
      watchdogTimerRef.current = setTimeout(() => {
        // Watchdog fired — SSE connection may be stale; add an info line
        setTelemetryLines((prev) => [
          ...prev,
          {
            id: makeLineId(),
            type: 'info',
            slug: 'Verifying connection…',
            pct: serverPoll?.progress ?? 0,
            ts: Date.now(),
          },
        ]);
      }, WATCHDOG_MS);
    }

    resetWatchdog();

    es.addEventListener('phase', (e: MessageEvent) => {
      resetWatchdog();
      try {
        const payload = JSON.parse(e.data) as {
          slug?: string | null;
          pct?: number;
          status?: string;
        };
        const slug = payload.slug ?? '';
        const pct = payload.pct ?? 0;
        if (slug && slug !== lastSlugRef.current) {
          lastSlugRef.current = slug;
          setTelemetryLines((prev) => [
            ...prev,
            { id: makeLineId(), type: 'phase', slug, pct, ts: Date.now() },
          ]);
        }
      } catch { /* ignore parse errors */ }
    });

    es.addEventListener('complete', () => {
      resetWatchdog();
      setTelemetryLines((prev) => [
        ...prev,
        { id: makeLineId(), type: 'done', slug: 'finalize:persist', pct: 100, ts: Date.now() },
      ]);
      es.close();
    });

    es.addEventListener('error', () => {
      // SSE errors are normal (connection drops) — don't show to user, watchdog handles it
    });

    return () => {
      es.close();
      sseRef.current = null;
      if (watchdogTimerRef.current) clearTimeout(watchdogTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- open once per reportId
  }, [reportId]);

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

      </div>
    </div>
  );
}
