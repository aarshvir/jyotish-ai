export type ConfirmedPaymentStatus = 'paid' | 'promo';

export function isConfirmedPaymentStatus(value: unknown): value is ConfirmedPaymentStatus {
  return value === 'paid' || value === 'promo';
}
