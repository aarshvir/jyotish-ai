'use client';

import { useEffect } from 'react';

/**
 * Catches errors thrown by the ROOT layout / providers — the one render gap
 * that segment-level error.tsx boundaries cannot cover. Must render its own
 * <html>/<body>, and uses inline styles (not Tailwind classes) so the branded
 * dark-cosmic screen survives even when the root layout failed to mount.
 */
export default function GlobalError({
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
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(to bottom right, #080C18, #0D1426, #080C18)',
          fontFamily: 'Georgia, serif',
          color: '#E8EAF0',
        }}
      >
        <div style={{ textAlign: 'center', padding: '0 24px' }}>
          <div style={{ fontSize: '3rem', marginBottom: 24, color: '#D4A853', opacity: 0.3 }}>⚠</div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 400, marginBottom: 16 }}>
            Something went wrong
          </h1>
          <p
            style={{
              fontFamily: 'system-ui, sans-serif',
              fontSize: '0.875rem',
              marginBottom: 40,
              color: 'rgba(136, 146, 164, 0.5)',
              maxWidth: 360,
              lineHeight: 1.7,
            }}
          >
            An unexpected error occurred. The cosmic calculations could not be completed.
          </p>
          <button
            onClick={reset}
            style={{
              padding: '12px 32px',
              minHeight: 44,
              background: 'linear-gradient(to right, #D4A853, rgba(212,168,83,0.8))',
              color: '#080C18',
              border: 'none',
              borderRadius: 6,
              fontSize: '0.875rem',
              fontWeight: 600,
              fontFamily: 'monospace',
              cursor: 'pointer',
            }}
          >
            Try Again
          </button>
        </div>
      </body>
    </html>
  );
}
