'use client';

/**
 * CurrencySwitcher — user-facing currency picker.
 *
 * Geo-based auto-currency already runs in middleware (forwards x-currency).
 * This component is the manual override: user picks USD/INR/AED and we persist
 * to localStorage + cookie so subsequent page loads honour it.
 *
 * Cookie name: `vh_currency` (1-year max-age). Read by server components via
 * the standard `cookies()` API in a future server-side pass.
 *
 * Visual: small pill-style segmented control. Three options, sub-second tap
 * affordance, keyboard-navigable. Lives in landing pricing header and in
 * dashboard settings (different sizes).
 */

import { useEffect, useState, useCallback } from 'react';

export type Currency = 'USD' | 'INR' | 'AED';

interface CurrencySwitcherProps {
  /** Initial value (typically from server-side header detection) */
  initial?: Currency;
  /** Visual size: 'sm' for inline use, 'md' for settings panels */
  size?: 'sm' | 'md';
  /** Called when the user picks a different currency */
  onChange?: (currency: Currency) => void;
  /** Override className for outer container */
  className?: string;
}

const CURRENCIES: ReadonlyArray<{ code: Currency; symbol: string; label: string }> = [
  { code: 'USD', symbol: '$', label: 'USD' },
  { code: 'INR', symbol: '₹', label: 'INR' },
  { code: 'AED', symbol: 'د.إ', label: 'AED' },
];

const STORAGE_KEY = 'vh_currency';
const COOKIE_NAME = 'vh_currency';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

function persistCurrency(c: Currency) {
  try {
    localStorage.setItem(STORAGE_KEY, c);
    document.cookie = `${COOKIE_NAME}=${c}; max-age=${COOKIE_MAX_AGE}; path=/; SameSite=Lax`;
  } catch {
    /* private mode — ignore */
  }
}

function readStoredCurrency(): Currency | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'USD' || v === 'INR' || v === 'AED') return v;
  } catch {
    /* ignore */
  }
  return null;
}

export default function CurrencySwitcher({
  initial = 'USD',
  size = 'sm',
  onChange,
  className = '',
}: CurrencySwitcherProps) {
  const [current, setCurrent] = useState<Currency>(initial);

  // Hydrate from localStorage on mount (client-side override of server-detected currency)
  useEffect(() => {
    const stored = readStoredCurrency();
    if (stored) {
      persistCurrency(stored);
      if (stored !== current) setCurrent(stored);
      onChange?.(stored);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePick = useCallback(
    (c: Currency) => {
      if (c === current) return;
      setCurrent(c);
      persistCurrency(c);
      onChange?.(c);
    },
    [current, onChange]
  );

  const padding = size === 'md' ? 'px-4 py-2 text-sm' : 'px-3 py-1.5 text-xs';

  return (
    <div
      role="radiogroup"
      aria-label="Currency"
      className={`inline-flex items-center gap-0.5 p-0.5 rounded-pill bg-bg-3 border border-horizon/30 ${className}`}
    >
      {CURRENCIES.map((c) => {
        const active = c.code === current;
        return (
          <button
            key={c.code}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => handlePick(c.code)}
            className={`inline-flex items-center gap-1 ${padding} rounded-pill font-mono tracking-wider transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber ${
              active
                ? 'bg-amber text-space font-semibold shadow-glow-amber'
                : 'text-dust/70 hover:text-star'
            }`}
          >
            <span aria-hidden className="opacity-80">{c.symbol}</span>
            <span>{c.label}</span>
          </button>
        );
      })}
    </div>
  );
}
