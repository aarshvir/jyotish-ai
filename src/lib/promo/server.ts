/**
 * Server-only promo code utilities that read from the `promo_codes` table.
 * Never import this in client components.
 */
import { createServiceClient } from '@/lib/supabase/admin';

interface PromoRow {
  id: string;
  code: string;
  discount_pct: number;
  max_uses: number | null;
  used_count: number;
  allowlist_emails: string[] | null;
  active: boolean;
  expires_at: string | null;
}

export interface PromoResult {
  valid: boolean;
  discountPct: number;
  codeId?: string;
  reason?: string;
}

/**
 * Look up a promo code from the DB and validate it.
 * Optionally pass the requesting email to enforce the allowlist.
 */
export async function getPromoDiscount(
  code: string,
  email?: string,
): Promise<PromoResult> {
  if (!code?.trim()) return { valid: false, discountPct: 0, reason: 'No code provided' };

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('promo_codes')
    .select('id, code, discount_pct, max_uses, used_count, allowlist_emails, active, expires_at')
    .eq('code', code.trim().toUpperCase())
    .single<PromoRow>();

  if (error || !data) return { valid: false, discountPct: 0, reason: 'Code not found' };
  if (!data.active) return { valid: false, discountPct: 0, reason: 'Code is no longer active' };

  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return { valid: false, discountPct: 0, reason: 'Code has expired' };
  }

  if (data.max_uses != null && data.used_count >= data.max_uses) {
    return { valid: false, discountPct: 0, reason: 'Code has reached its usage limit' };
  }

  if (data.allowlist_emails && data.allowlist_emails.length > 0) {
    if (!email) return { valid: false, discountPct: 0, reason: 'This code requires sign-in' };
    const allowed = data.allowlist_emails.map((e: string) => e.toLowerCase());
    if (!allowed.includes(email.trim().toLowerCase())) {
      return { valid: false, discountPct: 0, reason: 'This code is not available for your account' };
    }
  }

  return { valid: true, discountPct: data.discount_pct, codeId: data.id };
}

/** Increment used_count and record the redemption. Idempotent per order_id. */
export async function redeemPromoCode(
  codeId: string,
  userId: string,
  orderId?: string,
): Promise<void> {
  const supabase = createServiceClient();
  await Promise.all([
    supabase.rpc('increment_promo_used_count', { p_code_id: codeId }),
    supabase.from('promo_redemptions').insert({
      code_id: codeId,
      user_id: userId,
      order_id: orderId ?? null,
    }),
  ]);
}
