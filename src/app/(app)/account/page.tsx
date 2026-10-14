'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Footer from '@/components/shared/Footer';
import { Download } from 'lucide-react';

export default function AccountPage() {
  const router = useRouter();
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ref, setRef] = useState<{ link: string; count: number } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch('/api/account/referral', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => j && setRef({ link: j.link, count: j.count }))
      .catch(() => {});
  }, []);

  function copyRef() {
    if (!ref) return;
    navigator.clipboard?.writeText(ref.link).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1800); }).catch(() => {});
  }

  async function downloadData() {
    if (busy || exporting) return;
    setErr(null); setExporting(true);
    try {
      const response = await fetch('/api/account/export', { credentials: 'include', cache: 'no-store', signal: AbortSignal.timeout(30_000) });
      if (!response.ok) {
        const result = await response.json().catch(() => ({})) as { error?: string };
        setErr(result.error ?? 'Your account export is unavailable. Please try again.');
        return;
      }
      const payload = await response.json() as { exported_at?: string; scope?: string };
      if (!payload.exported_at || !payload.scope) throw new Error('Invalid export');
      const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
      const link = document.createElement('a');
      link.href = url; link.download = 'vedichour-my-data.json'; link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
    } catch { setErr('Could not download the export. No account records were changed. Please try again.'); }
    finally { setExporting(false); }
  }

  async function deleteAccount() {
    if (busy || exporting || confirm !== 'DELETE') return;
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch('/api/account/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        signal: AbortSignal.timeout(30_000),
        body: JSON.stringify({ confirm: 'DELETE' }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setErr(d.error ?? 'Could not delete account.');
        setBusy(false);
        return;
      }
      try { await createClient().auth.signOut(); } catch { /* ignore */ }
      router.replace('/?deleted=1');
    } catch {
      setErr('Deletion status could not be confirmed. Some records may have been removed. Check account access or contact support@vedichour.com.');
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-space text-star flex flex-col">
      <div className="flex-1 max-w-2xl mx-auto px-5 sm:px-8 py-16 w-full">
        <h1 className="font-display text-3xl text-star mb-2">Your account &amp; privacy</h1>
        <p className="font-body text-body-md text-dust mb-10">Manage your personal data. VedicHour stores your birth details to compute your charts — you control them here.</p>

        {ref && (
          <section className="card border border-amber/30 rounded-card p-6 mb-6 bg-amber/[0.03]">
            <h2 className="font-display text-xl text-star mb-2">Refer friends</h2>
            <p className="font-body text-body-sm text-dust mb-4">Share your link. When friends sign up through it, you&apos;ll be credited.{ref.count > 0 ? ` You've referred ${ref.count} so far.` : ''}</p>
            <div className="flex flex-col sm:flex-row gap-2">
              <input readOnly value={ref.link} className="cosmic-input flex-1 font-mono text-mono-sm" onFocus={(e) => e.currentTarget.select()} />
              <button type="button" onClick={copyRef} className="btn-primary px-5 py-2.5 shrink-0">{copied ? 'Copied ✓' : 'Copy link'}</button>
            </div>
          </section>
        )}

        <section className="card border border-horizon/40 rounded-card p-6 mb-6">
          <h2 className="font-display text-xl text-star mb-2">Export your data</h2>
            <p className="font-body text-body-sm text-dust mb-4">Download the account collections listed in the export, including your profile, reports, charts and payment history. Separately saved quiz links and device drafts are not included.</p>
            <button type="button" disabled={exporting || busy} onClick={() => void downloadData()} className="btn-secondary inline-flex items-center gap-2 px-6 py-2.5 disabled:opacity-50"><Download size={18} aria-hidden />{exporting ? 'Preparing export...' : 'Download my account data'}</button>
            {err && <p role="alert" className="text-caution text-body-sm mt-3">{err}</p>}
        </section>

        <section className="card border border-error/30 rounded-card p-6 bg-error/[0.03]">
          <h2 className="font-display text-xl text-star mb-2">Delete your account</h2>
          <p className="font-body text-body-sm text-dust mb-4">
            This permanently deletes your sign-in and account-linked profile, reports and charts. Retained payment records are de-identified. Device drafts and separately saved quiz links require separate controls or a request to privacy@vedichour.com. Deletion cannot be undone; a failed attempt may already have removed some records.
          </p>
          <label className="block font-body text-body-sm text-dust mb-2">
            Type <strong className="text-star">DELETE</strong> to confirm:
            <input
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="cosmic-input mt-1"
              placeholder="DELETE"
              autoComplete="off"
            />
          </label>
          <button
            type="button"
              disabled={confirm !== 'DELETE' || busy || exporting}
            onClick={() => void deleteAccount()}
            className="mt-2 px-6 py-2.5 rounded-button bg-error/80 text-white font-body text-body-sm font-semibold disabled:opacity-40 hover:bg-error transition-colors"
          >
            {busy ? 'Deleting…' : 'Permanently delete my account'}
          </button>
        </section>
      </div>
      <Footer />
    </div>
  );
}
