'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { StarField } from '@/components/ui/StarField';

function UpsellSuccessContent() {
  const searchParams = useSearchParams();
  const reportId = searchParams.get('reportId');
  // Real generation state polled from the report status endpoint (no fabricated progress).
  const [progress, setProgress] = useState<number | null>(null);
  const [isComplete, setIsComplete] = useState(false);

  // Poll the real report status while the extra days are appended. Stops on completion,
  // on error, or after a bounded number of attempts (the notify email is the backstop).
  useEffect(() => {
    if (!reportId) return;
    let cancelled = false;
    let attempts = 0;
    const MAX_ATTEMPTS = 120; // ~120 * 5s = 10 min ceiling on polling

    async function poll() {
      if (cancelled) return;
      attempts += 1;
      try {
        const res = await fetch(`/api/reports/${reportId}/status`, { credentials: 'include', cache: 'no-store' });
        const data = (await res.json().catch(() => ({}))) as { status?: string; isComplete?: boolean; progress?: number };
        if (cancelled) return;
        if (res.ok) {
          if (typeof data.progress === 'number') setProgress(data.progress);
          if (data.isComplete || data.status === 'complete') { setIsComplete(true); return; }
          if (data.status === 'error') return; // stop; the report page surfaces the error
        }
      } catch { /* transient — keep polling */ }
      if (!cancelled && attempts < MAX_ATTEMPTS) {
        setTimeout(() => void poll(), 5000);
      }
    }
    void poll();
    return () => { cancelled = true; };
  }, [reportId]);

  return (
    <div className="min-h-screen bg-space text-star flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <StarField />
      
      <div className="max-w-xl w-full card border-success/30 bg-cosmos relative z-10 p-8 md:p-12 text-center shadow-glow-success">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', damping: 12, stiffness: 200 }}
          className="w-20 h-20 bg-success/20 border border-success/40 rounded-full flex items-center justify-center mx-auto mb-6"
        >
          <span className="text-4xl text-success">✓</span>
        </motion.div>

        <h1 className="text-display-sm font-display mb-4">Upgrade Confirmed</h1>
        <p className="text-dust text-lg mb-8">
          {isComplete ? (
            <>Your full <strong className="text-success">30-Day Monthly Oracle</strong> is ready. Open it below.</>
          ) : (
            <>Your upgrade is confirmed — we&apos;re adding days 8&ndash;30 to your <strong className="text-success">30-Day Monthly Oracle</strong> now. You can wait here or open your report; we&apos;ll email you the moment it&apos;s ready.</>
          )}
        </p>

        {reportId && !isComplete && (
          <div className="mb-8">
            <div className="flex justify-between text-xs font-mono text-dust mb-2">
              <span>APPENDING DAYS 8–30</span>
              {typeof progress === 'number' ? <span>{Math.round(progress)}%</span> : <span className="animate-pulse">WORKING…</span>}
            </div>
            <div className="h-2 w-full bg-horizon/20 rounded-full overflow-hidden border border-horizon/30">
              {typeof progress === 'number' ? (
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.max(2, progress)}%` }}
                  className="h-full bg-success shadow-glow-success"
                />
              ) : (
                <div className="h-full w-1/3 bg-success/70 shadow-glow-success animate-pulse" />
              )}
            </div>
          </div>
        )}

        <div className="p-4 rounded-sm bg-nebula border border-horizon/40 text-left mb-8">
          <p className="text-sm text-dust/80 leading-relaxed italic">
            &quot;By extending the temporal window, we allow the slower planetary transits to reveal their full influence on your path.&quot;
          </p>
        </div>

        <Link
          href={reportId ? `/report/${reportId}` : '/dashboard'}
          className="btn-primary w-full py-4 text-base font-semibold"
        >
          Open your report
        </Link>
      </div>
    </div>
  );
}

export default function UpsellSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-space flex items-center justify-center text-amber font-mono text-sm">Aligning stars...</div>}>
      <UpsellSuccessContent />
    </Suspense>
  );
}
