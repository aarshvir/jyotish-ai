'use client';

import { useEffect } from 'react';
import { hasAnalyticsConsent } from '@/lib/analytics/consent';
import { useAnalyticsConsent } from '@/lib/analytics/useAnalyticsConsent';

export function captureReferral() {
  if (!hasAnalyticsConsent()) return;
  try {
    if (document.cookie.split(';').some(part => part.trim().startsWith('vh_ref='))) return;
    const ref = new URLSearchParams(window.location.search).get('ref');
    if (!ref || !/^[A-Za-z0-9]{1,16}$/.test(ref) || !hasAnalyticsConsent()) return;
    document.cookie = `vh_ref=${ref}; Path=/; Max-Age=${30 * 24 * 60 * 60}; SameSite=Lax${window.location.protocol === 'https:' ? '; Secure' : ''}`;
  } catch {}
}

export default function RefCapture() {
  const consent = useAnalyticsConsent();
  useEffect(() => { if (consent.allowed) captureReferral(); }, [consent.allowed, consent.revision]);
  return null;
}
