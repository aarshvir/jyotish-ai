'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { RightNowCard } from '@/components/dashboard/RightNowCard';
import type { PaymentRecord } from '@/app/api/user/payments/route';

// ── Types ─────────────────────────────────────────────────────────────────────

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
  moon_sign: string | null;
  dasha_mahadasha: string | null;
  dasha_antardasha: string | null;
  payment_status: string | null;
  payment_provider: string | null;
  report_start_date: string | null;
  report_end_date: string | null;
  generation_completed_at: string | null;
}

interface UserProfile {
  display_name: string | null;
  email: string | null;
  avatar_url: string | null;
  default_birth_date: string | null;
  default_birth_time: string | null;
  default_birth_city: string | null;
  created_at: string | null;
}

type Tab = 'overview' | 'reports' | 'payments' | 'settings';
type ReportFilter = 'all' | 'complete' | 'generating' | 'failed';

// ── Helpers ───────────────────────────────────────────────────────────────────

function getAvgScore(dayScores: Record<string, number> | null): number | null {
  if (!dayScores) return null;
  const vals = Object.values(dayScores);
  if (!vals.length) return null;
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
}

function scoreTone(score: number | null) {
  if (score == null) return { text: 'text-dust', bg: 'bg-dust/10', border: 'border-dust/20', bar: 'bg-dust/50' };
  if (score >= 70) return { text: 'text-success', bg: 'bg-success/10', border: 'border-success/30', bar: 'bg-success' };
  if (score >= 50) return { text: 'text-amber', bg: 'bg-amber/10', border: 'border-amber/30', bar: 'bg-amber' };
  return { text: 'text-caution', bg: 'bg-caution/10', border: 'border-caution/30', bar: 'bg-caution' };
}

