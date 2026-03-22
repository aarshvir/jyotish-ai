import Stripe from 'stripe';

function stripeSecretKey(): string {
  return process.env.STRIPE_SECRET_KEY ?? '';
}

/** True when key is missing or still a placeholder (e.g. Vercel build without Stripe). */
export function isTestMode(): boolean {
  const key = stripeSecretKey();
  return !key || key.startsWith('your_');
}

let stripeSingleton: Stripe | null = null;

/** Lazy Stripe client — never instantiate at module load (avoids Vercel build failures). */
export function getStripeClient(): Stripe {
  const key = stripeSecretKey();
  if (!key || key.startsWith('your_')) {
    throw new Error('Stripe not configured');
  }
  if (!stripeSingleton) {
    stripeSingleton = new Stripe(key, {
      apiVersion: '2026-01-28.clover',
      typescript: true,
    });
  }
  return stripeSingleton;
}

export async function createCheckoutSession({
  priceId,
  userId,
  userEmail,
  planType,
}: {
  priceId: string;
  userId: string;
  userEmail: string;
  /** Mirrors onboard/report query param; stored on the session for webhooks. */
  planType?: string;
}) {
  if (isTestMode()) {
    return { id: 'test_skip', url: null } as unknown as Stripe.Checkout.Session;
  }
  return await getStripeClient().checkout.sessions.create({
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    mode: 'payment',
    success_url: `${process.env.NEXT_PUBLIC_URL}/dashboard?success=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_URL}/dashboard?canceled=true`,
    customer_email: userEmail,
    metadata: {
      userId,
      ...(planType ? { plan_type: planType } : {}),
    },
  });
}

export async function createSubscription({
  priceId,
  customerId,
}: {
  priceId: string;
  customerId: string;
}) {
  if (isTestMode()) {
    return { id: 'sub_test_skip' } as unknown as Stripe.Subscription;
  }
  return await getStripeClient().subscriptions.create({
    customer: customerId,
    items: [{ price: priceId }],
    payment_behavior: 'default_incomplete',
    expand: ['latest_invoice.payment_intent'],
  });
}
