'use client';

import { useEffect } from 'react';

/**
 * Captures the visitor's FIRST-touch source once and stores it in a 1-year cookie
 * (`vh_first_touch`). At signup, the auth callback reads this cookie and persists it
 * to user_profiles so the admin Attribution view can tie each paying customer to the
 * channel that originally brought them. Fires once; never overwrites an existing cookie.
 */
export default function FirstTouch() {
  useEffect(() => {
    try {
      if (document.cookie.includes('vh_first_touch=')) return;
      const params = new URLSearchParams(window.location.search);
      const host = (() => {
        try { return document.referrer ? new URL(document.referrer).hostname.replace(/^www\./, '') : ''; }
        catch { return ''; }
      })();
      let source = params.get('utm_source') || '';
      let medium = params.get('utm_medium') || '';
      if (!source) {
        if (!host || host.includes('vedichour')) { source = 'direct'; medium = medium || 'none'; }
        else if (/google|bing|duckduckgo|yahoo|ecosia/.test(host)) { source = 'google'; medium = medium || 'organic'; }
        else if (/instagram|facebook|fb\.|youtube|tiktok|reddit|twitter|x\.com|t\.co|linkedin|pinterest|whatsapp|threads|quora/.test(host)) { source = host; medium = medium || 'social'; }
        else { source = host; medium = medium || 'referral'; }
      }
      const data = {
        s: source.slice(0, 64),
        m: (medium || 'none').slice(0, 64),
        c: (params.get('utm_campaign') || '').slice(0, 64),
        r: host.slice(0, 128),
        l: window.location.pathname.slice(0, 128),
        t: new Date().toISOString(),
      };
      const oneYear = 365 * 24 * 60 * 60;
      document.cookie = `vh_first_touch=${encodeURIComponent(JSON.stringify(data))}; path=/; max-age=${oneYear}; SameSite=Lax`;
    } catch {
      /* never break the page */
    }
  }, []);
  return null;
}
