'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type Status = {
  campaign: string;
  readiness: Record<string, boolean>;
  canSend: boolean;
  audience: number;
  remaining: number;
  sent: number;
  failed: number;
  claimed: number;
  categories: Record<string, number>;
};
type Preview = { email: string; question: string; subject?: string; category?: string; html?: string; error?: string };
type Result = { email: string; status: 'sent' | 'failed' | 'skipped'; error?: string };

const CHECKS: { key: string; label: string; fix: string }[] = [
  { key: 'production', label: 'Running on the live site', fix: 'Open this page on www.vedichour.com, not a preview link.' },
  { key: 'resendConfigured', label: 'Email sending is switched on', fix: 'Add RESEND_API_KEY in Vercel → Settings → Environment Variables, then redeploy.' },
  { key: 'signingKeyConfigured', label: 'Email links can be signed', fix: 'Add UNSUBSCRIBE_SECRET in Vercel → Settings → Environment Variables, then redeploy.' },
  { key: 'anthropicConfigured', label: 'Readings can be written', fix: 'ANTHROPIC_API_KEY is missing in Vercel.' },
  { key: 'suppressionTable', label: 'Unsubscribes are recorded', fix: 'Run the SQL below in Supabase.' },
  { key: 'sendLogTable', label: 'Nobody can be emailed twice', fix: 'Run the SQL below in Supabase.' },
];

const CATEGORY_LABEL: Record<string, string> = {
  general: 'answered from their chart',
  medical: 'health — politely declined',
  third_party: 'about someone else — politely declined',
  mortality: 'lifespan — politely declined',
};

// Mirrors supabase/migrations/20260703_email_suppressions.sql + 20260912_winback_sends.sql.
const SQL = `-- 1. Unsubscribe list (without it, unsubscribe links cannot record anything)
CREATE TABLE IF NOT EXISTS public.email_suppressions (
  email      TEXT PRIMARY KEY,
  reason     TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.email_suppressions ENABLE ROW LEVEL SECURITY;

-- 2. Win-back send log (the lock that stops anyone being emailed twice)
CREATE TABLE IF NOT EXISTS public.winback_sends (
  email       TEXT NOT NULL,
  campaign    TEXT NOT NULL,
  report_id   UUID,
  category    TEXT,
  subject     TEXT,
  provider_id TEXT,
  status      TEXT NOT NULL DEFAULT 'claimed' CHECK (status IN ('claimed', 'sent', 'failed')),
  error       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (email, campaign)
);
ALTER TABLE public.winback_sends ENABLE ROW LEVEL SECURITY;`;

