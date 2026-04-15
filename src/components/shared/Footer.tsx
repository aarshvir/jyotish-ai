import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="border-t border-horizon/40 py-10 md:py-12">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-5">
          <span className="font-display font-semibold text-lg tracking-wide text-star/60">
            VedicHour
          </span>

          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 font-body text-body-sm text-dust">
            <Link href="/#how-it-works" className="hover:text-star transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber rounded-button px-0.5">How It Works</Link>
            <Link href="/pricing" className="hover:text-star transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber rounded-button px-0.5">Pricing</Link>
            <Link href="/refund" className="hover:text-star transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber rounded-button px-0.5">Refund Policy</Link>
            <Link href="/privacy" className="hover:text-star transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber rounded-button px-0.5">Privacy</Link>
            <Link href="/terms" className="hover:text-star transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber rounded-button px-0.5">Terms</Link>
          </div>

          <p className="font-mono text-mono-sm text-dust/50 tracking-wider">
            © {new Date().getFullYear()} VedicHour
          </p>
        </div>
      </div>
    </footer>
  );
}
