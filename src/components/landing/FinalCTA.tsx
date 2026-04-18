import Link from 'next/link';

export default function FinalCTA() {
  return (
    <section className="py-24 md:py-28 bg-cosmos relative overflow-hidden">
      <div className="section-divider absolute top-0 left-0 right-0" />

      {/* Subtle glow */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.06]">
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[720px] h-[720px] rounded-full bg-amber blur-3xl" />
      </div>

      <div className="relative max-w-3xl mx-auto px-6 text-center">
        <p className="section-eyebrow">Free Kundli · AI Jyotish Forecast</p>
        <h2 className="section-title text-display-md mb-5">
          Your Vedic Forecast Starts Free.
        </h2>
        <p className="font-body text-body-lg text-dust max-w-xl mx-auto mb-10">
          Get your free Kundli (Janam Kundali) instantly — no card needed. Upgrade anytime
          for a full AI Jyotish forecast across 7, 30, or 365 days.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
          <Link
            href="/onboard?plan=free"
            className="btn-primary text-base px-8 py-3.5 group"
          >
            <span>See today&#39;s windows — free</span>
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              className="group-hover:translate-x-0.5 transition-transform"
              aria-hidden
            >
              <path
                d="M3 8h10M9 4l4 4-4 4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
          <Link
            href="/pricing"
            className="btn-secondary text-base px-8 py-3.5"
          >
            Compare plans
          </Link>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 mt-10 text-dust/60 font-mono text-mono-sm">
          <span className="flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-success" aria-hidden>
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            24-hour refund
          </span>
          <span className="flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-success" aria-hidden>
              <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="2" />
              <path d="M7 11V7a5 5 0 0110 0v4" stroke="currentColor" strokeWidth="2" />
            </svg>
            Encrypted & private
          </span>
          <span className="flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-success" aria-hidden>
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Swiss Ephemeris precision
          </span>
        </div>
      </div>
    </section>
  );
}
