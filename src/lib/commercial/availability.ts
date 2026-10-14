export const COMMERCIAL_UNAVAILABLE_MESSAGE =
  'New paid readings are currently unavailable. The free calculators and example reading remain available, and you can still open reports already in your account.';

/** Explicit release attestation; provider credentials alone do not authorize sales. */
export function isCommercialCheckoutEnabled(): boolean {
  return process.env.COMMERCIAL_CHECKOUT_ENABLED?.trim() === 'true';
}

export function commercialAvailability() {
  const checkoutEnabled = isCommercialCheckoutEnabled();
  return {
    checkoutEnabled,
    status: checkoutEnabled ? 'available' as const : 'unavailable' as const,
    message: checkoutEnabled ? 'New paid readings are available.' : COMMERCIAL_UNAVAILABLE_MESSAGE,
  };
}
