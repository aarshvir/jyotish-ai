'use client';

import { useEffect, useState } from 'react';

const OFFER_SEC = 15 * 60;

export function UpsellCountdown() {
  const [left, setLeft] = useState(OFFER_SEC);

  useEffect(() => {
    const t = window.setInterval(() => {
      setLeft((s) => Math.max(0, s - 1));
    }, 1000);
    return () => window.clearInterval(t);
  }, []);

  const m = Math.floor(left / 60);
  const s = left % 60;
  return (
    <p className="text-center text-amber font-mono text-mono-sm mb-6">
      Introductory upgrade window: {String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
    </p>
  );
}
