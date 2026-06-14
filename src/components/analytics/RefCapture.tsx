'use client';

import { useEffect } from 'react';

/**
 * Captures a referral code from ?ref=CODE into a 90-day cookie (`vh_ref`). At signup
 * the auth callback reads it and records the referral. Fires once; first ref wins.
 */
export default function RefCapture() {
  useEffect(() => {
    try {
      if (document.cookie.includes('vh_ref=')) return;
      const ref = new URLSearchParams(window.location.search).get('ref');
      if (!ref) return;
      const clean = ref.replace(/[^A-Za-z0-9]/g, '').slice(0, 16);
      if (!clean) return;
      const ninetyDays = 90 * 24 * 60 * 60;
      document.cookie = `vh_ref=${clean}; path=/; max-age=${ninetyDays}; SameSite=Lax`;
    } catch {
      /* never break the page */
    }
  }, []);
  return null;
}
