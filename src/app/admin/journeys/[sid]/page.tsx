'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

type Event = { name: string; path: string | null; at: string; identified: boolean };
type Data = {
  sid: string;
  userId: string | null;
  email: string | null;
  referrer: string | null;
  utm: Record<string, string> | null;
  channel: string;
  entryPage: string | null;
  dropOffPage: string | null;
  pageCount: number;
  firstSeen: string | null;
  lastSeen: string | null;
  events: Event[];
};

const when = (s?: string | null) => (s ? new Date(s).toLocaleString() : '—');

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex gap-2">
      <span className="text-dust/50 w-24 shrink-0">{k}</span>
      <span className="text-star break-words">{v}</span>
    </div>
  );
}

export default function JourneyDetail() {
  const params = useParams<{ sid: string }>();
  const sid = params?.sid;
  const [data, setData] = useState<Data | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!sid) return;
    fetch(`/api/admin/journeys/${encodeURIComponent(sid)}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((j) => (j.error ? setErr(j.error) : setData(j)))
      .catch(() => setErr('Failed to load'));
  }, [sid]);

  if (err) return <p className="text-caution">{err}</p>;
  if (!data) return <p className="text-dust">Loading…</p>;

  return (
    <div className="space-y-8">
      <div>
        <Link href="/admin/journeys" className="font-body text-body-sm text-dust hover:text-star">← All journeys</Link>
        <h1 className="font-display text-3xl text-star mt-2 break-all">
          {data.email ? data.email : <span className="text-dust">Anonymous visitor</span>}
        </h1>
        <p className="font-mono text-mono-sm text-dust/50 mt-1">
          session {data.sid} · {data.pageCount} page{data.pageCount === 1 ? '' : 's'}
          {data.userId && data.email && (
            <> · <Link href={`/admin/users/${data.userId}`} className="text-amber hover:underline">view account ▸</Link></>
          )}
        </p>
      </div>

      <section className="card border border-horizon/40 rounded-card p-5">
        <h2 className="font-display text-xl text-star mb-3">Where they came from</h2>
        <div className="grid sm:grid-cols-2 gap-x-8 gap-y-2 font-body text-body-sm">
          <Row k="Source" v={data.channel} />
          <Row k="Entry page" v={data.entryPage || '—'} />
          <Row k="Referrer" v={data.referrer || 'direct / none'} />
          <Row k="Drop-off" v={data.dropOffPage || '—'} />
          <Row k="UTM" v={data.utm ? Object.entries(data.utm).map(([k, v]) => `${k}=${v}`).join(', ') : 'none'} />
          <Row k="First seen" v={when(data.firstSeen)} />
        </div>
      </section>

      <section className="card border border-horizon/40 rounded-card p-5">
        <h2 className="font-display text-xl text-star mb-1">Journey timeline</h2>
        <p className="font-mono text-mono-sm text-dust/40 mb-4">Entry → … → drop-off, in order.</p>
        {data.events.length === 0 ? (
          <p className="text-dust/60 text-body-sm">No events for this session.</p>
        ) : (
          <ol className="space-y-1 font-mono text-mono-sm">
            {data.events.map((e, i) => (
              <li key={i} className="flex gap-3 items-baseline">
                <span className="text-dust/40 w-44 shrink-0">{when(e.at)}</span>
                <span className="text-amber w-28 shrink-0">{e.name}</span>
                <span className="text-dust/80 break-all">{e.path ?? ''}</span>
                {e.identified && <span className="text-success/70 text-[10px] uppercase">signed in</span>}
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
