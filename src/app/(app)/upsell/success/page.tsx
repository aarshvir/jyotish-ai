'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { StarField } from '@/components/ui/StarField';

function UpsellSuccessContent() {
  const searchParams = useSearchParams();
  const reportId = searchParams.get('reportId');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((p) => (p < 95 ? p + Math.random() * 5 : p));
    }, 800);
    return () => clearInterval(interval);
  }, []);

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

        <h1 className="text-display-sm font-display mb-4">Upgrade Successful</h1>
        <p className="text-dust text-lg mb-8">
          The stars are aligning. We are currently extending your 7-day outlook into a full **30-Day Monthly Oracle**.
        </p>

        <div className="mb-8">
          <div className="flex justify-between text-xs font-mono text-dust mb-2">
            <span>APPENDING DAYS 8–30</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-2 w-full bg-horizon/20 rounded-full overflow-hidden border border-horizon/30">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              className="h-full bg-success shadow-glow-success"
            />
          </div>
        </div>

        <div className="p-4 rounded-sm bg-nebula border border-horizon/40 text-left mb-8">
          <p className="text-sm text-dust/80 leading-relaxed italic">
            &quot;By extending the temporal window, we allow the slower planetary transits to reveal their full influence on your path.&quot;
          </p>
        </div>

        <Link
          href={reportId ? `/report/${reportId}` : '/dashboard'}
          className="btn-primary w-full py-4 text-base font-semibold"
        >
          Return to your Cosmic Report
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
