'use client';

import { useEffect } from 'react';
import { analyticsRoute, hasAnalyticsConsent } from '@/lib/analytics/consent';
import { useAnalyticsConsent } from '@/lib/analytics/useAnalyticsConsent';

const sources = new Set(['google', 'bing', 'facebook', 'instagram', 'youtube', 'tiktok', 'reddit', 'twitter', 'linkedin', 'whatsapp', 'newsletter', 'direct']);
const media = new Set(['cpc', 'organic', 'social', 'email', 'referral', 'none']);

export function captureFirstTouch() {
  if (!hasAnalyticsConsent()) return;
  try {
    if (document.cookie.split(';').some(part => part.trim().startsWith('vh_first_touch='))) return;
    const params = new URLSearchParams(window.location.search);
    const rawSource = (params.get('utm_source') || 'direct').toLowerCase();
    const rawMedium = (params.get('utm_medium') || 'none').toLowerCase();
    const data = {
      s: sources.has(rawSource) ? rawSource : 'other',
      m: media.has(rawMedium) ? rawMedium : 'other',
      c: '', r: '', l: analyticsRoute(window.location.pathname), t: new Date().toISOString(),
    };
    if (!hasAnalyticsConsent()) return;
    document.cookie = `vh_first_touch=${encodeURIComponent(JSON.stringify(data))}; Path=/; Max-Age=${30 * 24 * 60 * 60}; SameSite=Lax${window.location.protocol === 'https:' ? '; Secure' : ''}`;
  } catch {}
}

export default function FirstTouch() {
  const consent = useAnalyticsConsent();
  useEffect(() => { if (consent.allowed) captureFirstTouch(); }, [consent.allowed, consent.revision]);
  return null;
}
