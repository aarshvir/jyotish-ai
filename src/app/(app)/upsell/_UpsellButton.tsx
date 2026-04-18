'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function UpsellButton() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      // Pull reportId from URL params if passed from onboard success,
      // fallback to a dummy ID or server resolves later
      const params = new URLSearchParams(window.location.search);
      const reportId = params.get('reportId') || 'upsell_checkout';

      const res = await fetch('/api/ziina/create-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planType: 'monthly',
          reportId: reportId,
        }),
      });
      const data = await res.json();
      if (data.redirectUrl) {
        window.location.href = data.redirectUrl;
      } else {
        throw new Error(data.error || 'No checkout URL');
      }
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  return (
    <button 
      onClick={handleUpgrade}
      disabled={loading}
      className="btn-primary w-full py-4 text-base font-semibold shadow-elevated disabled:opacity-50"
    >
      {loading ? 'Securing Upgrade...' : 'Upgrade to Monthly Oracle (+$9.00)'}
    </button>
  );
}
