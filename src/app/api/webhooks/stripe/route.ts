import { NextRequest, NextResponse } from 'next/server';
import { getStripeClient, isTestMode } from '@/lib/stripe/server';
import { createServiceClient } from '@/lib/supabase/admin';
import Stripe from 'stripe';

export async function POST(request: NextRequest) {
  if (isTestMode()) {
    return NextResponse.json({ received: true });
  }
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json(
      { error: 'No signature' },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = getStripeClient().webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const { error } = await supabase.from('payments').insert({
        user_id: session.metadata?.userId,
        stripe_session_id: session.id,
        amount: session.amount_total,
        currency: session.currency,
        status: 'completed',
      });
      if (error) console.error('[stripe/webhook] payments insert failed:', error.message);
      break;
    }

    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription;
      const periodStart = (subscription as unknown as { current_period_start: number }).current_period_start;
      const periodEnd = (subscription as unknown as { current_period_end: number }).current_period_end;
      const { error } = await supabase.from('subscriptions').upsert({
        stripe_subscription_id: subscription.id,
        stripe_customer_id: subscription.customer as string,
        status: subscription.status,
        current_period_start: new Date(periodStart * 1000).toISOString(),
        current_period_end: new Date(periodEnd * 1000).toISOString(),
      });
      if (error) console.error('[stripe/webhook] subscriptions upsert failed:', error.message);
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      const { error } = await supabase
        .from('subscriptions')
        .update({ status: 'canceled' })
        .eq('stripe_subscription_id', subscription.id);
      if (error) console.error('[stripe/webhook] subscriptions cancel failed:', error.message);
      break;
    }
  }

  return NextResponse.json({ received: true });
}
