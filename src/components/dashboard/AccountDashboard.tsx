'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { isAuthSessionMissingError } from '@supabase/supabase-js';
import { SubscriptionCard } from '@/components/dashboard/SubscriptionCard';
import { createClient } from '@/lib/supabase/client';
import { RightNowCard } from '@/components/dashboard/RightNowCard';
import { DayRating } from '@/components/report/DayRating';
import { ArrowRight, BookOpen, CircleHelp, FileText, RefreshCw, Save } from 'lucide-react';
import CurrencySwitcher from '@/components/landing/CurrencySwitcher';
import { DeviceDraftControls } from '@/components/help/DeviceDraftControls';
import { DashboardLoading } from './DashboardLoading';
import type { PaymentRecord } from '@/app/api/user/payments/route';
import { SavedChartsPanel } from './SavedChartsPanel';
import type { ReportGenerationLogEntry } from '@/lib/observability/generationLog';

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

function StatusBadge({ status, isGenerating, isFailed, isDelayed = false }: { status: string; isGenerating: boolean; isFailed: boolean; isDelayed?: boolean }) {
  if (isFailed) return <span className="rounded-badge px-2 py-0.5 text-label-sm bg-caution/10 text-caution border border-caution/20">Failed</span>;
  if (isDelayed) return <span className="rounded-md px-2 py-0.5 text-sm border border-horizon text-star">Delayed</span>;
  if (isGenerating) return <span className="rounded-badge px-2 py-0.5 text-label-sm bg-amber/10 text-amber border border-amber/20 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-amber animate-pulse" />Generating</span>;
  if (status === 'complete') return <span className="rounded-badge px-2 py-0.5 text-label-sm bg-success/10 text-success border border-success/20">Complete</span>;
  return <span className="rounded-badge px-2 py-0.5 text-label-sm bg-horizon/40 text-dust border border-horizon/20">{status}</span>;
}

/** Expandable append-only pipeline log from `reports.generation_log` (same API as report page). */
function ReportPipelineLogDetails({ reportId, isGenerating }: { reportId: string; isGenerating: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [entries, setEntries] = useState<ReportGenerationLogEntry[] | null>(null);

  const load = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch(`/api/reports/${encodeURIComponent(reportId)}/generation-log`, { credentials: 'include' });
      if (!r.ok) {
        setError(r.status === 404 ? 'Log not found' : `Could not load (HTTP ${r.status})`);
        setEntries([]);
        return;
      }
      const d = (await r.json()) as { entries?: ReportGenerationLogEntry[] };
      setEntries(Array.isArray(d.entries) ? d.entries : []);
    } catch {
      setError('Network error');
      setEntries([]);
    } finally {
      setBusy(false);
    }
  }, [reportId]);

  return (
    <details
      className="group border-t border-horizon/25 pt-3"
      onToggle={(e) => {
        const el = e.currentTarget as HTMLDetailsElement;
        if (el.open) void load();
      }}
    >
      <summary className="cursor-pointer select-none list-none flex items-center justify-between gap-2 text-mono-sm text-dust/65 hover:text-amber/85 font-mono [&::-webkit-details-marker]:hidden">
        <span>
          Pipeline log
          {entries != null && !busy ? <span className="text-dust/45"> · {entries.length} entries</span> : null}
          {isGenerating ? <span className="text-amber/70"> · open to refresh while generating</span> : null}
        </span>
        <span className="text-dust/40 text-[10px] shrink-0 group-open:rotate-180 transition-transform">▼</span>
      </summary>
      <div className="mt-2 flex flex-col gap-2">
        {busy ? <p className="text-mono-sm text-dust/50 font-mono">Loading…</p> : null}
        {error ? <p className="text-body-sm text-caution/90">{error}</p> : null}
        {entries && entries.length === 0 && !busy && !error ? (
          <p className="text-mono-sm text-dust/50 font-mono">No log lines yet (older reports or pre-log deploy).</p>
        ) : null}
        {entries && entries.length > 0 ? (
          <pre className="text-left text-[10px] leading-relaxed text-dust/80 overflow-auto max-h-64 p-3 bg-cosmos/80 rounded-lg border border-horizon/30 font-mono whitespace-pre-wrap">
            {entries.map(
              (e, i) =>
                `${i + 1}. [+${e.elapsed_ms}ms] [${e.level}] ${e.step} — ${e.message}${
                  e.detail && Object.keys(e.detail).length ? ` ${JSON.stringify(e.detail)}` : ''
                }`,
            ).join('\n')}
          </pre>
        ) : null}
        <button
          type="button"
          onClick={(ev) => {
            ev.preventDefault();
            void load();
          }}
          className="self-start text-mono-sm text-amber/70 hover:text-amber font-mono underline-offset-2 hover:underline"
        >
          Refresh log
        </button>
      </div>
    </details>
  );
}

