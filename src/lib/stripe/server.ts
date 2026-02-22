import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-01-28.clover',
  typescript: true,
});

export async function createCheckoutSession({
  priceId,
  userId,
  userEmail,
}: {
  priceId: string;
  userId: string;
  userEmail: string;
}) {
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
  return await stripe.subscriptions.create({
    customer: customerId,
    items: [{ price: priceId }],
    payment_behavior: 'default_incomplete',
    expand: ['latest_invoice.payment_intent'],
  });
}
