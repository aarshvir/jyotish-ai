import Link from 'next/link';
import { redirect } from 'next/navigation';
import { StarField } from '@/components/ui/StarField';
import { ShieldCheckIcon } from '@/components/ui/ShieldCheckIcon';
import { UpsellButton } from './_UpsellButton';
import { DismissToReport } from './_DismissToReport';
import { createClient } from '@/lib/supabase/server';
import { headers } from 'next/headers';
import { currencyFromHeader } from '@/lib/pricing';
import { getMonthlyUpgradeAmount, formatAmount } from '@/lib/ziina/server';
import { isEntitledPaymentStatus } from '@/lib/reports/entitlement';

export const dynamic = 'force-dynamic';

interface Props {
  searchParams: { reportId?: string; offerType?: string; src?: string };
}

export default async function UpsellPage({ searchParams }: Props) {
  const reportId = searchParams.reportId?.trim();
  if (!reportId) {
    redirect('/dashboard');
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/upsell?reportId=${reportId}`)}`);
  }

  const { data: rep } = await supabase
    .from('reports')
    .select('id, plan_type, payment_status, native_name, upsell_dismissed_at')
    .eq('id', reportId)
    .eq('user_id', user.id)
    .maybeSingle();

  // Entitlement, not revenue — must match /api/ziina/upgrade or the page offers an
  // upgrade the API then refuses (or vice-versa).
  if (!rep || !isEntitledPaymentStatus(rep.payment_status)) {
    redirect('/onboard');
  }
  if (rep.plan_type !== '7day') {
    redirect(`/report/${reportId}`);
  }
  // The dismissed flag only suppresses the AUTOMATIC post-payment interstitial.
  // An intentional visit from the in-report "Extend to 30 days" strip (?src=report)
  // must always work — this is the highest-intent repeat-revenue moment.
  if (rep.upsell_dismissed_at && searchParams.src !== 'report') {
    redirect(`/report/${reportId}`);
  }

  // Localized upgrade price — matches the currency the upgrade route will charge
  // (middleware sets x-currency from the vh_currency cookie → geo, same as /api/ziina/upgrade).
  const h = await headers();
  const upgradeCurrency = currencyFromHeader(h.get('x-currency'));
  const upgradeLabel = formatAmount(getMonthlyUpgradeAmount(upgradeCurrency), upgradeCurrency);

  return (
    <div className="min-h-[calc(100vh-var(--nav-height))] bg-space flex flex-col items-center justify-center p-6">
      <StarField />

      <div className="max-w-2xl w-full card border-amber/30 bg-cosmos relative z-10 p-8 md:p-12 overflow-hidden shadow-glow-amber">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <span className="text-9xl">✦</span>
        </div>

        <div className="text-center mb-6 relative z-10">
          <div className="inline-flex items-center gap-2 mb-6 px-4 py-1.5 rounded-pill bg-success/10 border border-success/30 text-success text-sm font-mono tracking-wide">
            <span className="w-2 h-2 rounded-full bg-success"></span>
            Payment Successful
          </div>
          <h1 className="text-display-md text-star font-display mb-4">Upgrade your foresight</h1>
          <p className="text-dust text-lg">
            {rep.native_name ? `Hi ${rep.native_name} — ` : ''}
            Your 7-day forecast is generating. Add the <strong className="text-amber">30-Day Monthly Oracle</strong> at a one-time loyalty discount.
          </p>
        </div>

        {/* No countdown: a fake client-side timer is manufactured urgency — the calm,
            credible brand sells timing awareness, not pressure. */}
        <div className="bg-nebula border border-horizon rounded-lg p-6 mb-8 relative z-10 text-left">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-amber font-body font-semibold text-xl">30-Day Monthly Oracle</h3>
              <p className="text-dust/70 text-sm">Upgrade delta ({upgradeLabel} after loyalty discount)</p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-bold text-success">+{upgradeLabel}</span>
              <p className="text-xs text-dust/60">one-time · Ziina checkout</p>
            </div>
          </div>
          <ul className="space-y-3 mb-6">
            {[
              'Extended 30-day timeline',
              'Same birth chart — deeper timing layers',
              'Keeps your first 7 days — we append days 8–30',
            ].map((f) => (
              <li key={f} className="flex gap-3 text-sm text-star/80">
                <span className="text-amber">✓</span> {f}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col gap-4 relative z-10">
          <div className="flex items-center justify-center gap-2 text-sm text-success/80">
            <ShieldCheckIcon className="h-4 w-4 shrink-0" />
            <Link href="/refund" className="hover:underline font-mono text-mono-sm">
              24-hour money-back guarantee — full refund, no questions.
            </Link>
          </div>
          <UpsellButton reportId={reportId} />
          <DismissToReport reportId={reportId} />
        </div>
      </div>
    </div>
  );
}
