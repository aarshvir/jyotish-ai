'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';

// /sample-report is captured frame-by-frame by the ad renderer — a fixed
// floating button would sit over the report in every ad frame.
const HIDE_ON = ['/admin', '/login', '/signup', '/auth', '/sample-report'];

export function FeedbackWidget() {
  const pathname = usePathname() || '';
  const [open, setOpen] = useState(false);
  const [broughtBy, setBroughtBy] = useState('');
  const [rating, setRating] = useState(0);
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (HIDE_ON.some((p) => pathname.startsWith(p))) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, brought_by: broughtBy, rating: rating || undefined, email: email || undefined, path: pathname }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { setErr(j.error ?? 'Something went wrong.'); return; }
      setDone(true);
      // Mark feedback given so the report-generation waiting prompt auto-skips for this user.
      try { localStorage.setItem('vh_feedback_given', '1'); } catch { /* ignore */ }
    } catch {
      setErr('Network error.');
    } finally {
      setBusy(false);
    }
  }

  const inputCls = 'w-full rounded-md bg-cosmos border border-horizon px-3 py-2 text-star text-body-sm placeholder:text-dust/40 focus:border-amber/60 focus:outline-none';

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Give feedback"
          className="fixed bottom-5 right-5 z-[90] inline-flex items-center gap-2 rounded-full bg-amber text-space px-4 py-2.5 font-body text-body-sm font-medium shadow-glow-amber hover:bg-amber-light transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          Feedback
        </button>
      )}

      {open && (
        <div className="fixed bottom-5 right-5 z-[95] w-[min(92vw,22rem)] rounded-card border border-horizon/60 bg-space/95 backdrop-blur-md shadow-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display text-headline-sm text-star">Help us improve</h3>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="text-dust hover:text-star text-xl leading-none">×</button>
          </div>

          {done ? (
            <div className="py-6 text-center">
              <p className="font-display text-2xl text-amber mb-1">Thank you 🙏</p>
              <p className="font-body text-body-sm text-dust">Your feedback helps shape VedicHour.</p>
              <button type="button" onClick={() => setOpen(false)} className="btn-primary mt-4 px-5 py-2">Close</button>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-3">
              <label className="block font-body text-body-sm text-dust">
                What brought you here?
                <input className={inputCls} value={broughtBy} onChange={(e) => setBroughtBy(e.target.value)} placeholder="e.g. searching for kundli matching" />
              </label>

              <div>
                <span className="block font-body text-body-sm text-dust mb-1">How is your experience?</span>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} type="button" onClick={() => setRating(n)} aria-label={`${n} star`} className={`text-2xl leading-none transition-colors ${n <= rating ? 'text-amber' : 'text-dust/30 hover:text-amber/60'}`}>★</button>
                  ))}
                </div>
              </div>

              <label className="block font-body text-body-sm text-dust">
                What would make it better?
                <textarea className={`${inputCls} min-h-[80px] resize-y`} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Anything — confusing bits, missing features, what you loved…" />
              </label>

              <label className="block font-body text-body-sm text-dust">
                Email (optional, if you'd like a reply)
                <input className={inputCls} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
              </label>

              {err && <p className="text-caution text-body-sm">{err}</p>}
              <button type="submit" disabled={busy} className="btn-primary w-full py-2.5 disabled:opacity-50">{busy ? 'Sending…' : 'Send feedback'}</button>
            </form>
          )}
        </div>
      )}
    </>
  );
}
