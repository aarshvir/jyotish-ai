'use client';

import { useEffect, useRef, useState } from 'react';
import { trackEvent } from '@/lib/analytics/client';
import type { DropoffContext, DropoffReason } from '@/lib/analytics/events';

/**
 * One-tap "what stopped you?" sheet. Shown when someone leaves the offer (exit
 * intent, Back, backing out of the payment hand-off, or returning from Ziina with
 * a cancelled payment). Rules it keeps:
 *  - never blocks: it sits at the bottom, the page stays usable, and "No thanks"
 *    is as large and as easy as any answer (no confirm-shaming, no guilt copy);
 *  - at most once per context and twice in total per browser session;
 *  - nothing is pre-selected and nothing is sent unless they tap an answer;
 *  - the free-text box asks people not to type personal details, and email
 *    addresses / phone numbers are scrubbed before storage anyway.
 */

const OPTIONS: Record<'offer' | 'payment', { value: DropoffReason; label: string }[]> = {
  offer: [
    { value: 'price', label: 'The price' },
    { value: 'trust', label: "I'm not sure I trust it yet" },
    { value: 'payment_method', label: 'I want to pay another way (UPI)' },
    { value: 'didnt_believe', label: "The reading didn't feel right" },
    { value: 'not_now', label: 'Not right now' },
    { value: 'other', label: 'Something else' },
  ],
  payment: [
    { value: 'payment_method', label: "My payment method wasn't there (UPI)" },
    { value: 'card_declined', label: 'My card or payment failed' },
    { value: 'trust', label: 'The payment page looked unfamiliar' },
    { value: 'price', label: 'The price' },
    { value: 'not_now', label: 'I changed my mind for now' },
    { value: 'other', label: 'Something else' },
  ],
};

const TITLES: Record<DropoffContext, string> = {
  paywall_exit: 'Before you go — what held you back?',
  paywall_back: 'What made you step back?',
  handoff_cancel: 'What stopped you from paying?',
  checkout_cancelled: 'What happened on the payment page?',
};

const SHOWN_KEY = 'vh_dropoff_shown_v1';
const MAX_PER_SESSION = 2;

function shownContexts(): string[] {
  try {
    const raw = sessionStorage.getItem(SHOWN_KEY);
    const v = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

/** Whether the prompt may be shown for this context (once per context, ≤2 per session). */
export function canShowDropoff(context: DropoffContext): boolean {
  const shown = shownContexts();
  return !shown.includes(context) && shown.length < MAX_PER_SESSION;
}

function markShown(context: DropoffContext) {
  try {
    sessionStorage.setItem(SHOWN_KEY, JSON.stringify([...shownContexts(), context]));
  } catch {
    /* ignore */
  }
}

export function DropoffPrompt({
  context,
  slug,
  onClose,
}: {
  context: DropoffContext;
  slug?: string;
  onClose: () => void;
}) {
  const [picked, setPicked] = useState<DropoffReason | null>(null);
  const [text, setText] = useState('');
  const [done, setDone] = useState(false);
  const options = OPTIONS[context === 'checkout_cancelled' || context === 'handoff_cancel' ? 'payment' : 'offer'];

  const viewSent = useRef(false);

  useEffect(() => {
    markShown(context);
    if (viewSent.current) return;
    viewSent.current = true;
    trackEvent('dropoff_prompt_view', { context }, { slug });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismiss();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!done) return;
    const t = setTimeout(onClose, 1600);
    return () => clearTimeout(t);
  }, [done, onClose]);

  function dismiss() {
    if (!done) trackEvent('dropoff_prompt_dismiss', { context }, { slug });
    onClose();
  }

  function send(reason: DropoffReason, freeText?: string) {
    // `force`: they chose to tell us, so it is sent even with tracking opted out.
    trackEvent('dropoff_reason', { context, reason, text: freeText }, { slug, force: true });
    setDone(true);
  }

  function pick(reason: DropoffReason) {
    if (reason === 'other') {
      setPicked('other');
      return;
    }
    send(reason);
  }

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="dropoff-title"
      className="fixed inset-x-0 bottom-0 z-[95] flex justify-center px-3 pb-3 sm:pb-6 pointer-events-none"
    >
      <div className="pointer-events-auto w-full max-w-md bg-cosmos border border-horizon rounded-card p-4 sm:p-5 shadow-2xl">
        {done ? (
          <p className="font-body text-body-md text-star py-2" role="status">
            Thank you. That genuinely helps us fix it.
          </p>
        ) : (
          <>
            <div className="flex items-start justify-between gap-3 mb-1">
              <h2 id="dropoff-title" className="font-body font-semibold text-star text-headline-sm">
                {TITLES[context]}
              </h2>
            </div>
            <p className="font-body text-body-sm text-dust mb-3">One tap, optional. It tells us what to fix.</p>

            {picked === 'other' ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  send('other', text);
                }}
              >
                <label htmlFor="dropoff-text" className="sr-only">
                  What stopped you?
                </label>
                <textarea
                  id="dropoff-text"
                  value={text}
                  onChange={(e) => setText(e.target.value.slice(0, 500))}
                  rows={3}
                  autoFocus
                  placeholder="In a few words. Please don't include personal details."
                  className="w-full rounded-card border border-horizon bg-space px-3 py-2 font-body text-body-md text-star placeholder:text-dust"
                />
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button type="button" onClick={dismiss} className="px-3 py-3 rounded-card border border-horizon font-body text-body-md text-dust-light">
                    No thanks
                  </button>
                  <button type="submit" className="btn-primary px-3 py-3 font-body text-body-md">
                    Send
                  </button>
                </div>
              </form>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-2">
                  {options.map((o) => (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => pick(o.value)}
                      className="w-full text-left px-3.5 py-2.5 rounded-card border border-horizon hover:border-amber/40 font-body text-body-md text-star"
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={dismiss}
                  className="mt-1 w-full px-3 py-2.5 rounded-card font-body text-body-md text-dust-light hover:text-star"
                >
                  No thanks
                </button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
