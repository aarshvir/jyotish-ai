import { describe, expect, it } from 'vitest';
import { reportWriteOwner, resolveAdminRequestedPaymentStatus } from './startActor';

const CUSTOMER = '11111111-1111-4111-8111-111111111111';
const ADMIN = '22222222-2222-4222-8222-222222222222';

describe('reportWriteOwner', () => {
  it('keeps a customer report with that customer when an admin restarts it', () => {
    expect(reportWriteOwner({ actorId: ADMIN, actorIsAdmin: true, existingUserId: CUSTOMER })).toEqual({
      ownerId: CUSTOMER,
      actingForOwner: true,
    });
  });

  it('uses the signed-in account for their own report, including an admin', () => {
    expect(reportWriteOwner({ actorId: ADMIN, actorIsAdmin: true, existingUserId: ADMIN })).toEqual({
      ownerId: ADMIN,
      actingForOwner: false,
    });
    expect(reportWriteOwner({ actorId: CUSTOMER, actorIsAdmin: false, existingUserId: CUSTOMER })).toEqual({
      ownerId: CUSTOMER,
      actingForOwner: false,
    });
  });

  it('does not let a non-admin claim someone else\'s id', () => {
    expect(reportWriteOwner({ actorId: CUSTOMER, actorIsAdmin: false, existingUserId: ADMIN })).toEqual({
      ownerId: CUSTOMER,
      actingForOwner: false,
    });
  });

  it('starts a brand-new report for the signed-in account', () => {
    expect(reportWriteOwner({ actorId: CUSTOMER, actorIsAdmin: false, existingUserId: null })).toEqual({
      ownerId: CUSTOMER,
      actingForOwner: false,
    });
  });
});

describe('resolveAdminRequestedPaymentStatus', () => {
  it('keeps a stored grant when Try Again sends the only client-writable status', () => {
    expect(resolveAdminRequestedPaymentStatus('paid', 'unpaid')).toBe('paid');
    expect(resolveAdminRequestedPaymentStatus('promo', 'unpaid')).toBe('promo');
    expect(resolveAdminRequestedPaymentStatus('bypass', 'unpaid')).toBe('bypass');
  });

  it('still honors an explicit entitled status from an admin', () => {
    expect(resolveAdminRequestedPaymentStatus('paid', 'bypass')).toBe('bypass');
    expect(resolveAdminRequestedPaymentStatus('unpaid', 'bypass')).toBe('bypass');
  });

  it('leaves a non-entitled row on the status the admin asked for', () => {
    expect(resolveAdminRequestedPaymentStatus('unpaid', 'unpaid')).toBe('unpaid');
    expect(resolveAdminRequestedPaymentStatus(null, 'unpaid')).toBe('unpaid');
  });
});
