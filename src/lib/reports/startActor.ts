import { isEntitledPaymentStatus } from '@/lib/reports/entitlement';

/**
 * Who a /api/reports/start write and pipeline run belong to.
 *
 * An admin opening another person's failed report is offered Try Again. That
 * request is still the admin's session, and the report page can only send a
 * client-writable payment status (`unpaid`). The restart has to keep writing
 * the existing row for its owner.
 */
export function reportWriteOwner(args: {
  actorId: string;
  actorIsAdmin: boolean;
  existingUserId: string | null | undefined;
}): { ownerId: string; actingForOwner: boolean } {
  const existing = (args.existingUserId ?? '').trim();
  const actingForOwner = args.actorIsAdmin && existing !== '' && existing !== args.actorId;
  return { ownerId: actingForOwner ? existing : args.actorId, actingForOwner };
}

/**
 * Admin sessions may name a payment status, but the report page always sends
 * `unpaid` (paid / promo / bypass are not client-writable). Accepting that
 * on a retry would strip a grant already stored on the row. Keep the stored
 * entitlement unless the admin explicitly asks for a different entitled status.
 */
export function resolveAdminRequestedPaymentStatus(
  existingStatus: string | null | undefined,
  requested: string,
): string {
  const next = requested.trim();
  if (isEntitledPaymentStatus(existingStatus) && !isEntitledPaymentStatus(next)) {
    return (existingStatus ?? '').trim();
  }
  return next;
}
