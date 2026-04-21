'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function DismissToReport({ reportId }: { reportId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onClick() {
    setBusy(true);
    try {
      await fetch('/api/upsell/dismiss', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId }),
      });
    } catch {
      /* still navigate */
    }
    router.push(`/report/${reportId}`);
  }

  return (
    <button
      type="button"
      disabled={busy}
      onClick={onClick}
      className="w-full text-center text-dust/60 hover:text-dust text-sm transition-colors py-2 uppercase tracking-wide font-mono disabled:opacity-50"
    >
      No thanks — take me to my 7-day report
    </button>
  );
}
