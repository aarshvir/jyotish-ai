/** Deterministic, collision-free short referral code derived from a user's UUID. */
export function referralCodeFor(uid: string): string {
  const hex = uid.replace(/[^0-9a-fA-F]/g, '').slice(0, 13) || '0';
  let n = 0;
  for (const ch of hex) n = (n * 16 + parseInt(ch, 16)) % Number.MAX_SAFE_INTEGER;
  return n.toString(36).toUpperCase().slice(0, 8).padStart(6, '0');
}
