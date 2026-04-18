import { ImageResponse } from 'next/og';

export const alt = 'VedicHour — Free Kundli & AI Jyotish Forecast';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const runtime = 'edge';

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          background:
            'radial-gradient(1200px 600px at 85% 10%, rgba(228,185,98,0.18), transparent 60%), linear-gradient(135deg, #080C18 0%, #0C1226 50%, #080C18 100%)',
          padding: 72,
          fontFamily: 'serif',
          color: '#F5EFE0',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            fontSize: 30,
            fontFamily: 'monospace',
            color: '#E4B962',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
          }}
        >
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: 999,
              background: '#E4B962',
              boxShadow: '0 0 16px rgba(228,185,98,0.8)',
            }}
          />
          VedicHour
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div
            style={{
              fontSize: 104,
              lineHeight: 1.05,
              fontWeight: 600,
              letterSpacing: '-0.02em',
              display: 'flex',
              maxWidth: 1000,
            }}
          >
            Free Kundli &amp; AI Jyotish Forecast
          </div>
          <div
            style={{
              fontSize: 32,
              color: 'rgba(245,239,224,0.72)',
              fontFamily: 'sans-serif',
              maxWidth: 900,
              display: 'flex',
            }}
          >
            Free Kundli · AI Vedic forecast · 18 hourly Jyotish windows per day
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 24,
            fontFamily: 'monospace',
            fontSize: 22,
            color: 'rgba(245,239,224,0.6)',
          }}
        >
          <span>Free Kundli</span>
          <span>·</span>
          <span>Jyotish AI</span>
          <span>·</span>
          <span>Swiss Ephemeris</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
