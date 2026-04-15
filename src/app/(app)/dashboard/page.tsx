'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { RightNowCard } from '@/components/dashboard/RightNowCard';

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
    return { text: 'text-success', bg: 'bg-success/10', border: 'border-success/30', bar: 'bg-success' };
  }
  if (score >= 50) {
    return { text: 'text-amber', bg: 'bg-amber/10', border: 'border-amber/30', bar: 'bg-amber' };
  }
  return { text: 'text-caution', bg: 'bg-caution/10', border: 'border-caution/30', bar: 'bg-caution' };
}

export default function DashboardPage() {
  const router = useRouter();
  const [reports, setReports] = useState<Report[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const [{ data: profData }, { data: reps, error: repsError }] = await Promise.all([
        supabase
          .from('user_profiles')
          .select('display_name, email')
          .eq('id', user.id)
          .maybeSingle(),
        supabase
          .from('reports')
          .select('id, native_name, birth_date, birth_city, plan_type, status, created_at, day_scores, lagna_sign, dasha_mahadasha, dasha_antardasha')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(20),
      ]);

      if (repsError) {
        console.error('[Dashboard] failed to load reports:', repsError.message);
        setLoadError('Could not load your reports. Please refresh the page.');
      }

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
    return plan === '7day' ? '7-Day' : plan === 'monthly' ? 'Monthly' : plan === 'annual' ? 'Annual' : plan === 'preview' ? 'Preview' : plan;
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function isToday(dateStr: string) {
    return new Date(dateStr).toDateString() === new Date().toDateString();
  }

  function isStale(report: Report) {
    if (report.status !== 'generating') return false;
    return Date.now() - new Date(report.created_at).getTime() > 30 * 60 * 1000;
  }

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-var(--nav-height))] items-center justify-center bg-space">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-amber border-t-transparent animate-spin" />
          <p className="font-body text-body-sm text-dust">Loading your reports…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-var(--nav-height))] bg-space font-body text-star">
      <div className="mx-auto max-w-4xl px-5 py-8 sm:px-6 lg:px-8 md:py-10">
        {/* Action area: "What should I do now?" */}
        <RightNowCard className="mb-8" />

        {/* Header */}
        <header className="mb-8 pb-6 border-b border-horizon/40">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="section-eyebrow mb-1.5">Your Oracle</p>
              <h1 className="font-body text-headline-lg text-star">Report History</h1>
              <p className="text-body-sm text-dust mt-1">
                {profile?.display_name ? (
                  <>
                    <span className="text-star/80">{profile.display_name}</span>
                    {profile.email ? <span className="text-dust"> · {profile.email}</span> : null}
                  </>
                ) : (
                  profile?.email ?? 'Signed in'
                )}
              </p>
            </div>
            <Link href="/onboard" className="btn-primary text-body-sm px-5 py-2.5 shrink-0">
              New Report
            </Link>
          </div>
        </header>

        {loadError && (
          <div className="mb-6 px-4 py-3 rounded-card border border-error/30 bg-error/10 text-error font-body text-sm">
            {loadError}
          </div>
        )}

        {reports.length === 0 && !loadError && (
          <div className="card p-8 md:p-12 text-center">
            <div className="mb-4 text-4xl opacity-30">✦</div>
            <p className="font-body text-body-lg text-dust mb-5">Your cosmic timeline is empty</p>
            <Link href="/onboard" className="btn-primary px-8 py-3">
              Generate your first report →
            </Link>
          </div>
        )}

        {reports.length > 0 && (
          <ul className="flex flex-col gap-3">
            {reports.map((report) => {
              const avgScore = getAvgScore(report.day_scores);
              const tone = scoreTone(avgScore);
              const isComplete = report.status === 'complete';
              const isFailed = report.status === 'error' || isStale(report);
              const isGenerating = report.status === 'generating' && !isFailed;

              return (
                <li key={report.id} className="card-interactive flex flex-wrap items-center gap-4 p-4 sm:p-5">
                  {/* Score badge */}
                  <div className={`flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-card border ${isFailed ? 'border-caution/30 bg-caution/10' : tone.border + ' ' + tone.bg}`}>
                    {avgScore != null ? (
                      <>
                        <span className={`text-xl font-bold leading-none ${tone.text}`}>{avgScore}</span>
                        <span className={`mt-0.5 text-label-sm opacity-70 ${tone.text}`}>avg</span>
                      </>
                    ) : (
                      <span className={`text-lg opacity-30 ${isFailed ? 'text-caution' : ''}`}>
                        {isFailed ? '✕' : isGenerating ? '…' : '?'}
                      </span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="min-w-[180px] flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-body text-title-lg text-star">{report.native_name}</span>
                      <span className="rounded-badge px-2 py-0.5 text-label-sm font-medium uppercase tracking-wider bg-amber/10 text-amber">
                        {getPlanLabel(report.plan_type)}
                      </span>
                      {isGenerating && (
                        <span className="rounded-badge px-2 py-0.5 text-label-sm bg-nebula text-dust">Generating…</span>
                      )}
                      {isFailed && (
                        <span className="rounded-badge px-2 py-0.5 text-label-sm bg-caution/10 text-caution">Failed</span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2.5 text-body-sm text-dust">
                      <span>{report.birth_city || 'Unknown location'}</span>
                      {report.lagna_sign && <span>{report.lagna_sign} Lagna</span>}
                      {report.dasha_mahadasha && (
                        <span>{report.dasha_mahadasha}{report.dasha_antardasha ? `/${report.dasha_antardasha}` : ''}</span>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-2 text-mono-sm text-dust/60 font-mono">
                      <span>
                        {isToday(report.created_at) ? <span className="font-medium text-success">Today · </span> : null}
                        Generated {formatDate(report.created_at)}
                      </span>
                      {report.birth_date && <span>· Born {formatDate(report.birth_date)}</span>}
                    </div>
                  </div>

                  {/* Mini sparkline */}
                  {report.day_scores && Object.keys(report.day_scores).length > 0 && (
                    <div className="flex h-7 items-end gap-0.5" aria-hidden>
                      {Object.entries(report.day_scores).slice(0, 7).map(([date, score]) => {
                        const t = scoreTone(score);
                        return (
                          <div
                            key={date}
                            title={`${date}: ${score}`}
                            className={`w-1.5 rounded-sm opacity-70 ${t.bar}`}
                            style={{ height: `${(score / 100) * 28}px`, minHeight: '3px' }}
                          />
                        );
                      })}
                    </div>
                  )}

                  {/* Action */}
                  {isComplete && (
                    <Link
                      href={`/report/${report.id}`}
                      className="btn-primary text-body-sm px-5 py-2 shrink-0"
                    >
                      View report →
                    </Link>
                  )}
                  {isGenerating && (
                    <Link
                      href={`/report/${report.id}`}
                      className="btn-secondary text-body-sm px-5 py-2 shrink-0 flex items-center gap-1.5"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-amber animate-pulse shrink-0" />
                      View Progress →
                    </Link>
                  )}
                  {isFailed && (
                    <Link
                      href="/onboard"
                      className="btn-secondary text-body-sm px-5 py-2 shrink-0"
                    >
                      Retry →
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
