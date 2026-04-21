'use client';

import { useState } from 'react';

export function UpsellButton({ reportId }: { reportId: string }) {
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/ziina/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.redirectUrl) {
        window.location.href = data.redirectUrl as string;
      } else {
        throw new Error((data as { error?: string }).error ?? 'No checkout URL');
      }
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleUpgrade}
      disabled={loading}
      className="btn-primary w-full py-4 text-base font-semibold shadow-elevated disabled:opacity-50"
    >
      {loading ? 'Opening secure checkout…' : 'Upgrade to Monthly Oracle'}
    </button>
  );
}
