'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { User } from '@supabase/supabase-js';
import { TERMS_VERSION } from '@/lib/legal/termsVersion';

export default function ConsentPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    async function checkConsent() {
      const {
        data: { user: u },
      } = await supabase.auth.getUser();
      if (!u) {
        router.push('/login');
        return;
      }
      setUser(u);

      const { data: consent } = await supabase
        .from('user_consent')
        .select('id')
        .eq('user_id', u.id)
        .eq('terms_version', TERMS_VERSION)
        .maybeSingle();

      if (consent) {
        router.push('/dashboard');
        return;
      }
      setLoading(false);
    }
    void checkConsent();
  }, [router, supabase]);

  async function handleConsent() {
    if (!checked || !user) return;
    setSubmitting(true);

    const res = await fetch('/api/auth/consent', { method: 'POST' });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      console.error('Consent error:', body?.error ?? res.statusText);
      setSubmitting(false);
      return;
    }

    router.push('/dashboard');
    router.refresh();
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
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '28px', marginBottom: '8px' }}>✦</div>
          <h1
            style={{
              fontSize: '24px',
              fontWeight: '400',
              color: '#e8e0d0',
              fontFamily: 'Georgia, serif',
              marginBottom: '8px',
            }}
          >
            Before You Begin
          </h1>
          <p style={{ fontSize: '14px', color: '#6b6350', lineHeight: 1.6 }}>
            Please review and accept our terms to continue.
          </p>
        </div>

        <div
          style={{
            background: 'rgba(212,175,55,0.05)',
            border: '1px solid rgba(212,175,55,0.15)',
            borderRadius: '10px',
            padding: '20px',
            marginBottom: '28px',
          }}
        >
          <p style={{ fontSize: '13px', color: '#a09880', lineHeight: 1.8, margin: 0 }}>
            By continuing, you acknowledge that VedicHour reports are for{' '}
            <strong style={{ color: '#d4af37' }}>entertainment and self-reflection only</strong> — not
            professional advice. You have read and agree to our:
          </p>
          <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {[
              { label: 'Terms of Service', href: '/terms' },
              { label: 'Privacy Policy', href: '/privacy' },
              { label: 'Refund Policy', href: '/refund' },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontSize: '13px',
                  color: '#d4af37',
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>→</span> {item.label}
                <span style={{ fontSize: '10px', color: '#6b6350' }}>(opens in new tab)</span>
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
            marginBottom: '28px',
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
            I have read and agree to the Terms of Service, Privacy Policy, and Refund Policy. I
            understand these reports are for entertainment purposes only.
          </span>
        </label>

        <button
          type="button"
          onClick={() => void handleConsent()}
          disabled={!checked || submitting}
          style={{
            width: '100%',
            padding: '14px',
            background: checked
              ? 'linear-gradient(135deg, #d4af37, #b8962e)'
              : 'rgba(255,255,255,0.06)',
            color: checked ? '#0a0a1a' : '#6b6350',
            border: 'none',
            borderRadius: '8px',
            fontSize: '15px',
            fontWeight: '600',
            cursor: checked ? 'pointer' : 'not-allowed',
            transition: 'all 0.2s',
          }}
        >
          {submitting ? 'Saving...' : 'Continue to VedicHour →'}
        </button>

        <p
          style={{
            fontSize: '12px',
            color: '#4a4435',
            textAlign: 'center',
            marginTop: '16px',
            lineHeight: 1.5,
          }}
        >
          Your acceptance is recorded with timestamp for legal compliance. Version: {TERMS_VERSION}
        </p>
      </div>
    </div>
  );
}
