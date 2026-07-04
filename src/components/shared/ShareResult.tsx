'use client';

import { useState } from 'react';
import { track } from '@/components/analytics/PostHogProvider';

interface Props {
  /** Native-share title (used only by navigator.share). */
  title: string;
  /** The pre-written, brand-safe line that gets shared. */
  text: string;
  /** URL to share. Falls back to the current page origin. */
  url?: string;
  /** Feeds utm_campaign on internal vedichour links. */
  utmCampaign?: string;
  /** Distinguishes the calling surface in analytics. */
  surface?: string;
  className?: string;
}

/** Append share UTMs only to our own vedichour URLs, and only if not already tagged. */
function withUtm(rawUrl: string, medium: string, campaign: string): string {
  try {
    const u = new URL(rawUrl);
    const internal =
      u.hostname === 'vedichour.com' ||
      u.hostname.endsWith('.vedichour.com') ||
      u.hostname === 'localhost';
    if (!internal || u.searchParams.has('utm_source')) return rawUrl;
    u.searchParams.set('utm_source', 'share');
    u.searchParams.set('utm_medium', medium);
    u.searchParams.set('utm_campaign', campaign);
    return u.toString();
  } catch {
    return rawUrl;
  }
}

export function ShareResult({ title, text, url, utmCampaign, surface = 'result', className }: Props) {
  const [copied, setCopied] = useState(false);

  const campaign = utmCampaign || 'result_share';
  const baseUrl = url || (typeof window !== 'undefined' ? window.location.origin : '');
  const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  const waUrl = `https://wa.me/?text=${encodeURIComponent(`${text} ${withUtm(baseUrl, 'whatsapp', campaign)}`)}`;
  const xUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(withUtm(baseUrl, 'twitter', campaign))}`;

  function onShareClick(channel: string) {
    track('result_shared', { channel, surface });
  }

  async function onCopy() {
    onShareClick('copy');
    const shareUrl = withUtm(baseUrl, 'copy', campaign);
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        const ta = document.createElement('textarea');
        ta.value = shareUrl;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked — no-op, button stays in default state */
    }
  }

  async function onNativeShare() {
    onShareClick('native');
    try {
      await navigator.share({ title, text, url: withUtm(baseUrl, 'native', campaign) });
    } catch {
      /* user cancelled or share unavailable — ignore */
    }
  }

  const btn =
    'inline-flex items-center gap-1.5 rounded-md border border-horizon/40 bg-cosmos/60 px-3 py-1.5 ' +
    'font-mono text-mono-sm text-dust transition-colors hover:border-amber/40 hover:text-star hover:bg-amber/[0.04] ' +
    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber';

  return (
    <div className={`flex flex-wrap items-center justify-center gap-2 ${className ?? ''}`}>
      <span className="font-mono text-mono-sm text-dust/70 uppercase tracking-wider">Share:</span>

      <a
        href={waUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => onShareClick('whatsapp')}
        className={btn}
        aria-label="Share on WhatsApp"
      >
        <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true">
          <path d="M17.47 14.38c-.29-.15-1.7-.84-1.96-.93-.26-.1-.45-.15-.64.14-.19.29-.74.93-.9 1.12-.17.19-.33.22-.62.07-.29-.14-1.22-.45-2.32-1.44-.86-.76-1.44-1.71-1.6-2-.17-.29-.02-.45.12-.6.13-.13.29-.33.43-.5.15-.17.19-.29.29-.48.1-.19.05-.36-.02-.5-.07-.15-.64-1.55-.88-2.12-.23-.55-.47-.48-.64-.49-.16-.01-.36-.01-.55-.01-.19 0-.5.07-.77.36-.26.29-1 .98-1 2.38 0 1.4 1.02 2.76 1.17 2.95.14.19 2.01 3.08 4.88 4.32.68.29 1.21.47 1.63.6.68.22 1.31.19 1.8.11.55-.08 1.7-.69 1.94-1.36.24-.67.24-1.24.17-1.36-.07-.12-.26-.19-.55-.34zM12 2a10 10 0 00-8.5 15.28L2 22l4.85-1.47A10 10 0 1012 2zm0 18.2a8.2 8.2 0 01-4.18-1.14l-.3-.18-3.1.81.83-3.02-.2-.31A8.2 8.2 0 1112 20.2z" />
        </svg>
        WhatsApp
      </a>

      <a
        href={xUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => onShareClick('twitter')}
        className={btn}
        aria-label="Share on X"
      >
        <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" aria-hidden="true">
          <path d="M18.9 2h3.3l-7.2 8.24L23.7 22h-6.63l-5.2-6.8L5.92 22H2.6l7.7-8.8L2.3 2h6.8l4.7 6.22L18.9 2zm-1.16 18h1.83L7.34 3.9H5.38L17.74 20z" />
        </svg>
        X
      </a>

      <button type="button" onClick={onCopy} className={btn} aria-label="Copy link">
        {copied ? (
          'Copied ✓'
        ) : (
          <>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <rect x="9" y="9" width="11" height="11" rx="2" />
              <path d="M5 15V5a2 2 0 012-2h10" />
            </svg>
            Copy link
          </>
        )}
      </button>

      {canNativeShare && (
        <button type="button" onClick={onNativeShare} className={btn} aria-label="Share">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" />
          </svg>
          Share
        </button>
      )}
    </div>
  );
}
