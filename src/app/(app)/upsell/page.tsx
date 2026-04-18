import Link from 'next/link';
import { StarField } from '@/components/ui/StarField';

export default function UpsellPage() {
  return (
    <div className="min-h-[calc(100vh-var(--nav-height))] bg-space flex flex-col items-center justify-center p-6">
      <StarField />
      
      <div className="max-w-2xl w-full card border-amber/30 bg-cosmos relative z-10 p-8 md:p-12 overflow-hidden shadow-glow-amber">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <span className="text-9xl">✦</span>
        </div>
        
        <div className="text-center mb-10 relative z-10">
          <div className="inline-flex items-center gap-2 mb-6 px-4 py-1.5 rounded-pill bg-success/10 border border-success/30 text-success text-sm font-mono tracking-wide">
            <span className="w-2 h-2 rounded-full bg-success"></span>
            Payment Successful
          </div>
          <h1 className="text-display-md text-star font-display mb-4">Wait! Upgrade your foresight.</h1>
          <p className="text-dust text-lg">
            Your 7-Day Forecast is being generated. While you wait, unlock the full <strong className="text-amber">30-Day Monthly Oracle</strong> at an exclusive one-time discount.
          </p>
        </div>

        <div className="bg-nebula border border-horizon rounded-lg p-6 mb-8 relative z-10 text-left">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-amber font-body font-semibold text-xl">30-Day Monthly Oracle</h3>
              <p className="text-dust/70 text-sm">Normally $19.99</p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-bold text-success">+$9.00</span>
              <p className="text-xs text-dust/60">One-time upgrade</p>
            </div>
          </div>
          <ul className="space-y-3 mb-6">
            {['Extended 30-day timeline', 'Deep Nativity Profile analysis', 'PDF Export enabled', 'Month-over-month synthesis'].map(f => (
              <li key={f} className="flex gap-3 text-sm text-star/80">
                <span className="text-amber">✓</span> {f}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col gap-4 relative z-10">
          <button className="btn-primary w-full py-4 text-base font-semibold shadow-elevated">
            Upgrade to Monthly Oracle (+$9.00)
          </button>
          <Link href="/dashboard?success=true" className="text-center text-dust/60 hover:text-dust text-sm transition-colors py-2 uppercase tracking-wide font-mono">
            No thanks, just take me to my 7-Day report
          </Link>
        </div>
      </div>
    </div>
  );
}
