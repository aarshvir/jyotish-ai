'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function UpsellButton() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planType: 'monthly_upsell',
          // Assuming the environment will provide the correct price ID for the $9 upsell
          priceId: process.env.NEXT_PUBLIC_STRIPE_MONTHLY_UPSELL_PRICE_ID || 'price_upsell_placeholder',
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else if (data.redirect) {
        router.push(data.redirect);
      } else {
        throw new Error('No checkout URL');
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
