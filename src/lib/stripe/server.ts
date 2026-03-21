import Stripe from 'stripe';

const key = process.env.STRIPE_SECRET_KEY ?? '';
export const isTestMode = key.startsWith('your_');

export const stripe = isTestMode
  ? (null as unknown as Stripe)
  : new Stripe(key, { apiVersion: '2026-01-28.clover', typescript: true });

export async function createCheckoutSession({
  priceId,
  userId,
  userEmail,
}: {
  priceId: string;
  userId: string;
  userEmail: string;
}) {
  if (isTestMode) {
    return { id: 'test_skip', url: null } as unknown as Stripe.Checkout.Session;
  }
  return await stripe.checkout.sessions.create({
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
  if (isTestMode) {
    return { id: 'sub_test_skip' } as unknown as Stripe.Subscription;
  }
  return await stripe.subscriptions.create({
    customer: customerId,
    items: [{ price: priceId }],
    payment_behavior: 'default_incomplete',
    expand: ['latest_invoice.payment_intent'],
  });
}
