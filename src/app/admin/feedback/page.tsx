'use client';

import { useEffect, useState } from 'react';

type Item = {
  id: string;
  email: string | null;
  brought_by: string | null;
  rating: number | null;
  message: string;
  path: string | null;
  created_at: string;
};

const d = (s: string) => new Date(s).toLocaleString();

export default function AdminFeedback() {
  const [items, setItems] = useState<Item[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch('/api/admin/feedback')
      .then((r) => r.json())
      .then((j) => (j.error ? setErr(j.error) : setItems(j.feedback)))
      .catch(() => setErr('Failed to load'))
      .finally(() => setLoaded(true));
  }, []);

  if (err) return <p className="text-caution">{err}</p>;

  return (
    <div>
      <h1 className="font-display text-3xl text-star mb-2">Feedback</h1>
      <p className="text-dust/60 font-mono text-mono-sm mb-6">{loaded ? `${items.length} submissions` : 'Loading…'}</p>

      {loaded && items.length === 0 && <p className="text-dust/60 text-body-sm">No feedback yet.</p>}

      <div className="space-y-3">
        {items.map((f) => (
          <div key={f.id} className="card border border-horizon/40 rounded-card p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-mono-sm text-amber">
                {f.rating ? '★'.repeat(f.rating) + '☆'.repeat(5 - f.rating) : 'no rating'}
              </span>
              <span className="font-mono text-mono-sm text-dust/50">{d(f.created_at)}</span>
            </div>
            <p className="font-body text-body-sm text-star leading-relaxed whitespace-pre-wrap">{f.message}</p>
            {f.brought_by && (
              <p className="mt-2 font-body text-body-sm text-dust"><span className="text-dust/50">Came for: </span>{f.brought_by}</p>
            )}
            <div className="mt-2 flex flex-wrap gap-x-4 font-mono text-mono-sm text-dust/50">
              {f.email && <span>{f.email}</span>}
              {f.path && <span>on {f.path}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
