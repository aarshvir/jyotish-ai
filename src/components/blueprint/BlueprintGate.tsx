'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useParams } from 'next/navigation';
import { MandalaRing } from '@/components/ui/MandalaRing';
import { BlueprintView } from './BlueprintView';
import type { BlueprintDoc } from '@/lib/blueprint/types';

/**
 * Sits in front of /report/{id}. If the report is a Karmic Blueprint it shows the Blueprint
 * (or its "being written" state); if not — or if the check fails for any reason — it renders
 * the normal forecast report untouched, so a hiccup here can never hide a paid forecast.
 */

type Phase =
  | { kind: 'checking' }
  | { kind: 'plain' }
  | { kind: 'blueprint'; status: 'pending' | 'generating' | 'error' | 'unpaid'; doc: null }
  | { kind: 'blueprint'; status: 'complete'; doc: BlueprintDoc };

const POLL_MS = 4000;
const GIVE_UP_MS = 12 * 60 * 1000;

export function BlueprintGate({ children }: { children: ReactNode }) {
  const params = useParams();
  const id = typeof params?.id === 'string' ? params.id : '';
  const [phase, setPhase] = useState<Phase>({ kind: 'checking' });
  const started = useRef(Date.now());
  const kicked = useRef(false);
  const [retrying, setRetrying] = useState(false);
  /** Bumped by "Try again" so the polling effect starts over. */
  const [nonce, setNonce] = useState(0);

  const check = useCallback(async (): Promise<Phase> => {
    try {
      const r = await fetch(`/api/blueprint/${id}`, { credentials: 'include', cache: 'no-store' });
      if (!r.ok) return { kind: 'plain' };
      const j = (await r.json()) as { isBlueprint?: boolean; status?: string; doc?: BlueprintDoc | null };
      if (!j.isBlueprint) return { kind: 'plain' };
      if (j.status === 'complete' && j.doc) return { kind: 'blueprint', status: 'complete', doc: j.doc };
      const s = j.status === 'error' || j.status === 'generating' || j.status === 'unpaid' ? j.status : 'pending';
      return { kind: 'blueprint', status: s, doc: null };
    } catch {
      return { kind: 'plain' };
    }
  }, [id]);

  useEffect(() => {
    if (!id) {
      setPhase({ kind: 'plain' });
      return;
    }
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const tick = async () => {
      const next = await check();
      if (cancelled) return;
      setPhase(next);
      if (next.kind !== 'blueprint') return;
      // A paid row that nobody has started (the payment hook never fired): ask once.
      if (next.status === 'pending' && !kicked.current) {
        kicked.current = true;
        void fetch(`/api/blueprint/${id}`, { method: 'POST', credentials: 'include' }).catch(() => {});
      }
      if ((next.status === 'pending' || next.status === 'generating') && Date.now() - started.current < GIVE_UP_MS) {
        timer = setTimeout(tick, POLL_MS);
      }
    };
    void tick();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [id, check, nonce]);

  if (phase.kind === 'plain') return <>{children}</>;

  if (phase.kind === 'checking') {
    // Same spinner the report page itself shows while it loads, so a normal report looks unchanged.
    return (
      <div className="flex min-h-screen items-center justify-center bg-space" aria-busy="true">
        <div className="h-16 w-16 animate-spin-slow text-amber">
          <MandalaRing className="h-full w-full" />
        </div>
      </div>
    );
  }

  if (phase.status === 'complete') {
    return (
      <BlueprintView
        doc={phase.doc}
        actions={
          <button type="button" onClick={() => window.print()} className="btn-secondary min-h-[2.75rem] px-4">
            Save as PDF
          </button>
        }
      />
    );
  }

  const failed = phase.status === 'error';
  return (
    <main className="flex min-h-screen items-center justify-center bg-space px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-display-md text-star">
          {phase.status === 'unpaid' ? 'This blueprint is not unlocked yet' : failed ? 'Your blueprint hit a snag' : 'Writing your blueprint'}
        </h1>
        <p className="mt-4 font-body text-body-lg leading-relaxed text-dust-light" role="status" aria-live="polite">
          {phase.status === 'unpaid'
            ? 'Once your payment is confirmed it will appear here.'
            : failed
              ? 'Something went wrong while it was being written. Nothing has been lost, and you can ask for it again.'
              : 'Your chart is calculated and the reading is being written around what you told us. This usually takes about a minute. You can keep this page open or come back later.'}
        </p>
        {failed && (
          <button
            type="button"
            disabled={retrying}
            className="btn-primary mt-6 min-h-[3rem] px-6"
            onClick={async () => {
              setRetrying(true);
              started.current = Date.now();
              kicked.current = true;
              await fetch(`/api/blueprint/${id}`, { method: 'POST', credentials: 'include' }).catch(() => {});
              setPhase({ kind: 'blueprint', status: 'generating', doc: null });
              setNonce((n) => n + 1);
              setRetrying(false);
            }}
          >
            {retrying ? 'Asking…' : 'Try again'}
          </button>
        )}
      </div>
    </main>
  );
}