function ReportCard({ report, compact = false }: { report: Report; compact?: boolean }) {
  const avgScore = getAvgScore(report.day_scores);
  const tone = scoreTone(avgScore);
  const isFailed = report.status === 'error' || report.status === 'failed';
  const isGenerating = report.status === 'generating' && !isFailed;
  const isComplete = report.status === 'complete';

  return (
    <li className={`card-interactive flex flex-col gap-3 ${compact ? 'p-4' : 'p-4 sm:p-5'}`}>
      <div className="flex flex-wrap items-center gap-4">
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
            <span className="font-body text-title-lg text-star break-words">{report.native_name}</span>
            <PlanBadge plan={report.plan_type} />
            <StatusBadge status={report.status} isGenerating={isGenerating} isFailed={isFailed} isDelayed={isStale(report)} />
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
            <span>Created {formatDate(report.created_at)}</span>
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
              {isStale(report) ? 'Check delayed report' : 'View progress'} →
            </Link>
          )}
          {isFailed && (
            <Link href={`/report/${report.id}`} className="btn-secondary text-body-sm px-4 py-2">
              Open report →
            </Link>
          )}
        </div>
      </div>

      {isStale(report) && <p className="text-body-sm text-dust">Taking longer than expected. Check the existing report before starting another.</p>}
      {isFailed && <Link href="/help/report-processing" className="text-body-sm text-amber underline underline-offset-4">Help with this report</Link>}
      <ReportPipelineLogDetails reportId={report.id} isGenerating={isGenerating} />
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

/**
 * Resonance loop prompt: "How did yesterday feel?" — shown only when yesterday
 * (UTC) is unrated. Once the user has 5+ rated days, adds one calm alignment
 * line. Renders nothing on 401/fetch failure (zero-noise degradation).
 */
