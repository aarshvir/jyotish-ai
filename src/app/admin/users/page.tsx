'use client';

import { useEffect, useState } from 'react';

type Row = {
  id: string;
  email: string;
  created_at?: string;
  reports: number;
  paidReports: number;
  kundalis: number;
  synastries: number;
  paid: Record<string, number>;
};

function fmtPaid(paid: Record<string, number>): string {
  const parts = Object.entries(paid).map(([c, m]) => {
    const major = m / 100;
    if (c === 'INR') return `₹${Math.round(major).toLocaleString('en-IN')}`;
    if (c === 'AED') return `AED ${major.toFixed(2)}`;
    return `$${major.toFixed(2)}`;
  });
  return parts.length ? parts.join(' + ') : '—';
}

export default function AdminUsers() {
  const [users, setUsers] = useState<Row[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch('/api/admin/users')
      .then((r) => r.json())
      .then((j) => (j.error ? setErr(j.error) : setUsers(j.users)))
      .catch(() => setErr('Failed to load'))
      .finally(() => setLoaded(true));
  }, []);

  if (err) return <p className="text-caution">{err}</p>;

  return (
    <div>
      <h1 className="font-display text-3xl text-star mb-2">Users</h1>
      <p className="text-dust/60 font-mono text-mono-sm mb-6">
        {loaded ? `${users.length} signed up` : 'Loading…'}
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-left font-body text-body-sm">
          <thead className="text-dust/60 font-mono text-mono-sm uppercase">
            <tr>
              <th className="py-2 pr-4">Email</th>
              <th className="pr-4">Joined</th>
              <th className="pr-4">Forecasts</th>
              <th className="pr-4">Paid</th>
              <th className="pr-4">Kundalis</th>
              <th className="pr-4">Matches</th>
              <th className="pr-4">Spent</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-horizon/30">
                <td className="py-2 pr-4 text-star">{u.email}</td>
                <td className="pr-4 text-dust/60">{u.created_at ? u.created_at.slice(0, 10) : '—'}</td>
                <td className="pr-4">{u.reports}</td>
                <td className="pr-4">{u.paidReports}</td>
                <td className="pr-4">{u.kundalis}</td>
                <td className="pr-4">{u.synastries}</td>
                <td className="pr-4 text-amber">{fmtPaid(u.paid)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
