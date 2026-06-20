'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type Session = {
  sid: string;
  entryPage: string | null;
  channel: string;
  referrer: string | null;
  utmSource: string | null;
  pages: number;
  lastPage: string | null;
  events: number;
  firstSeen: string;
  lastSeen: string;
  userId: string | null;
  email: string | null;
  signedUp: boolean;
  paid: boolean;
};

type Data = {
  totalSessions: number;
  anonymousSessions: number;
  convertedSessions: number;
  sessions: Session[];
  note: string;
};

const when = (s?: string | null) => (s ? new Date(s).toLocaleString() : '—');

export default function JourneysPage() {
  const [d, setD] = useState<Data | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/journeys', { cache: 'no-store' })
      .then((r) => r.json())
      .then((j) => (j.error ? setErr(j.error) : setD(j)))
      .catch(() => setErr('Failed to load'));
  }, []);

  if (err) return <p className="text-caution">{err}</p>;
  if (!d) return <p className="text-dust">Loading…</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl text-star">Visitor journeys</h1>
        <p className="font-mono text-mono-sm text-dust/50 mt-1">
          Every browser session — anonymous and signed-up — entry page, source, page count, and the exact page they dropped off on.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          ['Sessions', d.totalSessions.toLocaleString()],
          ['Anonymous', d.anonymousSessions.toLocaleString()],
          ['Converted (paid)', d.convertedSessions.toLocaleString()],
        ].map(([l, v]) => (
          <div key={l} className="card border border-horizon/40 rounded-card p-5">
            <div className="font-mono text-mono-sm text-dust/60 uppercase tracking-wider">{l}</div>
            <div className="font-display text-2xl text-amber mt-1">{v}</div>
          </div>
        ))}
      </div>

      <div className="card border border-horizon/40 rounded-card overflow-x-auto">
        <table className="w-full text-left text-body-sm">
          <thead>
            <tr className="border-b border-horizon/40 font-mono text-mono-sm text-dust/50 uppercase tracking-wider">
              <th className="px-4 py-3">Visitor</th>
              <th className="px-4 py-3">Entry page</th>
              <th className="px-4 py-3">Source</th>
              <th className="px-4 py-3 text-right">Pages</th>
              <th className="px-4 py-3">Drop-off page</th>
              <th className="px-4 py-3">Last seen</th>
            </tr>
          </thead>
          <tbody>
            {d.sessions.map((s) => (
              <tr key={s.sid} className="border-b border-horizon/20 hover:bg-bg-3/30">
                <td className="px-4 py-3">
                  <Link href={`/admin/journeys/${encodeURIComponent(s.sid)}`} className="text-amber hover:underline">
                    {s.email ? s.email : <span className="text-dust">anon · {s.sid.slice(0, 8)}</span>}
                  </Link>
                  <div className="mt-0.5 flex gap-1.5">
                    {s.paid ? (
                      <span className="font-mono text-[10px] uppercase tracking-wider text-success">paid</span>
                    ) : s.signedUp ? (
                      <span className="font-mono text-[10px] uppercase tracking-wider text-amber/70">signed up</span>
                    ) : (
                      <span className="font-mono text-[10px] uppercase tracking-wider text-dust/40">anonymous</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-dust/80 font-mono text-mono-sm truncate max-w-[14rem]">{s.entryPage ?? '—'}</td>
                <td className="px-4 py-3 text-star whitespace-nowrap">{s.channel}</td>
                <td className="px-4 py-3 text-right tabular-nums text-star">{s.pages}</td>
                <td className="px-4 py-3 text-dust/80 font-mono text-mono-sm truncate max-w-[14rem]">{s.lastPage ?? '—'}</td>
                <td className="px-4 py-3 text-dust/60 whitespace-nowrap">{when(s.lastSeen)}</td>
              </tr>
            ))}
            {d.sessions.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-dust/60">No visitor sessions recorded yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="font-mono text-mono-sm text-dust/40">{d.note}</p>
    </div>
  );
}
