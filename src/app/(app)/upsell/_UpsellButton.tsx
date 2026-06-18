'use client';

import { useState } from 'react';

export function UpsellButton({ reportId }: { reportId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpgrade = async () => {
    setLoading(true);
    setError(null);
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
        throw new Error((data as { error?: string }).error ?? 'Could not start checkout');
      }
    } catch (e) {
      // Surface the failure — previously the button just silently reset, leaving the
      // buyer with no idea why nothing happened.
      console.error(e);
      setError(e instanceof Error ? e.message : 'Upgrade failed — please try again.');
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={handleUpgrade}
        disabled={loading}
        className="btn-primary w-full py-4 text-base font-semibold shadow-elevated disabled:opacity-50"
      >
        {loading ? 'Opening secure checkout…' : 'Upgrade to Monthly Oracle'}
      </button>
      {error && (
        <p role="alert" className="mt-2 text-center font-body text-body-sm text-caution">{error}</p>
      )}
    </div>
  );
}