export default function WinbackPage() {
  const [status, setStatus] = useState<Status | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [previews, setPreviews] = useState<Preview[] | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [sending, setSending] = useState(false);
  const [log, setLog] = useState<Result[]>([]);
  const [copied, setCopied] = useState(false);
  const stopRef = useRef(false);

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/admin/winback', { cache: 'no-store' });
      const j = await r.json();
      if (!r.ok) setErr(j.error ?? 'Failed to load');
      else {
        setErr(null);
        setStatus(j);
      }
    } catch {
      setErr('Failed to load');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function preview() {
    setPreviewing(true);
    setPreviews(null);
    try {
      const r = await fetch('/api/admin/winback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'preview', limit: 3 }),
      });
      const j = await r.json();
      if (!r.ok) setErr(j.error ?? 'Preview failed');
      else setPreviews(j.previews);
    } finally {
      setPreviewing(false);
    }
  }

  async function sendAll() {
    if (!status) return;
    const ok = window.confirm(
      `This emails ${status.remaining} real people. It cannot be undone.\n\nSend now?`,
    );
    if (!ok) return;
    setSending(true);
    setLog([]);
    stopRef.current = false;
    try {
      for (let guard = 0; guard < 60 && !stopRef.current; guard++) {
        const r = await fetch('/api/admin/winback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode: 'send', limit: 3 }),
        });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) {
          setErr(j.missing ? `Not ready: ${j.missing.join(', ')}` : j.error ?? 'Send failed');
          break;
        }
        const results: Result[] = j.results ?? [];
        setLog((prev) => [...prev, ...results]);
        if (!results.length || j.remaining === 0) break;
      }
    } finally {
      setSending(false);
      await load();
    }
  }

  async function copySql() {
    try {
      await navigator.clipboard.writeText(SQL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked — the SQL is selectable below */
    }
  }

  if (err && !status) return <p className="text-caution">{err}</p>;
  if (!status) return <p className="text-dust">Loading…</p>;

  const needsSql = !status.readiness.suppressionTable || !status.readiness.sendLogTable;
  const sentNow = log.filter((l) => l.status === 'sent').length;
  const failedNow = log.filter((l) => l.status === 'failed');

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="font-display text-3xl text-star">Win-back email</h1>
        <p className="font-body text-body-md text-dust mt-1">
          People who asked a real question, never paid, and never came back. Each email quotes their question and
          states one real date from their own chart.
        </p>
      </div>

      {err && <p className="text-caution font-body text-body-sm">{err}</p>}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          ['On the list', status.audience],
          ['Still to email', status.remaining],
          ['Sent', status.sent],
          ['Failed', status.failed],
        ].map(([label, value]) => (
          <div key={label as string} className="card rounded-card p-5 border border-horizon/40">
            <div className="font-mono text-mono-sm text-dust/60 uppercase tracking-wider">{label}</div>
            <div className="font-display text-3xl mt-1 text-star">{value}</div>
          </div>
        ))}
      </div>

      <div className="card border border-horizon/40 rounded-card p-5">
        <h2 className="font-display text-lg text-star mb-3">Before it can send</h2>
        <ul className="space-y-2.5">
          {CHECKS.map((c) => {
            const ok = status.readiness[c.key];
            return (
              <li key={c.key} className="font-body text-body-md">
                <span className={ok ? 'text-success' : 'text-caution'}>{ok ? '✓' : '✗'}</span>{' '}
                <span className="text-star">{c.label}</span>
                {!ok && <div className="text-body-sm text-dust ml-5">{c.fix}</div>}
              </li>
            );
          })}
        </ul>
      </div>

      {needsSql && (
        <div className="card border border-caution/50 bg-caution/[0.06] rounded-card p-5">
          <div className="flex items-center justify-between gap-3 mb-2">
            <h2 className="font-display text-lg text-caution">Run this in Supabase → SQL Editor</h2>
            <button type="button" onClick={copySql} className="btn-primary px-4 py-2 text-body-sm">
              {copied ? 'Copied' : 'Copy SQL'}
            </button>
          </div>
          <pre className="font-mono text-mono-sm text-dust whitespace-pre-wrap overflow-x-auto">{SQL}</pre>
        </div>
      )}

      <div className="card border border-horizon/40 rounded-card p-5">
        <h2 className="font-display text-lg text-star mb-2">Who gets which email</h2>
        <ul className="font-body text-body-md text-dust space-y-1">
          {Object.entries(status.categories).map(([k, v]) => (
            <li key={k}>
              <span className="text-star">{v}</span> — {CATEGORY_LABEL[k] ?? k}
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={preview}
          disabled={previewing || sending}
          className="px-5 py-3 rounded-button border border-horizon text-star hover:border-amber/40 disabled:opacity-50"
        >
          {previewing ? 'Writing previews… (about a minute)' : 'Preview the next 3 emails'}
        </button>
        <button
          type="button"
          onClick={sendAll}
          disabled={!status.canSend || sending || status.remaining === 0}
          className="btn-primary px-6 py-3 disabled:opacity-40"
        >
          {sending ? `Sending… ${sentNow} sent` : `Send to ${status.remaining} people`}
        </button>
        {sending && (
          <button type="button" onClick={() => (stopRef.current = true)} className="px-5 py-3 text-caution">
            Stop after this batch
          </button>
        )}
      </div>
      {!status.canSend && (
        <p className="font-body text-body-sm text-dust">Sending unlocks when every check above is ticked.</p>
      )}

      {log.length > 0 && (
        <div className="card border border-horizon/40 rounded-card p-5">
          <h2 className="font-display text-lg text-star mb-2">
            This run: {sentNow} sent, {failedNow.length} failed
          </h2>
          {failedNow.length > 0 && (
            <ul className="font-body text-body-sm text-dust space-y-1">
              {failedNow.map((f) => (
                <li key={f.email}>
                  {f.email} — {f.error}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {previews && (
        <div className="space-y-6">
          {previews.map((p) => (
            <div key={p.email} className="card border border-horizon/40 rounded-card p-5">
              <div className="font-mono text-mono-sm text-dust/60 mb-1">
                {p.email} · {p.category ? CATEGORY_LABEL[p.category] ?? p.category : 'not sendable'}
              </div>
              <div className="font-body text-body-sm text-dust mb-2">They asked: “{p.question}”</div>
              {p.error ? (
                <p className="text-caution font-body text-body-sm">Would be skipped: {p.error}</p>
              ) : (
                <>
                  <div className="font-body text-body-md text-star mb-3">Subject: {p.subject}</div>
                  <iframe
                    title={`Preview for ${p.email}`}
                    srcDoc={p.html}
                    sandbox=""
                    className="w-full h-[900px] rounded-card bg-white"
                  />
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
