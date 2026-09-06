import { createServiceClient } from '@/lib/supabase/admin';

/**
 * Region-aware pricing, read from the `pricing_config` table at request time.
 *
 * Prices deliberately do NOT live in code. ZIINA_PLANS being compiled in is the
 * reason the price point could never be tested, and price is the single largest
 * untested variable in this business. Anything here can be changed with one SQL
 * update and no deploy.
 */

export type Region = 'IN' | 'US' | 'GB' | 'EU' | 'AE';
export type Sku = 'pass' | 'light' | 'premium';

export interface Price {
  sku: Sku;
  region: Region;
  currency: string;
  amountMinor: number;
  interval: 'once' | 'month' | 'year';
  intervalDays: number | null;
  displayName: string;
  tagline: string | null;
  badge: string | null;
  isDefault: boolean;
  sortOrder: number;
  /** Pre-formatted for display, e.g. "₹299" — always render this, never do math in the view. */
  display: string;
}

const EUROZONE = new Set([
  'AT','BE','HR','CY','EE','FI','FR','DE','GR','IE','IT','LV','LT','LU','MT','NL','PT','SK','SI','ES',
]);
const GULF = new Set(['AE', 'SA', 'QA', 'KW', 'OM', 'BH']);

/**
 * Resolve a billing region from request signals.
 *
 * Vercel supplies `x-vercel-ip-country`; Cloudflare supplies `cf-ipcountry`.
 * We fall back to Accept-Language so a first-time visitor behind a proxy still
 * gets something sane, and finally to IN (the primary market).
 */
export function resolveRegion(headers: Headers): Region {
  const country = (
    headers.get('x-vercel-ip-country') ??
    headers.get('cf-ipcountry') ??
    ''
  ).toUpperCase();

  if (country === 'IN') return 'IN';
  if (country === 'GB') return 'GB';
  if (GULF.has(country)) return 'AE';
  if (EUROZONE.has(country)) return 'EU';
  if (country) return 'US'; // any other identified country -> USD ladder

  const lang = (headers.get('accept-language') ?? '').toLowerCase();
  if (lang.includes('-in') || lang.startsWith('hi')) return 'IN';
  if (lang.includes('-gb')) return 'GB';
  return 'IN'; // primary market when we genuinely cannot tell
}

const SYMBOL: Record<string, string> = {
  INR: '₹', USD: '$', GBP: '£', EUR: '€', AED: 'AED ',
};

/** Format minor units for display. Whole amounts drop the decimals (₹299, not ₹299.00). */
export function formatPrice(amountMinor: number, currency: string): string {
  const major = amountMinor / 100;
  const symbol = SYMBOL[currency] ?? `${currency} `;
  const body =
    Number.isInteger(major)
      ? major.toLocaleString(currency === 'INR' ? 'en-IN' : 'en-US')
      : major.toFixed(2);
  return `${symbol}${body}`;
}

interface Row {
  sku: string; region: string; currency: string; amount_minor: number;
  interval: string; interval_days: number | null; display_name: string;
  tagline: string | null; badge: string | null; is_default: boolean; sort_order: number;
}

function toPrice(r: Row): Price {
  return {
    sku: r.sku as Sku,
    region: r.region as Region,
    currency: r.currency,
    amountMinor: r.amount_minor,
    interval: r.interval as Price['interval'],
    intervalDays: r.interval_days,
    displayName: r.display_name,
    tagline: r.tagline,
    badge: r.badge,
    isDefault: r.is_default,
    sortOrder: r.sort_order,
    display: formatPrice(r.amount_minor, r.currency),
  };
}

/**
 * The full active ladder for a region, cheapest-first by sort_order.
 * Falls back to the IN ladder if a region has no rows configured yet, so adding
 * a new market can never render an empty paywall.
 */
export async function getPriceLadder(region: Region): Promise<Price[]> {
  const db = createServiceClient();
  const { data, error } = await db
    .from('pricing_config')
    .select('sku, region, currency, amount_minor, interval, interval_days, display_name, tagline, badge, is_default, sort_order')
    .eq('region', region)
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('[pricing] lookup failed:', error.message);
    return [];
  }
  if (data && data.length > 0) return (data as Row[]).map(toPrice);
  if (region !== 'IN') return getPriceLadder('IN');
  return [];
}

/** One SKU for a region — used by checkout to price an order server-side. */
export async function getPrice(sku: Sku, region: Region): Promise<Price | null> {
  const ladder = await getPriceLadder(region);
  return ladder.find((p) => p.sku === sku) ?? null;
}
