import { describe, expect, it } from 'vitest';
import { humanizeAuthError } from '@/lib/auth/humanizeAuthError';

describe('actionable authentication errors', () => {
  it.each([null, undefined, '', '  '])('leaves absent errors empty', raw => expect(humanizeAuthError(raw)).toBe(''));
  it.each([
    ['Invalid login credentials', 'Forgot password'],
    ['Email not confirmed', 'confirmation link'],
    ['User already registered', 'signing in instead'],
    ['Token expired', 'latest email link'],
    ['otp_expired', 'latest email link'],
    ['Too many requests', 'Wait before'],
    ['over_email_send_rate_limit', 'Wait before'],
    ['Invalid Refresh Token: Refresh Token Not Found', 'same account'],
    ['Failed to fetch', 'internet connection'],
    ['Network request failed', 'internet connection'],
    ['Request timed out', 'took too long'],
    ['New password should be different from the old password', 'different from your current'],
    ['Password should be at least 6 characters', 'at least 6 characters'],
    ['weak_password', 'stronger password'],
    ['Invalid email address', 'valid email address'],
    ['Signups not allowed', 'Account creation is currently unavailable'],
    ['OAuth provider disabled', 'original sign-in method'],
  ])('gives relevant recovery for %s', (raw, expected) => expect(humanizeAuthError(raw)).toContain(expected));
  it('does not expose arbitrary server details or falsely classify every password error', () => {
    const raw = 'Database password lookup failed for internal-table-name at secret-host';
    expect(humanizeAuthError(raw)).not.toContain('internal-table-name');
    expect(humanizeAuthError(raw)).not.toContain('at least 6');
    expect(humanizeAuthError(raw)).toContain('sign-in help');
  });
  it('does not promise a fabricated retry time', () => {
    expect(humanizeAuthError('Rate limit exceeded')).not.toMatch(/minute|seconds|60/);
  });
});
