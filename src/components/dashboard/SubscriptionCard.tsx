'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { track } from '@/components/analytics/PostHogProvider';
import { daysLeft, RENEW_REMINDER_DAYS, type SubscriptionPlan } from '@/lib/subscriptions/period';

interface LatestReport {
  native_name: string | null;
  birth_date: string | null;
  birth_time: string | null;
  birth_city: string | null;
  birth_lat: number | null;
  birth_lng: number | null;
  current_city: string | null;
  current_lat: number | null;
  current_lng: number | null;
  personal_context: string | null;
}

interface Status {
  signedIn: boolean;
  subscription: { plan: SubscriptionPlan; currentPeriodEnd: string; active: boolean } | null;
  nextForecastUnlock?: string | null;
  latestReport?: LatestReport | null;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

/**
 * Subscription status on the dashboard, plus the two things a subscriber actually needs:
 * starting their next 30-day forecast (yearly subscribers get one a month — nothing else in
 * the product would start it), and renewing near or after the end of a period. Ziina cannot
 * charge a card again on its own, so renewal is always the customer's tap.
 */
export function SubscriptionCard() {
  const router = useRouter();
  const [status, setStatus] = useState<Status | null>(null);
  const [starting, setStarting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/subscription/status', { cache: 'no-store' })
      .then((r) => (r.ok ? (r.json() as Promise<Status>) : null))
      .then(setStatus)
      .catch(() => {
        /* the rest of the dashboard still works */
      });
  }, []);

  if (!status?.signedIn) return null;
  const sub = status.subscription;

  if (!sub) {
    return (
      <div className="card p-5 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
        <div>
          <h2 className="font-body font-semibold text-star">Your hour-by-hour forecast</h2>
          <p className="font-body text-body-sm text-dust mt-1">
            Take a short quiz and subscribe for your next 30 days, planned hour by hour.
          </p>
        </div>
        <Link href="/start" className="btn-primary px-5 py-2.5 text-body-sm shrink-0 justify-center">
          Start with the quiz →
        </Link>
      </div>
    );
  }

  const left = daysLeft({ current_period_end: sub.currentPeriodEnd });
  const unlockAt = status.nextForecastUnlock ? new Date(status.nextForecastUnlock) : null;
  const cooling = unlockAt !== null && unlockAt.getTime() > Date.now();
  const canStart = sub.active && !cooling && Boolean(status.latestReport);
  const showRenew = !sub.active || left <= RENEW_REMINDER_DAYS[sub.plan];
  const planName = sub.plan === 'annual' ? 'Yearly' : 'Monthly';

  async function startNextForecast() {
    const r = status?.latestReport;
    if (!r || starting) return;
    setStarting(true);
    setMessage(null);
    const reportId = crypto.randomUUID();
    track('subscriber_next_forecast', { plan: sub!.plan });
    try {
      const res = await fetch('/api/reports/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          reportId,
          plan_type: 'monthly',
          name: r.native_name ?? undefined,
          birth_date: r.birth_date,
          birth_time: r.birth_time,
          birth_city: r.birth_city,
          birth_lat: r.birth_lat,
          birth_lng: r.birth_lng,
          ...(r.current_city && r.current_lat != null && r.current_lng != null
            ? { current_city: r.current_city, current_lat: r.current_lat, current_lng: r.current_lng }
            : {}),
          ...(r.personal_context ? { personal_context: r.personal_context } : {}),
        }),
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (res.ok) {
        router.push(`/report/${reportId}`);
        return;
      }
      setMessage(j.error ?? 'We could not start your forecast. Please try again.');
    } catch {
      setMessage('Network problem — please check your connection and try again.');
    } finally {
      setStarting(false);
    }
  }

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="font-body font-semibold text-star">Your subscription</h2>
          <p className="font-body text-body-sm text-dust mt-1">
            {sub.active
              ? `${planName} · active until ${formatDate(sub.currentPeriodEnd)} (${left} day${left === 1 ? '' : 's'} left)`
              : `Your ${planName.toLowerCase()} subscription ended on ${formatDate(sub.currentPeriodEnd)}.`}
          </p>
        </div>
        <span
          className={`shrink-0 px-2.5 py-1 rounded-pill font-body text-body-sm ${
            sub.active ? 'bg-success/10 text-success' : 'bg-caution/10 text-caution'
          }`}
        >
          {sub.active ? 'Active' : 'Ended'}
        </span>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        {canStart && (
          <button
            type="button"
            onClick={() => void startNextForecast()}
            disabled={starting}
            className="btn-primary px-5 py-2.5 text-body-sm justify-center disabled:opacity-60"
          >
            {starting ? 'Starting…' : 'Start my next 30-day forecast'}
          </button>
        )}
        {showRenew && (
          <Link href="/start?renew=1" className="btn-secondary px-5 py-2.5 text-body-sm justify-center">
            {sub.active ? 'Renew now' : 'Renew my subscription'}
          </Link>
        )}
      </div>

      {sub.active && cooling && unlockAt && (
        <p className="font-body text-body-sm text-dust mt-3">
          Your next 30-day forecast unlocks on {formatDate(unlockAt.toISOString())}.
        </p>
      )}
      {sub.active && showRenew && (
        <p className="font-body text-body-sm text-dust mt-3">
          Renewing early adds a new period after this one ends, so you never lose days. Nothing is charged
          automatically.
        </p>
      )}
      {message && (
        <p role="alert" className="font-body text-body-sm text-caution mt-3">
          {message}
        </p>
      )}
    </div>
  );
}
