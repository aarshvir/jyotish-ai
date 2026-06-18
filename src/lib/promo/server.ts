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
  once_per_user: boolean | null;
}

export interface PromoResult {
  valid: boolean;
  discountPct: number;
  codeId?: string;
  /** When true, a user (by id) may redeem this code only once. ADMIN100 is false. */
  oncePerUser?: boolean;
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
    .select('id, code, discount_pct, max_uses, used_count, allowlist_emails, active, expires_at, once_per_user')
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

  return {
    valid: true,
    discountPct: data.discount_pct,
    codeId: data.id,
    oncePerUser: data.once_per_user !== false,
  };
}

/** True if this user has already redeemed this code (for once-per-user enforcement). */
export async function hasUserRedeemed(codeId: string, userId: string): Promise<boolean> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('promo_redemptions')
    .select('id')
    .eq('code_id', codeId)
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle();
  // Fail CLOSED: on a transient lookup error, throw so the caller returns a retryable
  // error instead of silently treating it as "not redeemed" and granting a second
  // once-per-user discount/free report.
  if (error) throw new Error(`promo redemption lookup failed: ${error.message}`);
  return Boolean(data);
}

/**
 * Record a promo redemption and bump used_count — atomically + idempotently per order_id.
 * Returns true when a NEW redemption was booked, false when it was a duplicate (no-op).
 * Prefers the `redeem_promo_code` RPC (insert-then-conditional-increment in one DB call);
 * falls back to the legacy non-atomic path only when that function isn't deployed yet.
 */
export async function redeemPromoCode(
  codeId: string,
  userId: string,
  orderId?: string,
): Promise<boolean> {
  const supabase = createServiceClient();

  if (orderId) {
    const { data, error } = await supabase.rpc('redeem_promo_code', {
      p_code_id: codeId,
      p_user_id: userId,
      p_order_id: orderId,
    });
    if (!error) return data === true;
    // Only fall back when the function isn't migrated yet; otherwise surface the error.
    const msg = error.message ?? '';
    if (!/function|does not exist|schema cache|could not find/i.test(msg)) {
      throw new Error(`redeem_promo_code: ${msg}`);
    }
  }

  // Legacy fallback (no order_id, or RPC not yet applied): best-effort, non-atomic.
  await Promise.all([
    supabase.rpc('increment_promo_used_count', { p_code_id: codeId }),
    supabase.from('promo_redemptions').insert({
      code_id: codeId,
      user_id: userId,
      order_id: orderId ?? null,
    }),
  ]);
  return true;
}
