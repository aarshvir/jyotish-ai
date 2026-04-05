'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

interface Report {
  id: string;
  native_name: string;
  birth_date: string;
  birth_city: string;
  plan_type: string;
  status: string;
  created_at: string;
  day_scores: Record<string, number> | null;
  lagna_sign: string | null;
  dasha_mahadasha: string | null;
  dasha_antardasha: string | null;
}

interface UserProfile {
  display_name: string | null;
  email: string | null;
}

function scoreTone(score: number | null) {
  if (score == null) {
    return { text: 'text-dust', bg: 'bg-dust/10', border: 'border-dust/30', bar: 'bg-dust' };
  }
  if (score >= 70) {
    return { text: 'text-emerald', bg: 'bg-emerald/10', border: 'border-emerald/40', bar: 'bg-emerald' };
  }
  if (score >= 50) {
    return { text: 'text-amber', bg: 'bg-amber/10', border: 'border-amber/40', bar: 'bg-amber' };
  }
  return { text: 'text-crimson', bg: 'bg-crimson/10', border: 'border-crimson/40', bar: 'bg-crimson' };
}

export default function DashboardPage() {
  const router = useRouter();
  const [reports, setReports] = useState<Report[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      const [{ data: profData }, { data: reps }] = await Promise.all([
        supabase
          .from('user_profiles')
          .select('display_name, email')
          .eq('id', user.id)
          .maybeSingle(),
        supabase
          .from('reports')
          .select(
            'id, native_name, birth_date, birth_city, plan_type, status, created_at, day_scores, lagna_sign, dasha_mahadasha, dasha_antardasha'
          )
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(20),
      ]);

      setProfile(profData ?? { display_name: null, email: user.email ?? null });
      setReports((reps as Report[]) || []);
      setLoading(false);
    }
    void load();
  }, [router]);

  function getAvgScore(dayScores: Record<string, number> | null) {
    if (!dayScores) return null;
    const vals = Object.values(dayScores);
    if (!vals.length) return null;
    return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
  }

  function getPlanLabel(plan: string) {
    return plan === '7day'
      ? '7-Day'
      : plan === 'monthly'
        ? 'Monthly'
        : plan === 'annual'
          ? 'Annual'
          : plan === 'preview'
            ? 'Preview'
            : plan;
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  function isToday(dateStr: string) {
    const d = new Date(dateStr);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  }

  function getReportUrl(report: Report) {
    return `/report/${report.id}`;
  }

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-var(--nav-height))] items-center justify-center bg-space">
        <p className="font-body text-sm text-amber">Loading your reports…</p>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-var(--nav-height))] bg-gradient-to-br from-space via-cosmos to-space font-body text-star">
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <header className="mb-10 border-b border-horizon/60 pb-8">
          <p className="mb-2 font-mono text-xs uppercase tracking-[0.2em] text-amber">Your oracle</p>
          <h1 className="mb-2 font-display text-3xl font-normal text-star sm:text-4xl">Report history</h1>
          <p className="text-sm text-dust">
            {profile?.display_name ? (
              <>
                <span className="text-star/90">{profile.display_name}</span>
                {profile.email ? <span className="text-dust"> · {profile.email}</span> : null}
              </>
            ) : (
              profile?.email ?? 'Signed in'
            )}
          </p>
          <p className="mt-3 text-sm text-dust">
            {reports.length === 0
              ? 'No reports yet — generate your first forecast'
              : `${reports.length} report${reports.length !== 1 ? 's' : ''} generated`}
          </p>
        </header>

        {reports.length === 0 && (
          <div className="rounded-xl border border-horizon/80 bg-nebula/30 px-6 py-20 text-center">
            <div className="mb-4 text-5xl opacity-40">✦</div>
            <p className="mb-6 text-base text-dust">Your cosmic timeline is empty</p>
            <Link
              href="/onboard"
              className="inline-block rounded-sm bg-amber px-8 py-3 min-h-[44px] text-sm font-semibold text-space transition-colors hover:bg-amber-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber focus-visible:ring-offset-2 focus-visible:ring-offset-space"
            >
              Generate your first report →
            </Link>
          </div>
        )}

        {reports.length > 0 && (
          <ul className="flex flex-col gap-4">
            {reports.map((report) => {
              const avgScore = getAvgScore(report.day_scores);
              const tone = scoreTone(avgScore);
              const isComplete = report.status === 'complete';

              return (
                <li
                  key={report.id}
                  className="flex flex-wrap items-center gap-5 rounded-xl border border-horizon/60 bg-nebula/20 p-5 sm:p-6"
                >
                  <div
                    className={`flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-xl border ${tone.border} ${tone.bg}`}
                  >
                    {avgScore != null ? (
                      <>
                        <span className={`text-xl font-bold leading-none ${tone.text}`}>{avgScore}</span>
                        <span className={`mt-0.5 text-[10px] opacity-80 ${tone.text}`}>avg</span>
                      </>
                    ) : (
                      <span className="text-xl opacity-30 text-dust">
                        {report.status === 'generating' ? '…' : '?'}
                      </span>
                    )}
                  </div>

                  <div className="min-w-[200px] flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <span className="text-base font-semibold text-star">{report.native_name}</span>
                      <span className="rounded px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide bg-amber/10 text-amber">
                        {getPlanLabel(report.plan_type)}
                      </span>
                      {report.status === 'generating' && (
                        <span className="rounded px-2 py-0.5 text-[11px] bg-nebula text-dust">Generating…</span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-3 text-sm text-dust">
                      <span>{report.birth_city || 'Unknown location'}</span>
                      {report.lagna_sign && <span>{report.lagna_sign} Lagna</span>}
                      {report.dasha_mahadasha && (
                        <span>
                          {report.dasha_mahadasha}
                          {report.dasha_antardasha ? `/${report.dasha_antardasha}` : ''}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-2 text-xs text-dust/70">
                      <span>
                        {isToday(report.created_at) ? (
                          <span className="font-semibold text-emerald">Today · </span>
                        ) : null}
                        Generated {formatDate(report.created_at)}
                      </span>
                      {report.birth_date && <span>· Born {formatDate(report.birth_date)}</span>}
                    </div>
                  </div>

                  {report.day_scores && Object.keys(report.day_scores).length > 0 && (
                    <div className="flex h-8 items-end gap-0.5">
                      {Object.entries(report.day_scores)
                        .slice(0, 7)
                        .map(([date, score]) => {
                          const t = scoreTone(score);
                          return (
                            <div
                              key={date}
                              title={`${date}: ${score}`}
                              className={`w-2 rounded-sm opacity-80 ${t.bar}`}
                              style={{ height: `${(score / 100) * 32}px`, minHeight: '4px' }}
                            />
                          );
                        })}
                    </div>
                  )}

                  {isComplete && (
                    <Link
                      href={getReportUrl(report)}
                      className="shrink-0 whitespace-nowrap rounded-lg border border-amber/40 bg-amber/10 px-5 py-2.5 min-h-[44px] text-sm font-semibold text-amber transition-colors hover:bg-amber/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber/60"
                    >
                      View report →
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
