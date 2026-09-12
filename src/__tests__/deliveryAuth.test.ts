import { describe, it, expect, vi } from 'vitest';
import { createOrSignIn, type DeliveryAuthClient } from '@/lib/onboard/deliveryAuth';

type Err = { message: string } | null;

function fakeAuth(signUpErr: Err, signInErr: Err) {
  const signUp = vi.fn<DeliveryAuthClient['signUp']>(async () => ({ error: signUpErr }));
  const signInWithPassword = vi.fn<DeliveryAuthClient['signInWithPassword']>(async () => ({ error: signInErr }));
  return { client: { signUp, signInWithPassword } satisfies DeliveryAuthClient, signUp, signInWithPassword };
}

describe('createOrSignIn — the onboarding delivery gate', () => {
  it('creates an account for a new email and signs straight in', async () => {
    const f = fakeAuth(null, null);
    await expect(createOrSignIn(f.client, 'new@example.com', 'secret123')).resolves.toEqual({ ok: true, created: true });
    expect(f.signUp).toHaveBeenCalledOnce();
    expect(f.signInWithPassword).toHaveBeenCalledOnce();
  });

  it('signs in a returning visitor who types their real password', async () => {
    const f = fakeAuth({ message: 'User already registered' }, null);
    await expect(createOrSignIn(f.client, 'me@example.com', 'rightpass')).resolves.toEqual({ ok: true, created: false });
  });

  it('NEVER grants a session for an existing email with the wrong password (no account takeover)', async () => {
    const f = fakeAuth({ message: 'User already registered' }, { message: 'Invalid login credentials' });
    const r = await createOrSignIn(f.client, 'victim@example.com', 'guessed-it');
    expect(r.ok).toBe(false);
    expect(r).toMatchObject({ reason: 'existing_account' });
  });

  it('treats invalid credentials after a "successful" signUp as an existing account (enumeration protection)', async () => {
    // With email-enumeration protection Supabase reports signUp success for a taken address.
    const f = fakeAuth(null, { message: 'Invalid login credentials' });
    await expect(createOrSignIn(f.client, 'taken@example.com', 'wrongpass')).resolves.toMatchObject({
      ok: false,
      reason: 'existing_account',
    });
  });

  it('reports a pending confirmation as guidance, not a failure', async () => {
    const f = fakeAuth(null, { message: 'Email not confirmed' });
    await expect(createOrSignIn(f.client, 'new@example.com', 'secret123')).resolves.toMatchObject({
      ok: false,
      reason: 'confirm_email',
    });
  });

  it('rejects a malformed email without calling Supabase', async () => {
    const f = fakeAuth(null, null);
    await expect(createOrSignIn(f.client, 'not-an-email', 'secret123')).resolves.toMatchObject({ reason: 'invalid_input' });
    expect(f.signUp).not.toHaveBeenCalled();
  });

  it('rejects a short password without calling Supabase', async () => {
    const f = fakeAuth(null, null);
    await expect(createOrSignIn(f.client, 'ok@example.com', '123')).resolves.toMatchObject({ reason: 'invalid_input' });
    expect(f.signUp).not.toHaveBeenCalled();
  });

  it('normalises the email before both calls', async () => {
    const f = fakeAuth(null, null);
    await createOrSignIn(f.client, '  Mixed.Case@Example.COM ', 'secret123');
    expect(f.signUp.mock.calls[0][0].email).toBe('mixed.case@example.com');
    expect(f.signInWithPassword.mock.calls[0][0].email).toBe('mixed.case@example.com');
  });

  it('surfaces an unexpected signUp failure without attempting sign-in', async () => {
    const f = fakeAuth({ message: 'rate limit exceeded' }, null);
    await expect(createOrSignIn(f.client, 'a@example.com', 'secret123')).resolves.toMatchObject({ ok: false, reason: 'error' });
    expect(f.signInWithPassword).not.toHaveBeenCalled();
  });
});
