import Razorpay from 'razorpay';
import crypto from 'crypto';

// ── Plan configuration ──────────────────────────────────────────────────────
// Amounts in paise (1 INR = 100 paise)
export const RAZORPAY_PLANS: Record<string, { amount: number; currency: string; name: string }> = {
  '7day':    { amount: 79900,   currency: 'INR', name: 'VedicHour 7-Day Forecast' },
  'monthly': { amount: 149900,  currency: 'INR', name: 'VedicHour Monthly Oracle' },
  'annual':  { amount: 399900,  currency: 'INR', name: 'VedicHour Annual Oracle' },
};

/** True when Razorpay keys are missing or placeholder values. */
export function isTestMode(): boolean {
  const key = process.env.RAZORPAY_KEY_ID ?? '';
  return !key || key.startsWith('rzp_test_placeholder') || key === '';
}

let rzpSingleton: Razorpay | null = null;

export function getRazorpayClient(): Razorpay {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) throw new Error('Razorpay not configured');
  if (!rzpSingleton) {
    rzpSingleton = new Razorpay({ key_id: keyId, key_secret: keySecret });
  }
  return rzpSingleton;
}

export interface RazorpayOrderResult {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
}

export async function createOrder(planType: string, receiptId: string): Promise<RazorpayOrderResult> {
  const plan = RAZORPAY_PLANS[planType];
  if (!plan) throw new Error(`Unknown plan: ${planType}`);

  if (isTestMode()) {
    return {
      orderId: `test_order_${receiptId}`,
      amount: plan.amount,
      currency: plan.currency,
      keyId: 'test',
    };
  }

  const rzp = getRazorpayClient();
  const order = await rzp.orders.create({
    amount: plan.amount,
    currency: plan.currency,
    receipt: receiptId.slice(0, 40),
    notes: { plan_type: planType },
  });

  return {
    orderId: order.id,
    amount: plan.amount,
    currency: plan.currency,
    keyId: process.env.RAZORPAY_KEY_ID!,
  };
}

export function verifyPaymentSignature(
  orderId: string,
  paymentId: string,
  signature: string,
): boolean {
  if (isTestMode()) return true;
  const secret = process.env.RAZORPAY_KEY_SECRET!;
  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
  return expected === signature;
}
