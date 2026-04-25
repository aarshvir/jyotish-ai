'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

const TERMS_VERSION = '2026-03-22';

export default function ConsentPage() {
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    async function check() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }
      setUserEmail(user.email || '');

      const { data, error: consentErr } = await supabase
        .from('user_consent')
        .select('id')
        .eq('user_id', user.id)
        .eq('terms_version', TERMS_VERSION)
        .maybeSingle();

      // If the table doesn't exist yet (42P01 = undefined_table), skip consent gate.
      if (consentErr && (consentErr.code === '42P01' || consentErr.message?.includes('does not exist'))) {
        router.push('/dashboard');
        return;
      }

      if (data) {
        router.push('/dashboard');
        return;
      }
      setLoading(false);
    }
    void check();
  }, [router]);

  async function handleConsent() {
    if (!checked) return;
    setSubmitting(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }

    const { error } = await supabase.from('user_consent').insert({
      user_id: user.id,
      user_email: user.email ?? '',
      terms_version: TERMS_VERSION,
      explicitly_checked: true,
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
    });

    // 23505 = unique violation (already consented), 42P01 = table missing — both are fine to ignore.
    if (error && error.code !== '23505' && error.code !== '42P01' && !error.message?.includes('does not exist')) {
      console.error('user_consent insert:', error.message);
    }

    router.push('/dashboard');
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-space flex items-center justify-center">
        <p className="text-amber font-mono text-sm">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-space via-cosmos to-space flex items-center justify-center p-6">
      <div className="w-full max-w-[480px] bg-white/[0.03] border border-amber/20 rounded-2xl px-8 sm:px-10 py-10">
        {/* Header */}
        <div className="text-center mb-7">
          <div className="text-2xl text-amber/60 mb-2">✦</div>
          <h1 className="text-xl font-light text-star font-display mb-1.5">Before You Begin</h1>
          <p className="text-xs text-dust/50 font-mono">Signed in as {userEmail}</p>
        </div>

        {/* Info box */}
        <div className="bg-amber/[0.05] border border-amber/15 rounded-xl px-5 py-5 mb-6">
          <p className="text-sm text-dust/70 font-sans leading-relaxed">
            VedicHour reports are for{' '}
            <strong className="text-amber font-semibold">entertainment and self-reflection only</strong> — not
            professional advice. Please read and agree to:
          </p>
          <div className="mt-3 flex flex-col gap-2">
            {[
              { label: 'Terms of Service', href: '/terms' },
              { label: 'Privacy Policy', href: '/privacy' },
              { label: 'Refund Policy', href: '/refund' },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                target="_blank"
                className="text-sm text-amber no-underline hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber/60 rounded-sm"
              >
                → {item.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Checkbox */}
        <label className="flex items-start gap-3 cursor-pointer mb-6">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            className="w-[18px] h-[18px] mt-0.5 shrink-0 cursor-pointer accent-amber"
          />
          <span className="text-sm text-dust/70 font-sans leading-relaxed">
            I agree to the Terms of Service, Privacy Policy, and Refund Policy. I understand reports
            are for entertainment purposes only.
          </span>
        </label>

        {/* Submit */}
        <button
          type="button"
          onClick={() => void handleConsent()}
          disabled={!checked || submitting}
          className={`w-full py-3.5 min-h-[48px] rounded-lg text-sm font-semibold font-mono transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber focus-visible:ring-offset-2 focus-visible:ring-offset-space ${
            checked
              ? 'bg-gradient-to-r from-amber to-amber/80 text-space cursor-pointer hover:opacity-90'
              : 'bg-white/[0.06] text-dust/40 cursor-not-allowed'
          }`}
        >
          {submitting ? 'Saving...' : 'Continue to VedicHour →'}
        </button>

        <p className="text-[11px] text-dust/30 font-mono text-center mt-4">
          Acceptance recorded with timestamp · Version {TERMS_VERSION}
        </p>
      </div>
    </div>
  );
}
