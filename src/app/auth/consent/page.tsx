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
      <div
        style={{
          minHeight: '100vh',
          background: '#0a0a1a',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ color: '#d4af37', fontFamily: 'system-ui' }}>Loading...</div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0a0a1a 0%, #0d0d2b 50%, #0a0a1a 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        fontFamily: 'system-ui',
      }}
    >
      <div
        style={{
          maxWidth: '480px',
          width: '100%',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(212,175,55,0.2)',
          borderRadius: '16px',
          padding: '40px 36px',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ fontSize: '28px', marginBottom: '8px' }}>✦</div>
          <h1
            style={{
              fontSize: '22px',
              fontWeight: '400',
              color: '#e8e0d0',
              fontFamily: 'Georgia, serif',
              marginBottom: '6px',
            }}
          >
            Before You Begin
          </h1>
          <p style={{ fontSize: '13px', color: '#6b6350' }}>Signed in as {userEmail}</p>
        </div>

        <div
          style={{
            background: 'rgba(212,175,55,0.05)',
            border: '1px solid rgba(212,175,55,0.15)',
            borderRadius: '10px',
            padding: '20px',
            marginBottom: '24px',
          }}
        >
          <p style={{ fontSize: '13px', color: '#a09880', lineHeight: 1.8, margin: 0 }}>
            VedicHour reports are for{' '}
            <strong style={{ color: '#d4af37' }}>entertainment and self-reflection only</strong> — not
            professional advice. Please read and agree to:
          </p>
          <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[
              { label: 'Terms of Service', href: '/terms' },
              { label: 'Privacy Policy', href: '/privacy' },
              { label: 'Refund Policy', href: '/refund' },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                target="_blank"
                style={{ fontSize: '13px', color: '#d4af37', textDecoration: 'none' }}
              >
                → {item.label}
              </Link>
            ))}
          </div>
        </div>

        <label
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            cursor: 'pointer',
            marginBottom: '24px',
          }}
        >
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            style={{
              width: '18px',
              height: '18px',
              accentColor: '#d4af37',
              marginTop: '2px',
              flexShrink: 0,
              cursor: 'pointer',
            }}
          />
          <span style={{ fontSize: '14px', color: '#a09880', lineHeight: 1.6 }}>
            I agree to the Terms of Service, Privacy Policy, and Refund Policy. I understand reports
            are for entertainment purposes only.
          </span>
        </label>

        <button
          type="button"
          onClick={() => void handleConsent()}
          disabled={!checked || submitting}
          style={{
            width: '100%',
            padding: '14px',
            background: checked ? 'linear-gradient(135deg, #d4af37, #b8962e)' : 'rgba(255,255,255,0.06)',
            color: checked ? '#0a0a1a' : '#6b6350',
            border: 'none',
            borderRadius: '8px',
            fontSize: '15px',
            fontWeight: '600',
            cursor: checked ? 'pointer' : 'not-allowed',
          }}
        >
          {submitting ? 'Saving...' : 'Continue to VedicHour →'}
        </button>

        <p style={{ fontSize: '11px', color: '#4a4435', textAlign: 'center', marginTop: '14px' }}>
          Acceptance recorded with timestamp · Version {TERMS_VERSION}
        </p>
      </div>
    </div>
  );
}
