import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-var(--nav-height))] bg-gradient-to-br from-space via-dark to-space text-star">
      <div className="text-center px-6">
        <div className="text-5xl mb-6 text-amber opacity-40">✦</div>
        <h1 className="font-display text-6xl font-light mb-4 text-amber">404</h1>
        <h2 className="font-display text-2xl font-normal mb-4 text-star">Page Not Found</h2>
        <p className="font-body text-sm mb-10 text-dust/50 max-w-[360px] leading-[1.7]">
          The report or page you&apos;re looking for doesn&apos;t exist or has expired.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center px-8 py-3 min-h-[44px] bg-gradient-to-r from-amber to-amber/80 text-space rounded-md text-sm font-semibold font-mono no-underline hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber focus-visible:ring-offset-2 focus-visible:ring-offset-space"
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