function YesterdayFeelCard({ reports }: { reports: Report[] }) {
  const [state, setState] = useState<{
    yesterdayRated: boolean;
    stats: { n: number; aligned: number } | null;
  } | null>(null);

  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/day-rating', { credentials: 'include' });
        if (!res.ok) return; // signed out / table not live yet → render nothing
        const j = (await res.json()) as {
          ratings?: Array<{ rated_date?: string }>;
          stats?: { n?: number; aligned?: number } | null;
        };
        if (cancelled) return;
        const rated = (j.ratings ?? []).some(r => r.rated_date === yesterday);
        const stats =
          j.stats && typeof j.stats.n === 'number' && typeof j.stats.aligned === 'number'
            ? { n: j.stats.n, aligned: j.stats.aligned }
            : null;
        setState({ yesterdayRated: rated, stats });
      } catch {
        // zero-noise degradation
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!state) return null;
  const showPrompt = !state.yesterdayRated;
  const showStats = state.stats != null && state.stats.n >= 5;
  if (!showPrompt && !showStats) return null;

  // Predicted score for yesterday if a completed report covers it (cheap — the
  // dashboard already loads day_scores); omitted otherwise.
  const source = reports.find(
    r => r.status === 'complete' && r.day_scores && typeof r.day_scores[yesterday] === 'number'
  );

  return (
    <div className="w-full max-w-xl mx-auto card p-5 sm:p-6">
      {showPrompt && (
        <DayRating
          date={yesterday}
          predictedScore={source?.day_scores?.[yesterday]}
          reportId={source?.id}
          question="How did yesterday actually feel?"
        />
      )}
      {showStats && (
        <p className={`font-mono text-mono-sm text-dust/60 ${showPrompt ? 'mt-4 pt-4 border-t border-horizon/20' : ''}`}>
          Your clearer windows aligned on {state.stats!.aligned} of {state.stats!.n} rated days.
        </p>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

function DashboardInner({ checkoutEnabled }: { checkoutEnabled: boolean }) {
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
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [profileUnavailable, setProfileUnavailable] = useState(false);
  const [reportsUnavailable, setReportsUnavailable] = useState(false);
  const [paymentsUnavailable, setPaymentsUnavailable] = useState(false);
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
    let cancelled = false;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      cancelled = true;
      controller.abort();
      setLoadError('Loading took too long. Your saved records were not changed. Retry loading or check sign-in help.');
      setProfileUnavailable(true);
      setReportsUnavailable(true);
      setPaymentsUnavailable(true);
      setLoading(false);
    }, 20_000);
    async function load() {
      setLoading(true);
      setLoadError(null);
      try {
      const supabase = createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (cancelled) return;
      if (!user) {
        if (!authError || isAuthSessionMissingError(authError)) {
          router.replace(`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
          return;
        }
        throw authError;
      }
      if (authError) throw authError;

      // Fetch all data in parallel including payments (needed for Overview tab stats)
      const [{ data: profData, error: profError }, { data: reps, error: repsError }, paymentsRes] = await Promise.all([
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
          .limit(200),
        fetch('/api/user/payments', { credentials: 'include', cache: 'no-store', signal: controller.signal })
          .then(async r => {
            if (!r.ok) throw new Error('Payment history unavailable');
            const json = await r.json() as { payments?: PaymentRecord[] };
            if (!Array.isArray(json.payments)) throw new Error('Invalid payment response');
            return { payments: json.payments, unavailable: false };
          })
          .catch(() => ({ payments: [] as PaymentRecord[], unavailable: true })),
      ]);
      if (cancelled) return;
      setProfileUnavailable(Boolean(profError));
      setReportsUnavailable(Boolean(repsError));
      setPaymentsUnavailable(paymentsRes.unavailable);
      const unavailable = [profError && 'account settings', repsError && 'forecasts', paymentsRes.unavailable && 'payment history'].filter(Boolean);
      if (unavailable.length) setLoadError(`Could not load ${unavailable.join(', ')}. Existing records were not changed. Retry loading.`);

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
      if (!repsError) setReports((reps as Report[]) || []);
      if (!paymentsRes.unavailable) setPayments(paymentsRes.payments);

      // Pre-fill settings form from profile (or fallback)
      if (!profError) {
      setSettingsName(resolvedProfile.display_name ?? '');
      setSettingsBirthDate(resolvedProfile.default_birth_date ?? '');
      setSettingsBirthTime(resolvedProfile.default_birth_time ?? '');
      setSettingsBirthCity(resolvedProfile.default_birth_city ?? '');
      }
      } catch {
        if (!cancelled) {
          setLoadError('Could not load your account. Check your connection and retry. Your records were not changed.');
          setProfileUnavailable(true);
          setReportsUnavailable(true);
          setPaymentsUnavailable(true);
        }
      } finally {
        clearTimeout(timer);
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; clearTimeout(timer); controller.abort(); };
  }, [router, loadAttempt]);

  const saveSettings = useCallback(async () => {
    if (profileUnavailable || settingsSaving) return;
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
      setSettingsError('We could not confirm the save. Your form is still here; check your connection and try again.');
    } finally {
      setSettingsSaving(false);
    }
  }, [settingsName, settingsBirthDate, settingsBirthTime, settingsBirthCity, profileUnavailable, settingsSaving]);

  // ── Derived data ────────────────────────────────────────────────────────────

  const completeReports = reports.filter(r => r.status === 'complete');
  const latestCompleteReport = completeReports[0] ?? null;

  // Stats. Exclude pre-payment draft rows (pending+unpaid) so counts match the visible
  // list, and count only COMPLETED payments so an abandoned checkout's pending draft
  // never shows as a real charge on the overview.
  const visibleReports = reports.filter(r => !(r.status === 'pending' && r.payment_status === 'unpaid'));
  const totalReports = visibleReports.length;
  const completedPayments = payments.filter(p => p.status === 'completed');
  const totalPayments = completedPayments.length;

  // Most recent COMPLETED payment for overview tab
  const latestPayment = completedPayments[0] ?? null;

  // Filtered reports
  const filteredReports = reports.filter(r => {
    // Hide pre-payment draft rows: a paid checkout persists a pending/unpaid draft
    // BEFORE payment (see /api/ziina/create-intent). Abandoned checkouts leave these
    // behind; they aren't real reports the user generated, so keep them off the list.
    if (r.status === 'pending' && r.payment_status === 'unpaid') return false;
    if (reportFilter === 'all') return true;
    if (reportFilter === 'complete') return r.status === 'complete';
    if (reportFilter === 'generating') return r.status === 'generating';
    if (reportFilter === 'failed') return r.status === 'error' || r.status === 'failed';
    return true;
  });

  const displayName = profile?.display_name ?? profile?.email?.split('@')[0] ?? 'Your account';
  const initials = getInitials(profile?.display_name ?? profile?.email ?? null);

  // ── Loading state ───────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-var(--nav-height))] items-center justify-center bg-space">
        <div role="status" className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-amber border-t-transparent animate-spin" />
          <p className="font-body text-body-sm text-dust">Loading your saved reports...</p>
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

  const tabs: Tab[] = ['overview', 'reports', 'payments', 'settings'];
  const tabLabel = (tab: Tab) => tab === 'overview' ? 'Saved work' : tab === 'reports' ? 'Forecasts' : tab === 'payments' ? 'Payments' : 'Settings';
  const emptyForecasts = (
    <div className="border-y border-horizon py-6">
      <h2 className="font-semibold text-star">No saved forecasts found in this account</h2>
      <p className="mt-2 text-sm leading-relaxed text-dust">A free calculator result or an emailed quiz chart is separate from an account report. You can still explore a free chart.</p>
      <div className="mt-4 flex flex-wrap gap-4">
        <Link href="/free-kundli" className="btn-primary min-h-11 px-4 py-2.5 text-sm">Free birth chart</Link>
        <Link href="/sample-report" className="inline-flex min-h-11 items-center gap-2 text-sm text-amber"><BookOpen aria-hidden="true" className="h-4 w-4" />Example reading</Link>
        <Link href="/help/existing-reports" className="inline-flex min-h-11 items-center text-sm text-amber">Find an existing report</Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-[calc(100vh-var(--nav-height))] bg-space font-body text-star">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 md:py-10 lg:px-8">
        <header className="mb-6 border-b border-horizon pb-6">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="flex min-w-0 items-center gap-3">
              <div aria-hidden="true" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-horizon bg-horizon/20 text-lg font-semibold">{initials}</div>
              <div className="min-w-0"><h1 className="break-words text-xl font-semibold">{displayName}</h1>{profile?.email && <p className="mt-1 break-all text-sm text-dust">{profile.email}</p>}</div>
            </div>
            <div className="flex flex-wrap gap-4">
              <Link href="/free-kundli" className="inline-flex min-h-11 items-center gap-2 text-sm text-amber"><FileText aria-hidden="true" className="h-4 w-4" />Free chart</Link>
              <Link href="/sample-report" className="inline-flex min-h-11 items-center gap-2 text-sm text-amber"><BookOpen aria-hidden="true" className="h-4 w-4" />Example</Link>
              <Link href="/help" className="inline-flex min-h-11 items-center gap-2 text-sm text-amber"><CircleHelp aria-hidden="true" className="h-4 w-4" />Help</Link>
            </div>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-dust">Open work already in your account. No new purchase is needed to retrieve an existing report you have access to.</p>
          <dl className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div><dt className="text-xs text-dust">Saved forecasts</dt><dd className="mt-1 text-xl font-semibold tabular-nums">{reportsUnavailable ? 'Unavailable' : totalReports}</dd></div>
            <div><dt className="text-xs text-dust">Complete</dt><dd className="mt-1 text-xl font-semibold tabular-nums">{reportsUnavailable ? 'Unavailable' : completeReports.length}</dd></div>
            <div><dt className="text-xs text-dust">Completed payments</dt><dd className="mt-1 text-xl font-semibold tabular-nums">{paymentsUnavailable ? 'Unavailable' : totalPayments}</dd></div>
            <div><dt className="text-xs text-dust">Member since</dt><dd className="mt-1 text-base font-medium">{formatMemberSince(profile?.created_at ?? null)}</dd></div>
          </dl>
        </header>

        <div role="tablist" aria-label="Dashboard sections" className="mb-6 grid grid-cols-2 gap-1 rounded-lg border border-horizon p-1 sm:grid-cols-4">
          {tabs.map(tab => <button key={tab} id={`dashboard-tab-${tab}`} type="button" role="tab" aria-selected={activeTab === tab} aria-controls={`dashboard-panel-${tab}`} tabIndex={activeTab === tab ? 0 : -1} onClick={() => switchTab(tab)} onKeyDown={event => {
            const index = tabs.indexOf(tab);
            const next = event.key === 'ArrowRight' ? tabs[(index + 1) % tabs.length] : event.key === 'ArrowLeft' ? tabs[(index + tabs.length - 1) % tabs.length] : event.key === 'Home' ? tabs[0] : event.key === 'End' ? tabs[tabs.length - 1] : null;
            if (next) { event.preventDefault(); switchTab(next); document.getElementById(`dashboard-tab-${next}`)?.focus(); }
          }} className={`min-h-11 rounded-md px-2 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber ${activeTab === tab ? 'bg-amber text-space' : 'text-dust hover:text-star'}`}>{tabLabel(tab)}</button>)}
        </div>

        {loadError && <div role="alert" className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-caution/40 p-4 text-sm">
          <p className="min-w-0 flex-1">{loadError}</p>
          <button type="button" onClick={() => setLoadAttempt(value => value + 1)} className="inline-flex min-h-11 items-center gap-2 px-3 text-amber"><RefreshCw aria-hidden="true" className="h-4 w-4" />Retry loading</button>
          <Link href="/help/sign-in" className="inline-flex min-h-11 items-center text-amber">Sign-in help</Link>
        </div>}

        <div id={`dashboard-panel-${activeTab}`} role="tabpanel" aria-labelledby={`dashboard-tab-${activeTab}`} tabIndex={0}>
          {activeTab === 'overview' && <div className="space-y-7">
            <section aria-labelledby="saved-forecasts-heading">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 id="saved-forecasts-heading" className="text-lg font-semibold">Saved forecasts</h2><button type="button" onClick={() => switchTab('reports')} className="inline-flex min-h-11 items-center gap-2 text-sm text-amber">All forecasts<ArrowRight aria-hidden="true" className="h-4 w-4" /></button></div>
              {reportsUnavailable ? <p className="text-sm text-dust">Forecasts could not be retrieved. Retry loading above.</p> : visibleReports.length === 0 ? emptyForecasts : <ul className="space-y-3">{visibleReports.slice(0, 3).map(report => <ReportCard key={report.id} report={report} compact />)}</ul>}
              {visibleReports.length >= 200 && <p className="mt-3 text-sm text-dust">Showing the 200 most recent forecasts. Contact support for an older report.</p>}
            </section>
            <SavedChartsPanel />
            <SubscriptionCard checkoutEnabled={checkoutEnabled} />
            <section className="border-y border-horizon py-5">
              <div className="flex items-center justify-between gap-3"><h2 className="text-lg font-semibold">Payment history</h2><button type="button" onClick={() => switchTab('payments')} className="min-h-11 text-sm text-amber">Full history</button></div>
              {paymentsUnavailable ? <p className="text-sm text-dust">Payment history could not be retrieved. Retry loading above.</p> : latestPayment ? <p className="mt-2 text-sm text-dust">Last completed payment: {formatPaymentAmount(latestPayment.amount, latestPayment.currency)}, {formatDate(latestPayment.created_at)}.</p> : <p className="mt-2 text-sm text-dust">No completed payments found in this account.</p>}
              <Link href="/help/existing-reports" className="mt-2 inline-flex min-h-11 items-center text-sm text-amber">Help with an existing purchase</Link>
            </section>
            {latestCompleteReport && <RightNowCard />}
            {latestCompleteReport && <YesterdayFeelCard reports={reports} />}
          </div>}

          {activeTab === 'reports' && <div className="space-y-6">
            <SavedChartsPanel />
            <section aria-labelledby="all-forecasts-heading">
              <h2 id="all-forecasts-heading" className="mb-4 text-lg font-semibold">Saved forecasts</h2>
              <div role="group" aria-label="Forecast status" className="mb-5 flex flex-wrap gap-2">
                {(['all', 'complete', 'generating', 'failed'] as ReportFilter[]).map(filter => <button key={filter} type="button" aria-pressed={reportFilter === filter} onClick={() => setReportFilter(filter)} className={`min-h-11 rounded-md border px-3 text-sm focus-visible:ring-2 focus-visible:ring-amber ${reportFilter === filter ? 'border-amber bg-amber/10 text-star' : 'border-horizon text-dust'}`}>{filter === 'all' ? 'All' : filter === 'complete' ? 'Complete' : filter === 'generating' ? 'Processing' : 'Failed'}</button>)}
              </div>
              {reportsUnavailable ? <p className="text-sm text-dust">Forecasts could not be retrieved. Retry loading above.</p> : filteredReports.length ? <ul className="space-y-3">{filteredReports.map(report => <ReportCard key={report.id} report={report} />)}</ul> : reportFilter === 'all' ? emptyForecasts : <p role="status" className="border-y border-horizon py-6 text-sm text-dust">No {reportFilter === 'generating' ? 'processing' : reportFilter} forecasts found.</p>}
              {visibleReports.length >= 200 && <p className="mt-3 text-sm text-dust">Showing the 200 most recent forecasts. Contact support for an older report.</p>}
            </section>
          </div>}

          {activeTab === 'payments' && <section aria-labelledby="payments-heading">
            <h2 id="payments-heading" className="mb-4 text-lg font-semibold">Payment history</h2>
            {paymentsUnavailable ? <p className="text-sm text-dust">Payment history could not be retrieved. Retry loading above.</p> : payments.length ? <><ul className="divide-y divide-horizon border-y border-horizon">{payments.map(payment => <PaymentRow key={payment.id} payment={payment} />)}</ul>{payments.length >= 50 && <p className="mt-3 text-sm text-dust">Showing the 50 most recent transactions. Contact support for older payment history.</p>}</> : <p className="border-y border-horizon py-6 text-sm text-dust">No payment history found in this account. Free calculator results are not billed.</p>}
            <p className="mt-4 text-sm leading-relaxed text-dust">For an existing purchase, contact <a href="mailto:support@vedichour.com" className="text-amber underline underline-offset-4">support@vedichour.com</a> with its reference. See the <Link href="/refund" className="text-amber underline underline-offset-4">refund policy</Link> for applicable terms. Never send card details.</p>
          </section>}

          {activeTab === 'settings' && <div className="max-w-xl space-y-7">
            {profileUnavailable && <p role="alert" className="text-sm text-dust">Account preferences could not be loaded. Saving is disabled so missing data cannot overwrite your existing preferences.</p>}
            <form onSubmit={event => { event.preventDefault(); void saveSettings(); }} className="space-y-6">
              <fieldset disabled={profileUnavailable || settingsSaving} className="space-y-6 disabled:opacity-60">
                <legend className="mb-4 text-lg font-semibold">Account preferences</legend>
                <div><p className="mb-1 text-sm font-medium">Email</p><p className="break-all text-sm text-dust">{profile?.email ?? 'Unavailable'}</p><p className="mt-1 text-xs text-dust">Email cannot be changed here.</p></div>
                <div><label htmlFor="settings-name" className="mb-2 block text-sm font-medium">Display name</label><input id="settings-name" type="text" value={settingsName} maxLength={100} onChange={event => { setSettingsName(event.target.value); setSettingsSaved(false); }} autoComplete="name" className="min-h-11 w-full rounded-md border border-horizon bg-cosmos px-3 py-2 text-base text-star focus-visible:ring-2 focus-visible:ring-amber" /></div>
                <section className="border-t border-horizon pt-5"><h2 className="text-base font-semibold">Default birth details</h2><p className="mt-2 text-sm leading-relaxed text-dust">Used by forms that support account defaults. Changing these does not edit an existing report. Leave the time blank if you do not know it.</p></section>
                <div><label htmlFor="settings-birth-date" className="mb-2 block text-sm font-medium">Birth date</label><input id="settings-birth-date" type="date" value={settingsBirthDate} max={new Date().toISOString().slice(0, 10)} onChange={event => { setSettingsBirthDate(event.target.value); setSettingsSaved(false); }} className="min-h-11 w-full rounded-md border border-horizon bg-cosmos px-3 py-2 text-base text-star focus-visible:ring-2 focus-visible:ring-amber" /></div>
                <div><label htmlFor="settings-birth-time" className="mb-2 block text-sm font-medium">Recorded birth time (optional)</label><input id="settings-birth-time" type="time" value={settingsBirthTime} aria-describedby="settings-time-help" onChange={event => { setSettingsBirthTime(event.target.value); setSettingsSaved(false); }} className="min-h-11 w-full rounded-md border border-horizon bg-cosmos px-3 py-2 text-base text-star focus-visible:ring-2 focus-visible:ring-amber" /><p id="settings-time-help" className="mt-2 text-sm text-dust">Local time at the birthplace, not a guessed time. <Link href="/help/birth-time" className="text-amber underline">Time help</Link></p></div>
                <div><label htmlFor="settings-birth-city" className="mb-2 block text-sm font-medium">Birth city (optional)</label><input id="settings-birth-city" type="text" value={settingsBirthCity} maxLength={200} placeholder="City, country" onChange={event => { setSettingsBirthCity(event.target.value); setSettingsSaved(false); }} aria-describedby="settings-city-help" className="min-h-11 w-full rounded-md border border-horizon bg-cosmos px-3 py-2 text-base text-star focus-visible:ring-2 focus-visible:ring-amber" /><p id="settings-city-help" className="mt-2 text-sm text-dust">This saves the label only. Select and confirm a city in the calculator before calculating.</p></div>
              </fieldset>
              <button type="submit" disabled={profileUnavailable || settingsSaving} className="btn-primary min-h-11 gap-2 px-5 py-2.5 text-sm disabled:opacity-50"><Save aria-hidden="true" className="h-4 w-4" />{settingsSaving ? 'Saving...' : 'Save preferences'}</button>
              <p role="status" aria-live="polite" className="text-sm text-success">{settingsSaved ? 'Preferences saved. Existing reports were not changed.' : ''}</p>
              {settingsError && <p role="alert" className="text-sm text-caution">{settingsError}</p>}
            </form>
            <section className="border-t border-horizon pt-5"><h2 className="mb-3 text-base font-semibold">Currency preference</h2><CurrencySwitcher size="md" /><p className="mt-2 text-sm text-dust">This changes price display, not saved payments or offer availability.</p></section>
            <DeviceDraftControls />
            <section><h2 className="text-base font-semibold">Account data and privacy</h2><p className="mt-2 text-sm leading-relaxed text-dust">For access, correction or deletion requests, contact <a href="mailto:privacy@vedichour.com" className="text-amber underline">privacy@vedichour.com</a>. Clearing a device draft does not delete account data.</p><Link href="/chart-privacy" className="mt-2 inline-flex min-h-11 items-center text-sm text-amber">Privacy notice and controls</Link></section>
          </div>}
        </div>
      </div>
    </div>
  );
}

function DashboardSuspenseFallback() {
  return <DashboardLoading />;
}

export default function AccountDashboard({ checkoutEnabled = false }: { checkoutEnabled?: boolean }) {
  return (
    <Suspense fallback={<DashboardSuspenseFallback />}>
      <DashboardInner checkoutEnabled={checkoutEnabled} />
    </Suspense>
  );
}