function getPlanLabel(plan: string) {
  if (plan === '7day') return '7-Day';
  if (plan === 'monthly') return 'Monthly';
  if (plan === 'annual') return 'Annual';
  if (plan === 'preview') return 'Preview';
  return plan;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDateShort(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function formatMemberSince(dateStr: string | null) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
}

function isStale(report: Report) {
  if (report.status !== 'generating') return false;
  return Date.now() - new Date(report.created_at).getTime() > 30 * 60 * 1000;
}

function getInitials(name: string | null): string {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function formatPaymentAmount(amount: number, currency: string): string {
  const major = amount / 100;
  if (currency === 'AED') return `AED ${major.toFixed(2)}`;
  if (currency === 'INR') return `₹${Math.round(major).toLocaleString('en-IN')}`;
  if (currency === 'USD') return `$${major.toFixed(2)}`;
  return `${currency} ${major.toFixed(2)}`;
}

function isToday(dateStr: string) {
  return new Date(dateStr).toDateString() === new Date().toDateString();
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Sparkline({ dayScores }: { dayScores: Record<string, number> | null }) {
  if (!dayScores || Object.keys(dayScores).length === 0) return null;
  const entries = Object.entries(dayScores).slice(0, 7);
  return (
    <div className="flex h-8 items-end gap-[2px]" aria-hidden>
      {entries.map(([date, score]) => {
        const t = scoreTone(score);
        return (
          <div
            key={date}
            title={`${date}: ${score}`}
            className={`w-[5px] rounded-sm ${t.bar}`}
            style={{ height: `${Math.max(4, (score / 100) * 32)}px` }}
          />
        );
      })}
    </div>
  );
}

function PlanBadge({ plan }: { plan: string }) {
  const label = getPlanLabel(plan);
  const color = plan === 'annual' ? 'bg-purple-500/15 text-purple-300 border-purple-500/20'
    : plan === 'monthly' ? 'bg-sky-500/15 text-sky-300 border-sky-500/20'
    : plan === '7day' ? 'bg-amber/10 text-amber border-amber/20'
    : 'bg-horizon/40 text-dust border-horizon/20';
  return (
    <span className={`rounded-badge px-2 py-0.5 text-label-sm font-medium uppercase tracking-wider border ${color}`}>
      {label}
    </span>
  );
}

function StatusBadge({ status, isGenerating, isFailed }: { status: string; isGenerating: boolean; isFailed: boolean }) {
  if (isFailed) return <span className="rounded-badge px-2 py-0.5 text-label-sm bg-caution/10 text-caution border border-caution/20">Failed</span>;
  if (isGenerating) return <span className="rounded-badge px-2 py-0.5 text-label-sm bg-amber/10 text-amber border border-amber/20 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-amber animate-pulse" />Generating</span>;
  if (status === 'complete') return <span className="rounded-badge px-2 py-0.5 text-label-sm bg-success/10 text-success border border-success/20">Complete</span>;
  return <span className="rounded-badge px-2 py-0.5 text-label-sm bg-horizon/40 text-dust border border-horizon/20">{status}</span>;
}

function ReportCard({ report, compact = false }: { report: Report; compact?: boolean }) {
  const avgScore = getAvgScore(report.day_scores);
  const tone = scoreTone(avgScore);
  const isFailed = report.status === 'error' || isStale(report);
  const isGenerating = report.status === 'generating' && !isFailed;
  const isComplete = report.status === 'complete';

  return (
    <li className={`card-interactive flex flex-wrap items-center gap-4 ${compact ? 'p-4' : 'p-4 sm:p-5'}`}>
      {/* Score circle */}
      <div className={`flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-full border-2 ${isFailed ? 'border-caution/30 bg-caution/5' : tone.border + ' ' + tone.bg}`}>
        {avgScore != null ? (
          <>
            <span className={`text-lg font-bold leading-none tabular-nums ${tone.text}`}>{avgScore}</span>
            <span className={`text-[9px] font-mono opacity-60 ${tone.text}`}>avg</span>
          </>
        ) : (
          <span className={`text-lg opacity-30 ${isFailed ? 'text-caution' : 'text-dust'}`}>
            {isFailed ? '✕' : isGenerating ? '…' : '?'}
          </span>
        )}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span className="font-body text-title-lg text-star truncate">{report.native_name}</span>
          <PlanBadge plan={report.plan_type} />
          <StatusBadge status={report.status} isGenerating={isGenerating} isFailed={isFailed} />
        </div>
        <div className="flex flex-wrap gap-2.5 text-body-sm text-dust/80">
          <span>{report.birth_city || 'Unknown'}</span>
          {report.lagna_sign && <span>· {report.lagna_sign} Lagna</span>}
          {report.moon_sign && <span>· {report.moon_sign} Moon</span>}
          {report.dasha_mahadasha && (
            <span>· {report.dasha_mahadasha}{report.dasha_antardasha ? `/${report.dasha_antardasha}` : ''}</span>
          )}
        </div>
        <div className="mt-1 flex flex-wrap gap-2 text-mono-sm text-dust/50 font-mono">
          {isToday(report.created_at) && <span className="text-success font-medium">Today ·</span>}
          <span>Generated {formatDate(report.created_at)}</span>
          {report.birth_date && <span>· Born {formatDateShort(report.birth_date)}</span>}
        </div>
      </div>

      {/* Sparkline */}
      {!compact && <Sparkline dayScores={report.day_scores} />}

      {/* Action */}
      <div className="shrink-0">
        {isComplete && (
          <Link href={`/report/${report.id}`} className="btn-primary text-body-sm px-4 py-2">
            View →
          </Link>
        )}
        {isGenerating && (
          <Link href={`/report/${report.id}`} className="btn-secondary text-body-sm px-4 py-2 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber animate-pulse" />
            Progress →
          </Link>
        )}
        {isFailed && (
          <Link href="/onboard" className="btn-secondary text-body-sm px-4 py-2">
            Retry →
          </Link>
        )}
      </div>
    </li>
  );
}

function PaymentRow({ payment }: { payment: PaymentRecord }) {
  const planLabel = payment.plan_type ? getPlanLabel(payment.plan_type) : 'Report';
  const isCompleted = payment.status === 'completed';
  const statusColor = isCompleted ? 'text-success' : payment.status === 'pending' ? 'text-amber' : 'text-caution';
  const providerLabel = 'Ziina';
  const providerColor = payment.provider === 'ziina' ? 'text-sky-400' : 'text-blue-400';

  return (
    <li className="flex flex-wrap items-center gap-4 p-4 sm:p-5 border-b border-horizon/20 last:border-0">
      {/* Provider icon */}
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-horizon/30 border border-horizon/40">
        <span className="text-base">{payment.provider === 'ziina' ? 'Z' : 'R'}</span>
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="font-body text-star text-base">{planLabel} Forecast</span>
          <span className={`text-label-sm font-mono ${providerColor}`}>via {providerLabel}</span>
        </div>
        <div className="flex flex-wrap gap-3 text-mono-sm text-dust/60 font-mono">
          <span>{formatDate(payment.created_at)}</span>
          {payment.report_id && (
            <Link href={`/report/${payment.report_id}`} className="text-amber/70 hover:text-amber transition-colors">
              View report →
            </Link>
          )}
        </div>
      </div>

      {/* Amount + status */}
      <div className="text-right shrink-0">
        <div className="font-mono text-star font-semibold text-base">
          {formatPaymentAmount(payment.amount, payment.currency)}
        </div>
        <div className={`text-label-sm font-mono capitalize ${statusColor}`}>
          {payment.status}
        </div>
      </div>
    </li>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

function DashboardInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Tab state — default from URL param so tabs are deep-linkable
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    const t = searchParams.get('tab') as Tab | null;
    return t && ['overview', 'reports', 'payments', 'settings'].includes(t) ? t : 'overview';
  });

  // Keep tab in sync with browser back/forward
  useEffect(() => {
    const t = searchParams.get('tab') as Tab | null;
    const resolved = t && ['overview', 'reports', 'payments', 'settings'].includes(t) ? t : 'overview';
    setActiveTab(resolved);
  }, [searchParams]);

  // popstate listener — pushState above doesn't trigger Next's searchParams update,
  // so we manually read the URL on back/forward nav.
  useEffect(() => {
    const onPop = () => {
      const sp = new URLSearchParams(window.location.search);
      const t = sp.get('tab') as Tab | null;
      const resolved = t && ['overview', 'reports', 'payments', 'settings'].includes(t) ? t : 'overview';
      setActiveTab(resolved);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const [reports, setReports] = useState<Report[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reportFilter, setReportFilter] = useState<ReportFilter>('all');

  // Settings form state
  const [settingsName, setSettingsName] = useState('');
  const [settingsBirthDate, setSettingsBirthDate] = useState('');
  const [settingsBirthTime, setSettingsBirthTime] = useState('');
  const [settingsBirthCity, setSettingsBirthCity] = useState('');
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      // Fetch all data in parallel including payments (needed for Overview tab stats)
      const [{ data: profData }, { data: reps, error: repsError }, paymentsRes] = await Promise.all([
        supabase
          .from('user_profiles')
          .select('display_name, email, avatar_url, default_birth_date, default_birth_time, default_birth_city, created_at')
          .eq('id', user.id)
          .maybeSingle(),
        supabase
          .from('reports')
          .select('id, native_name, birth_date, birth_city, plan_type, status, created_at, day_scores, lagna_sign, moon_sign, dasha_mahadasha, dasha_antardasha, payment_status, payment_provider, report_start_date, report_end_date, generation_completed_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50),
        fetch('/api/user/payments', { credentials: 'include' })
          .then(r => r.ok ? r.json() : { payments: [] })
          .catch(() => ({ payments: [] })),
      ]);

      if (repsError) {
        setLoadError('Could not load your reports. Please refresh.');
      }

      const prof = profData as UserProfile | null;
      const resolvedProfile: UserProfile = prof ?? {
        display_name: null,
        email: user.email ?? null,
        avatar_url: null,
        default_birth_date: null,
        default_birth_time: null,
        default_birth_city: null,
        created_at: null,
      };

      setProfile(resolvedProfile);
      setReports((reps as Report[]) || []);
      setPayments((paymentsRes as { payments?: PaymentRecord[] }).payments ?? []);

      // Pre-fill settings form from profile (or fallback)
      setSettingsName(resolvedProfile.display_name ?? '');
      setSettingsBirthDate(resolvedProfile.default_birth_date ?? '');
      setSettingsBirthTime(resolvedProfile.default_birth_time ?? '');
      setSettingsBirthCity(resolvedProfile.default_birth_city ?? '');

      setLoading(false);
    }
    void load();
  }, [router]);

  const saveSettings = useCallback(async () => {
    setSettingsSaving(true);
    setSettingsError(null);
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          display_name: settingsName.trim() || null,
          default_birth_date: settingsBirthDate || null,
          default_birth_time: settingsBirthTime || null,
          default_birth_city: settingsBirthCity.trim() || null,
        }),
      });
      if (!res.ok) throw new Error('Failed to save');
      setProfile(prev => prev ? {
        ...prev,
        display_name: settingsName.trim() || null,
        default_birth_date: settingsBirthDate || null,
        default_birth_time: settingsBirthTime || null,
        default_birth_city: settingsBirthCity.trim() || null,
      } : prev);
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 3000);
    } catch {
      setSettingsError('Save failed — please try again');
    } finally {
      setSettingsSaving(false);
    }
  }, [settingsName, settingsBirthDate, settingsBirthTime, settingsBirthCity]);

  // ── Derived data ────────────────────────────────────────────────────────────

  const completeReports = reports.filter(r => r.status === 'complete');
  const latestCompleteReport = completeReports[0] ?? null;

  // Stats
  const totalReports = reports.length;
  const totalPayments = payments.length;

  // Most recent payment for overview tab
  const latestPayment = payments[0] ?? null;

  // Filtered reports
  const filteredReports = reports.filter(r => {
    if (reportFilter === 'all') return true;
    if (reportFilter === 'complete') return r.status === 'complete';
    if (reportFilter === 'generating') return r.status === 'generating' && !isStale(r);
    if (reportFilter === 'failed') return r.status === 'error' || isStale(r);
    return true;
  });

  const displayName = profile?.display_name ?? profile?.email?.split('@')[0] ?? 'Seeker';
  const initials = getInitials(profile?.display_name ?? profile?.email ?? null);

  // ── Loading state ───────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-var(--nav-height))] items-center justify-center bg-space">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-amber border-t-transparent animate-spin" />
          <p className="font-body text-body-sm text-dust">Loading your dashboard…</p>
        </div>
      </div>
    );
  }

  // ── Tab navigation helper ───────────────────────────────────────────────────

  function switchTab(t: Tab) {
    setActiveTab(t);
    const url = t === 'overview' ? '/dashboard' : `/dashboard?tab=${t}`;
    // pushState so browser back/forward navigates between tabs
    window.history.pushState({}, '', url);
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-[calc(100vh-var(--nav-height))] bg-space font-body text-star">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8 md:py-10">

        {/* ── Hero Section ───────────────────────────────────────────────── */}
        <div className="card mb-8 p-6 sm:p-8 relative overflow-hidden">
          {/* Subtle background glow */}
          <div className="pointer-events-none absolute inset-0 opacity-[0.04]">
            <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-amber blur-3xl" />
          </div>

          <div className="relative flex flex-wrap items-start justify-between gap-6">
            {/* Avatar + identity */}
            <div className="flex items-center gap-5">
              <div className="relative shrink-0">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber/80 to-amber/30 border border-amber/40 flex items-center justify-center shadow-glow-amber">
                  <span className="text-xl font-bold text-space font-display">{initials}</span>
                </div>
              </div>
              <div>
                <h1 className="font-body text-xl font-semibold text-star">{displayName}</h1>
                {profile?.email && (
                  <p className="text-body-sm text-dust/70 mt-0.5">{profile.email}</p>
                )}
                {/* Astro identity from most recent complete report */}
                {latestCompleteReport && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {latestCompleteReport.lagna_sign && (
                      <span className="rounded-badge px-2 py-0.5 text-label-sm bg-amber/10 text-amber border border-amber/20 font-mono">
                        {latestCompleteReport.lagna_sign} Lagna
                      </span>
                    )}
                    {latestCompleteReport.moon_sign && (
                      <span className="rounded-badge px-2 py-0.5 text-label-sm bg-sky-500/10 text-sky-300 border border-sky-500/20 font-mono">
                        {latestCompleteReport.moon_sign} Moon
                      </span>
                    )}
                    {latestCompleteReport.dasha_mahadasha && (
                      <span className="rounded-badge px-2 py-0.5 text-label-sm bg-purple-500/10 text-purple-300 border border-purple-500/20 font-mono">
                        {latestCompleteReport.dasha_mahadasha}{latestCompleteReport.dasha_antardasha ? `/${latestCompleteReport.dasha_antardasha}` : ''} Dasha
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* New Report CTA */}
            <Link href="/onboard" className="btn-primary px-5 py-2.5 text-body-sm shrink-0">
              + New Report
            </Link>
          </div>

          {/* Stats row */}
          <div className="relative mt-6 pt-5 border-t border-horizon/30 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p className="text-dust/50 text-mono-sm font-mono uppercase tracking-widest mb-1">Reports</p>
              <p className="text-star text-2xl font-bold tabular-nums">{totalReports}</p>
            </div>
            <div>
              <p className="text-dust/50 text-mono-sm font-mono uppercase tracking-widest mb-1">Complete</p>
              <p className="text-success text-2xl font-bold tabular-nums">{completeReports.length}</p>
            </div>
            <div>
              <p className="text-dust/50 text-mono-sm font-mono uppercase tracking-widest mb-1">Payments</p>
              <p className="text-star text-2xl font-bold tabular-nums">{totalPayments}</p>
            </div>
            <div>
              <p className="text-dust/50 text-mono-sm font-mono uppercase tracking-widest mb-1">Member Since</p>
              <p className="text-star text-base font-semibold">{formatMemberSince(profile?.created_at ?? null)}</p>
            </div>
          </div>
        </div>

        {/* ── Tab Bar ────────────────────────────────────────────────────── */}
        <div className="flex gap-1 mb-6 p-1 bg-horizon/20 rounded-xl border border-horizon/30">
          {(['overview', 'reports', 'payments', 'settings'] as Tab[]).map(tab => (
            <button
              key={tab}
              onClick={() => switchTab(tab)}
              className={`flex-1 py-2 px-3 rounded-lg text-body-sm font-medium transition-all duration-200 capitalize ${
                activeTab === tab
                  ? 'bg-amber text-space shadow-sm font-semibold'
                  : 'text-dust hover:text-star hover:bg-horizon/30'
              }`}
            >
              {tab === 'overview' ? 'Overview' : tab === 'reports' ? `Reports${reports.length > 0 ? ` (${reports.length})` : ''}` : tab === 'payments' ? 'Payments' : 'Settings'}
            </button>
          ))}
        </div>

        {loadError && (
          <div className="mb-6 px-4 py-3 rounded-card border border-error/30 bg-error/10 text-error font-body text-sm">
            {loadError}
          </div>
        )}

        {/* ── Tab: Overview ──────────────────────────────────────────────── */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Live score card */}
            <RightNowCard />

            {/* Two-column grid for recent reports + last payment */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Recent reports */}
              <div className="card p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-body font-semibold text-star">Recent Reports</h2>
                  <button onClick={() => switchTab('reports')} className="text-amber text-body-sm hover:underline">
                    View all →
                  </button>
                </div>
                {completeReports.length === 0 ? (
                  <div className="text-center py-6">
                    <p className="text-dust/60 text-body-sm mb-3">No completed reports yet.</p>
                    <Link href="/onboard" className="btn-primary text-body-sm px-4 py-2">Generate one →</Link>
                  </div>
                ) : (
                  <ul className="space-y-3">
                    {completeReports.slice(0, 3).map(r => {
                      const avg = getAvgScore(r.day_scores);
                      const tone = scoreTone(avg);
                      return (
                        <li key={r.id}>
                          <Link href={`/report/${r.id}`} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-horizon/20 transition-colors group">
                            <div className={`w-10 h-10 shrink-0 rounded-full border flex items-center justify-center ${tone.border} ${tone.bg}`}>
                              <span className={`text-sm font-bold ${tone.text}`}>{avg ?? '—'}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-star text-body-sm font-medium truncate group-hover:text-amber transition-colors">{r.native_name}</p>
                              <p className="text-dust/60 text-mono-sm font-mono">{formatDateShort(r.created_at)} · {getPlanLabel(r.plan_type)}</p>
                            </div>
                            <PlanBadge plan={r.plan_type} />
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              {/* Last payment + quick action */}
              <div className="card p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-body font-semibold text-star">Billing</h2>
                  <button onClick={() => switchTab('payments')} className="text-amber text-body-sm hover:underline">
                    Full history →
                  </button>
                </div>
                {latestPayment ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-horizon/15 border border-horizon/20">
                      <div>
                        <p className="text-star text-body-sm font-medium">Last payment</p>
                        <p className="text-dust/60 text-mono-sm font-mono mt-0.5">{formatDate(latestPayment.created_at)} · Ziina</p>
                      </div>
                      <p className="text-amber font-mono font-semibold text-base">{formatPaymentAmount(latestPayment.amount, latestPayment.currency)}</p>
                    </div>
                    <p className="text-dust/50 text-mono-sm font-mono">{payments.length} transaction{payments.length !== 1 ? 's' : ''} total</p>
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <p className="text-dust/60 text-body-sm mb-1">No payment history yet.</p>
                    <p className="text-dust/40 text-mono-sm font-mono">Free reports are not billed.</p>
                  </div>
                )}

                {/* Quick CTA */}
                <div className="mt-4 pt-4 border-t border-horizon/20">
                  <Link href="/pricing" className="text-amber/70 hover:text-amber text-body-sm transition-colors">
                    View pricing plans →
                  </Link>
                </div>
              </div>
            </div>

            {/* In-progress reports alert */}
            {reports.filter(r => r.status === 'generating' && !isStale(r)).length > 0 && (
              <div className="card p-4 border-amber/30 bg-amber/5 flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-amber animate-pulse shrink-0" />
                <p className="text-amber text-body-sm">
                  {reports.filter(r => r.status === 'generating' && !isStale(r)).length} report{reports.filter(r => r.status === 'generating' && !isStale(r)).length > 1 ? 's' : ''} currently generating.
                </p>
                <button onClick={() => switchTab('reports')} className="ml-auto text-amber/70 hover:text-amber text-body-sm transition-colors shrink-0">
                  View →
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Reports ───────────────────────────────────────────────── */}
        {activeTab === 'reports' && (
          <div>
            {/* Filter bar */}
            <div className="flex flex-wrap gap-2 mb-5">
              {(['all', 'complete', 'generating', 'failed'] as ReportFilter[]).map(f => (
                <button
                  key={f}
                  onClick={() => setReportFilter(f)}
                  className={`px-3 py-1.5 rounded-full text-body-sm font-medium transition-all border ${
                    reportFilter === f
                      ? 'bg-amber/15 text-amber border-amber/30'
                      : 'text-dust/70 border-horizon/30 hover:border-horizon/60 hover:text-star'
                  }`}
                >
                  {f === 'all' ? `All (${reports.length})` : f === 'complete' ? `Complete (${completeReports.length})` : f === 'generating' ? `Generating (${reports.filter(r => r.status === 'generating' && !isStale(r)).length})` : `Failed (${reports.filter(r => r.status === 'error' || isStale(r)).length})`}
                </button>
              ))}
            </div>

            {filteredReports.length === 0 ? (
              <div className="card p-10 text-center">
                <div className="mb-4 text-4xl opacity-20">✦</div>
                <p className="font-body text-body-lg text-dust mb-5">
                  {reportFilter === 'all' ? 'Your cosmic timeline is empty.' : `No ${reportFilter} reports.`}
                </p>
                {reportFilter === 'all' && (
                  <Link href="/onboard" className="btn-primary px-8 py-3">Generate your first report →</Link>
                )}
              </div>
            ) : (
              <ul className="flex flex-col gap-3">
                {filteredReports.map(report => (
                  <ReportCard key={report.id} report={report} />
                ))}
              </ul>
            )}
          </div>
        )}

        {/* ── Tab: Payments ──────────────────────────────────────────────── */}
        {activeTab === 'payments' && (
          <div>
            {payments.length === 0 ? (
              <div className="card p-10 text-center">
                <div className="mb-4 text-3xl text-amber/40">✦</div>
                <p className="font-body text-body-lg text-dust mb-2">No payment history yet.</p>
                <p className="text-dust/50 text-body-sm mb-6">Free (preview) reports are not billed. Paid reports appear here once payment is verified.</p>
                <Link href="/onboard" className="btn-primary px-8 py-3">Generate a paid report →</Link>
              </div>
            ) : (
              <div className="card overflow-hidden">
                {/* Header */}
                <div className="px-5 py-4 border-b border-horizon/30 flex items-center justify-between">
                  <h2 className="font-body font-semibold text-star">Transaction History</h2>
                  <span className="text-dust/60 text-mono-sm font-mono">{payments.length} transaction{payments.length !== 1 ? 's' : ''}</span>
                </div>
                <ul>
                  {payments.map(p => <PaymentRow key={p.id} payment={p} />)}
                </ul>
                <div className="px-5 py-3 border-t border-horizon/20 bg-horizon/10">
                  <p className="text-dust/40 text-mono-sm font-mono">
                    All payments are final. For refunds, contact support within 24 hours of purchase.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Settings ──────────────────────────────────────────────── */}
        {activeTab === 'settings' && (
          <div className="space-y-6 max-w-xl">
            {/* Account info */}
            <div className="card p-6">
              <h2 className="font-body font-semibold text-star mb-5">Account</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-dust/70 text-mono-sm font-mono uppercase tracking-widest mb-1.5">Email</label>
                  <p className="text-star text-body-sm bg-horizon/20 rounded-card px-3 py-2.5 border border-horizon/30 cursor-not-allowed opacity-70">
                    {profile?.email ?? '—'}
                  </p>
                  <p className="text-dust/40 text-mono-sm font-mono mt-1">Email cannot be changed.</p>
                </div>
                <div>
                  <label className="block text-dust/70 text-mono-sm font-mono uppercase tracking-widest mb-1.5">Display Name</label>
                  <input
                    type="text"
                    value={settingsName}
                    onChange={e => setSettingsName(e.target.value)}
                    placeholder="Your name"
                    className="w-full bg-horizon/20 rounded-card px-3 py-2.5 border border-horizon/30 text-star text-body-sm focus:outline-none focus:border-amber/50 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-dust/70 text-mono-sm font-mono uppercase tracking-widest mb-1">Member Since</label>
                  <p className="text-star/60 text-body-sm">{profile?.created_at ? formatDate(profile.created_at) : '—'}</p>
                </div>
              </div>
            </div>

            {/* Default birth details */}
            <div className="card p-6">
              <h2 className="font-body font-semibold text-star mb-1">Default Birth Details</h2>
              <p className="text-dust/60 text-body-sm mb-5">Pre-fills the onboarding form so you don&apos;t have to re-enter your details each time.</p>
              <div className="space-y-4">
                <div>
                  <label className="block text-dust/70 text-mono-sm font-mono uppercase tracking-widest mb-1.5">Birth Date</label>
                  <input
                    type="date"
                    value={settingsBirthDate}
                    onChange={e => setSettingsBirthDate(e.target.value)}
                    className="w-full bg-horizon/20 rounded-card px-3 py-2.5 border border-horizon/30 text-star text-body-sm focus:outline-none focus:border-amber/50 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-dust/70 text-mono-sm font-mono uppercase tracking-widest mb-1.5">Birth Time</label>
                  <input
                    type="time"
                    value={settingsBirthTime}
                    onChange={e => setSettingsBirthTime(e.target.value)}
                    className="w-full bg-horizon/20 rounded-card px-3 py-2.5 border border-horizon/30 text-star text-body-sm focus:outline-none focus:border-amber/50 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-dust/70 text-mono-sm font-mono uppercase tracking-widest mb-1.5">Birth City</label>
                  <input
                    type="text"
                    value={settingsBirthCity}
                    onChange={e => setSettingsBirthCity(e.target.value)}
                    placeholder="e.g. Mumbai, India"
                    className="w-full bg-horizon/20 rounded-card px-3 py-2.5 border border-horizon/30 text-star text-body-sm focus:outline-none focus:border-amber/50 transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Save button */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => void saveSettings()}
                disabled={settingsSaving}
                className="btn-primary px-6 py-2.5 disabled:opacity-50 flex items-center gap-2"
              >
                {settingsSaving && <span className="w-4 h-4 rounded-full border-2 border-space border-t-transparent animate-spin" />}
                {settingsSaving ? 'Saving…' : 'Save Changes'}
              </button>
              {settingsSaved && <span className="text-success text-body-sm">Changes saved.</span>}
              {settingsError && <span className="text-caution text-body-sm">{settingsError}</span>}
            </div>

            {/* Danger zone */}
            <div className="card p-6 border-caution/20">
              <h2 className="font-body font-semibold text-caution mb-2">Danger Zone</h2>
              <p className="text-dust/60 text-body-sm mb-4">To delete your account and all associated data, email us at support@vedichour.com.</p>
              <a href="mailto:support@vedichour.com?subject=Account%20Deletion%20Request" className="text-caution/70 hover:text-caution text-body-sm transition-colors">
                Request account deletion →
              </a>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

function DashboardSuspenseFallback() {
  return (
    <div className="min-h-[calc(100vh-var(--nav-height))] bg-space">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8 md:py-10">
        <div className="card mb-8 p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="h-16 w-16 rounded-full bg-horizon/30 animate-pulse" />
              <div className="space-y-2.5">
                <div className="h-5 w-40 bg-horizon/40 animate-pulse rounded" />
                <div className="h-3 w-52 bg-horizon/30 animate-pulse rounded" />
              </div>
            </div>
            <div className="h-10 w-32 bg-horizon/30 animate-pulse rounded-button" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSuspenseFallback />}>
      <DashboardInner />
    </Suspense>
  );
}
