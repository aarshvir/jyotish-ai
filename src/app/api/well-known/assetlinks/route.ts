import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Digital Asset Links for Trusted Web Activity (Google Play).
 * Set ANDROID_TWA_PACKAGE_NAME and ANDROID_TWA_SHA256_FINGERPRINTS in production.
 * @see https://developer.chrome.com/docs/android/trusted-web-activity/relation
 */
export async function GET() {
  const packageName = (process.env.ANDROID_TWA_PACKAGE_NAME ?? 'com.vedichour.app').trim();
  const raw = (process.env.ANDROID_TWA_SHA256_FINGERPRINTS ?? '').trim();
  const fingerprints = raw
    ? raw
        .split(/[\s,]+/)
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  if (fingerprints.length === 0) {
    return NextResponse.json([], {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'public, max-age=300',
      },
    });
  }

  return NextResponse.json(
    [
      {
        relation: ['delegate_permission/common.handle_all_urls'],
        target: {
          namespace: 'android_app',
          package_name: packageName,
          sha256_cert_fingerprints: fingerprints,
        },
      },
    ],
    {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
      },
    }
  );
}
