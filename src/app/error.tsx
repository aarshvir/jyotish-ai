'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-space via-cosmos to-space">
      <div className="text-center px-6">
        <div className="text-5xl mb-6 text-amber opacity-30">⚠</div>
        <h1 className="font-display text-3xl font-normal mb-4 text-star">
          Something went wrong
        </h1>
        <p className="font-body text-sm mb-10 text-dust/50 max-w-[360px] leading-[1.7]">
          An unexpected error occurred. The cosmic calculations could not be completed.
        </p>
        <button
          onClick={reset}
          className="px-8 py-3 min-h-[44px] bg-gradient-to-r from-amber to-amber/80 text-space rounded-md text-sm font-semibold font-mono cursor-pointer hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber focus-visible:ring-offset-2 focus-visible:ring-offset-space"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
