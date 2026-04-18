/**
 * Skeleton loading state that matches the GeneratingScreen silhouette,
 * preventing layout jump when the page hydrates.
 */
import { MandalaRing } from '@/components/ui/MandalaRing';

export default function Loading() {
  return (
    <div className="min-h-[calc(100vh-var(--nav-height))] bg-space flex flex-col items-center justify-center gap-8 px-6 overflow-hidden relative">
      {/* Orbital spinner */}
      <div className="relative w-32 h-32 mb-4 flex flex-col items-center justify-center">
        <MandalaRing className="absolute inset-0 w-full h-full text-amber opacity-25 animate-spin-slow" />
        <div className="w-16 h-16 rounded-full border border-amber/30 flex items-center justify-center bg-space/80 backdrop-blur-sm">
          <span className="font-mono text-xs text-amber/50">…</span>
        </div>
      </div>

      {/* Title skeleton */}
      <div className="space-y-3 text-center max-w-lg w-full">
        <div className="h-8 w-64 bg-horizon/30 rounded-sm animate-pulse mx-auto" />
        <div className="h-4 w-80 bg-horizon/20 rounded-sm animate-pulse mx-auto" />
      </div>

      {/* Progress bar skeleton */}
      <div className="w-full max-w-lg space-y-2">
        <div className="flex gap-0.5 h-1.5 w-full rounded-full overflow-hidden bg-horizon/30">
          {Array.from({ length: 19 }, (_, i) => (
            <div key={i} className="h-full flex-1 bg-horizon/20" />
          ))}
        </div>
        <div className="flex justify-between">
          <div className="h-3 w-20 bg-horizon/20 rounded animate-pulse" />
          <div className="h-3 w-12 bg-horizon/20 rounded animate-pulse" />
        </div>
      </div>

      {/* Telemetry skeleton */}
      <div className="w-full max-w-lg bg-[#0D1426]/80 border border-horizon/60 rounded-card p-5 h-40 flex flex-col justify-end gap-2.5">
        {[0.7, 0.5, 0.35].map((opacity, i) => (
          <div
            key={i}
            className="h-3.5 bg-horizon/20 rounded animate-pulse"
            style={{ opacity, width: `${70 + i * 10}%` }}
          />
        ))}
      </div>
    </div>
  );
}
