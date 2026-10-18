import type { SupabaseClient } from '@supabase/supabase-js';
import { grantSubscriptionPeriod, type SubscriptionGrantResult } from './grant';
import { isSubscriptionPlanType } from './period';

/**
 * Activate a subscription for a payment taken outside Ziina (UPI, bank transfer).
 *
 * The admin supplies the buyer's email, the plan, and the payment reference the bank
 * or UPI app shows. The reference becomes the idempotency key (`manual:<ref>`), so the
 * same payment can never be granted twice, and the period math is exactly the Ziina path.
 */

export type ManualPaymentInput = {
  email: string;
  planType: string;
  reference: string;
  amount: number;
  currency: string;
};

export type ManualPaymentResult =
  | { ok: true; userId: string; periodEnd: string; granted: boolean; intentId: string }
  | { ok: false; error: string };

export function manualIntentId(reference: string): string | null {
  const ref = reference.trim().replace(/\s+/g, '');
  if (!/^[A-Za-z0-9._-]{6,64}$/.test(ref)) return null;
  return `manual:${ref}`;
}

export function validateManualPayment(input: ManualPaymentInput): string | null {
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(input.email.trim())) return 'Enter the buyer’s email address.';
  if (!isSubscriptionPlanType(input.planType)) return 'Plan must be sub_monthly or sub_annual.';
  if (!manualIntentId(input.reference)) return 'Payment reference must be 6–64 letters or digits (the UPI / bank reference number).';
  if (!Number.isFinite(input.amount) || input.amount <= 0) return 'Enter the amount received.';
  if (!/^[A-Za-z]{3}$/.test(input.currency.trim())) return 'Currency must be a 3-letter code such as INR.';
  return null;
}

/** Find an auth user by email, paging through all users (a single page caps at 1000). */
export async function findUserIdByEmail(db: SupabaseClient, email: string): Promise<string | null> {
  const wanted = email.trim().toLowerCase();
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
    if (error || !data) return null;
    const hit = data.users.find((u) => (u.email ?? '').toLowerCase() === wanted);
    if (hit) return hit.id;
    if (data.users.length < 1000) return null;
  }
  return null;
}

export async function recordManualPayment(
  db: SupabaseClient,
  input: ManualPaymentInput,
  now: Date = new Date(),
): Promise<ManualPaymentResult> {
  const invalid = validateManualPayment(input);
  if (invalid) return { ok: false, error: invalid };

  const userId = await findUserIdByEmail(db, input.email);
  if (!userId) {
    return { ok: false, error: 'No account with that email. The buyer must sign up first (it takes 20 seconds at /start).' };
  }

  const intentId = manualIntentId(input.reference)!;
  const result: SubscriptionGrantResult = await grantSubscriptionPeriod(db, {
    intentId,
    userId,
    planType: input.planType,
    amount: input.amount,
    currency: input.currency.trim().toUpperCase(),
    now,
  });
  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true, userId, periodEnd: result.periodEnd, granted: result.granted, intentId };
}
