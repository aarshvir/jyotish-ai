import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="border-t border-horizon/50 py-12 mt-0">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo */}
          <span className="font-display font-semibold text-lg tracking-[0.08em] text-star/70">
            VedicHour
          </span>

          {/* Links */}
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-sm font-body text-dust">
            <Link href="/#how-it-works" className="hover:text-star transition-colors">How It Works</Link>
            <Link href="/pricing" className="hover:text-star transition-colors">Pricing</Link>
            <Link href="/refund" className="hover:text-star transition-colors">Refund Policy</Link>
            <Link href="/privacy" className="hover:text-star transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-star transition-colors">Terms</Link>
          </div>

          {/* Copyright */}
          <p className="font-mono text-xs text-dust/60 tracking-wider">
            © {new Date().getFullYear()} VedicHour
          </p>
        </div>
      </div>
    </footer>
  );
}
