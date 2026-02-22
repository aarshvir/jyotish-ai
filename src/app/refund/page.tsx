import Link from 'next/link';
import { StarField } from '@/components/ui/StarField';
import { MandalaRing } from '@/components/ui/MandalaRing';

export default function RefundPage() {
  return (
    <main className="relative min-h-screen bg-space flex flex-col items-center justify-center px-6 py-20 overflow-hidden">
      <StarField />

      {/* Background mandala */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.04]">
        <MandalaRing className="w-[600px] h-[600px] text-amber" />
      </div>

      <div className="relative z-10 max-w-2xl w-full">
        {/* Logo */}
        <div className="text-center mb-10">
          <Link href="/" className="inline-block">
            <span className="font-display font-semibold text-xl tracking-[0.15em] text-star/70 hover:text-amber transition-colors">
              JYOTISH AI
            </span>
          </Link>
        </div>

        {/* Card */}
        <div className="bg-cosmos border border-horizon rounded-sm p-10 md:p-12">
          {/* Shield icon */}
          <div className="flex justify-center mb-8">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" className="text-emerald">
              <path 
                d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" 
                stroke="currentColor" 
                strokeWidth="1.5" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                fill="none" 
              />
              <path 
                d="M9 12l2 2 4-4" 
                stroke="currentColor" 
                strokeWidth="1.5" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
              />
            </svg>
          </div>

          {/* Heading */}
          <h1 
            className="font-display font-semibold text-star text-center mb-6"
            style={{ fontSize: 'clamp(32px, 4vw, 48px)' }}
          >
            Money-Back Guarantee
          </h1>

          {/* Body */}
          <div className="space-y-6 font-body text-dust text-base leading-relaxed">
            <p>
              We stand behind the quality of our Vedic astrology reports. If you're not completely satisfied 
              with your report within <span className="text-star font-medium">48 hours of purchase</span>, 
              we'll refund your payment in full.
            </p>

            <p>
              Simply email us at{' '}
              <a 
                href="mailto:support@jyotish-ai.com" 
                className="text-amber hover:text-amber-glow transition-colors font-medium"
              >
                support@jyotish-ai.com
              </a>{' '}
              with your order details. No questions asked, no hassle.
            </p>

            <div className="pt-6 border-t border-horizon/40">
              <p className="font-mono text-xs text-dust/70 tracking-wide">
                This guarantee applies to all paid reports (7-Day Forecast and Monthly Oracle). 
                Refunds are processed within 3-5 business days.
              </p>
            </div>
          </div>

          {/* CTA */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/onboard"
              className="inline-flex items-center gap-2 px-8 py-3 bg-amber text-space font-body font-medium text-sm rounded-sm hover:bg-amber-glow transition-colors"
            >
              Get Your Report
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-8 py-3 border border-horizon text-dust font-body text-sm rounded-sm hover:border-amber/40 hover:text-star transition-all"
            >
              Back to Home
            </Link>
          </div>
        </div>

        {/* Additional info */}
        <p className="text-center font-mono text-xs text-dust/40 mt-8 tracking-wider">
          Questions? Contact us anytime at support@jyotish-ai.com
        </p>
      </div>
    </main>
  );
}
