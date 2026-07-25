export type ConfirmedPaymentStatus = 'paid' | 'promo';

/** Only server-recorded payment states that authorize checkout recovery. */
export function confirmedPaymentStatus(value: unknown): ConfirmedPaymentStatus | null {
  return value === 'paid' || value === 'promo' ? value : null;
}

export function isPaymentConfirmed(value: unknown): value is ConfirmedPaymentStatus {
  return confirmedPaymentStatus(value) !== null;
}
