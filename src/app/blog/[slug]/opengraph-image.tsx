import { ImageResponse } from 'next/og';
import { getPost } from '@/content/blog';
import { ogFont } from '@/lib/og/ogFont';

export const alt = 'VedicHour blog';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const dynamic = 'force-dynamic';

export default function BlogOgImage({ params }: { params: { slug: string } }) {
  const post = getPost(params.slug);
  const title = post?.title ?? 'VedicHour';
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background:
            'radial-gradient(1200px 600px at 85% 5%, rgba(228,185,98,0.20), transparent 60%), linear-gradient(135deg, #080C18 0%, #0C1226 50%, #080C18 100%)',
          padding: 72,
          fontFamily: 'Noto Sans',
          color: '#F5EFE0',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            fontSize: 28,
            fontFamily: 'Noto Sans',
            color: '#E4B962',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
          }}
        >
          <div style={{ width: 10, height: 10, borderRadius: 999, background: '#E4B962', boxShadow: '0 0 16px rgba(228,185,98,0.8)' }} />
          VedicHour · Blog
        </div>

        <div
          style={{
            fontSize: title.length > 60 ? 60 : 76,
            lineHeight: 1.08,
            fontWeight: 600,
            letterSpacing: '-0.02em',
            display: 'flex',
            maxWidth: 1050,
          }}
        >
          {title}
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 24,
            fontFamily: 'Noto Sans',
            fontSize: 22,
            color: 'rgba(245,239,224,0.62)',
          }}
        >
          <span>AI Vedic Astrology</span>
          <span>·</span>
          <span>vedichour.com</span>
        </div>
      </div>
    ),
    { ...size, fonts: [{ name: 'Noto Sans', data: ogFont(), style: 'normal', weight: 400 }] },
  );
}
