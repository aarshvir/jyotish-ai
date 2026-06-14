'use client';

import { useEffect, useState } from 'react';

type Sub = { email: string; source: string | null; created_at: string };

export default function AdminNewsletter() {
  const [subs, setSubs] = useState<Sub[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch('/api/admin/newsletter')
      .then((r) => r.json())
      .then((j) => (j.error ? setErr(j.error) : setSubs(j.subscribers)))
      .catch(() => setErr('Failed to load'))
      .finally(() => setLoaded(true));
  }, []);

  function exportCsv() {
    const rows = [['email', 'source', 'created_at'], ...subs.map((s) => [s.email, s.source ?? '', s.created_at])];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'vedichour-newsletter.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  if (err) return <p className="text-caution">{err}</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h1 className="font-display text-3xl text-star">Newsletter</h1>
        {subs.length > 0 && <button onClick={exportCsv} className="btn-primary px-4 py-2 text-body-sm">Export CSV</button>}
      </div>
      <p className="text-dust/60 font-mono text-mono-sm mb-6">{loaded ? `${subs.length} subscribers` : 'Loading…'}</p>
      <div className="overflow-x-auto">
        <table className="w-full text-left font-body text-body-sm">
          <thead className="text-dust/60 font-mono text-mono-sm uppercase"><tr><th className="py-2 pr-4">Email</th><th className="pr-4">Source</th><th>Joined</th></tr></thead>
          <tbody>
            {subs.map((s) => (
              <tr key={s.email} className="border-t border-horizon/30">
                <td className="py-2 pr-4 text-star">{s.email}</td>
                <td className="pr-4 text-dust/60">{s.source ?? '—'}</td>
                <td className="text-dust/60">{s.created_at ? s.created_at.slice(0, 10) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
