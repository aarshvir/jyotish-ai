'use client';

import type { DropoffContext } from '@/lib/analytics/events';

/**
 * Automatic offer/payment drop-off solicitation is disabled in this release.
 * Explicit feedback uses the dedicated feedback flow, not an analytics acknowledgement.
 */
export function canShowDropoff(_context: DropoffContext): boolean {
  void _context;
  return false;
}

export function DropoffPrompt(_props: { context: DropoffContext; slug?: string; onClose: () => void }) {
  void _props;
  return null;
}
