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

const baseCheckoutUrls = () => ({
  success_url: `${process.env.NEXT_PUBLIC_URL}/dashboard?success=true`,
  cancel_url: `${process.env.NEXT_PUBLIC_URL}/dashboard?canceled=true`,
});

export async function createCheckoutSession({
  priceId,
  userId,
  userEmail,
  planType,
  promoPercent,
  promoCode,
}: {
  priceId: string;
  userId: string;
  userEmail: string;
  /** Mirrors onboard/report query param; stored on the session for webhooks. */
  planType?: string;
  /** Applied by creating a one-time line item from the Price unit amount (1–99). */
  promoPercent?: number;
  promoCode?: string;
}) {
  if (isTestMode()) {
    return { id: 'test_skip', url: null } as unknown as Stripe.Checkout.Session;
  }
  const stripe = getStripeClient();
  const urls = baseCheckoutUrls();
  const meta: Record<string, string> = {
    userId,
    ...(planType ? { plan_type: planType } : {}),
    ...(promoCode ? { promo_code: promoCode } : {}),
    ...(promoPercent != null && promoPercent > 0
      ? { promo_percent: String(promoPercent) }
      : {}),
  };

  if (promoPercent != null && promoPercent > 0 && promoPercent < 100) {
    const price = await stripe.prices.retrieve(priceId);
    const unit = price.unit_amount;
    if (unit == null) {
      throw new Error('Price has no unit_amount; cannot apply promo discount');
    }
    const discounted = Math.max(50, Math.round((unit * (100 - promoPercent)) / 100));
    return await stripe.checkout.sessions.create({
      line_items: [
        {
          price_data: {
            currency: price.currency,
            unit_amount: discounted,
            product_data: {
              name: 'VedicHour report',
            },
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      ...urls,
      customer_email: userEmail,
      metadata: meta,
    });
  }

  return await stripe.checkout.sessions.create({
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    mode: 'payment',
    ...urls,
    customer_email: userEmail,
    metadata: meta,
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
