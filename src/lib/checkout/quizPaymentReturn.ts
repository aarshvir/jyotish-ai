/**
 * Banner copy when Ziina sends the buyer back to the quiz paywall.
 * Kept out of the client component so the payment=error wording can be tested:
 * that status is used when Ziina completed and grant/finalize then failed, so
 * "nothing was charged" is a lie that pushed a second checkout.
 */

const CONFIRMING =
  'Your payment is still being confirmed. Keep this page open — it takes you to your forecast the moment Ziina confirms. You will not be charged twice.';

const NOT_CHARGED =
  'The payment did not go through, and nothing was charged. You can try again below.';

export function quizPaymentReturnBanner(payment: string | null | undefined): string | null {
  if (!payment) return null;
  if (payment === 'pending' || payment === 'error') return CONFIRMING;
  return NOT_CHARGED;
}
