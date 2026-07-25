import Script from 'next/script';

/**
 * Meta (Facebook) Pixel — powers ad-campaign conversion optimization + audiences.
 * Renders nothing unless NEXT_PUBLIC_META_PIXEL_ID is set, so it is safe on every
 * environment. Loaded afterInteractive so it never blocks first paint. CSP for
 * connect.facebook.net / www.facebook.com is in next.config.mjs.
 *
 * Beyond the automatic PageView, call `fbqTrack('Purchase', {...})` etc. from
 * client code at conversion moments — it no-ops when the pixel isn't loaded.
 */
const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;

export function fbqTrack(event: string, params?: Record<string, unknown>) {
  try {
    const w = window as unknown as { fbq?: (...args: unknown[]) => void };
    w.fbq?.('track', event, params);
  } catch {
    /* analytics must never break the page */
  }
}

export function MetaPixel() {
  if (!PIXEL_ID) return null;
  return (
    <>
      <Script id="meta-pixel-init" strategy="afterInteractive">
        {`
          !function(f,b,e,v,n,t,s)
          {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)}(window, document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', '${PIXEL_ID}');
          fbq('track', 'PageView');
        `}
      </Script>
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          height="1"
          width="1"
          style={{ display: 'none' }}
          alt=""
          src={`https://www.facebook.com/tr?id=${PIXEL_ID}&ev=PageView&noscript=1`}
        />
      </noscript>
    </>
  );
}
