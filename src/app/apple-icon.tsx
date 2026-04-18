import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';
export const runtime = 'edge';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 110,
          background: '#080C18',
          color: '#E4B962',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'serif',
          fontWeight: 600,
          letterSpacing: '-0.03em',
        }}
      >
        V
      </div>
    ),
    { ...size },
  );
}
