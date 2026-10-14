'use client';

import { useEffect, useRef, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { clearDeviceDrafts } from './deviceDrafts';

export function DeviceDraftControls() {
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState<{ cleared: number; failed: boolean } | null>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const confirm = useRef<HTMLButtonElement>(null);
  const wasConfirming = useRef(false);
  useEffect(() => {
    if (confirming) confirm.current?.focus();
    else if (wasConfirming.current) trigger.current?.focus();
    wasConfirming.current = confirming;
  }, [confirming]);
  function clear() { setResult(clearDeviceDrafts(() => window.sessionStorage, () => window.localStorage)); setConfirming(false); }
  return <section id="device-controls" className="scroll-mt-8 border-y border-horizon py-6">
    <h2 className="text-lg font-semibold text-star">Clear device drafts</h2>
    <p className="mt-2 text-sm leading-relaxed text-dust">Remove saved chart-form and quiz drafts from this browser. Close other chart or quiz tabs first. Active forms can save a draft again.</p>
    <p id="device-clear-scope" className="mt-2 text-sm leading-relaxed text-dust">This does not sign you out or delete account reports, payments, emailed charts or provider records.</p>
    {confirming ? <div role="group" aria-label="Confirm clearing device drafts" className="mt-4">
      <p className="text-sm text-star">Discard the drafts on this browser? You cannot restore them with this control.</p>
      <div className="mt-3 flex flex-wrap gap-3"><button ref={confirm} type="button" onClick={clear} className="inline-flex min-h-11 items-center gap-2 rounded-md border border-caution px-4 text-sm text-star focus-visible:ring-2 focus-visible:ring-amber"><Trash2 aria-hidden="true" className="h-4 w-4" />Confirm clear drafts</button><button type="button" onClick={() => setConfirming(false)} className="min-h-11 rounded-md border border-horizon px-4 text-sm text-star focus-visible:ring-2 focus-visible:ring-amber">Cancel</button></div>
    </div> : <button ref={trigger} type="button" aria-describedby="device-clear-scope" onClick={() => { setResult(null); setConfirming(true); }} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-md border border-horizon px-4 text-sm text-star hover:border-dust focus-visible:ring-2 focus-visible:ring-amber"><Trash2 aria-hidden="true" className="h-4 w-4" />Clear device drafts</button>}
    <div role="status" aria-live="polite" aria-atomic="true" className="mt-3 text-sm text-dust">{result && (result.failed ? 'Some browser storage could not be cleared. Your account records were not changed. Check browser storage permissions and try again.' : result.cleared ? 'Device drafts cleared. Your account records were not changed.' : 'No saved device drafts found. Your account records were not changed.')}</div>
  </section>;
}
