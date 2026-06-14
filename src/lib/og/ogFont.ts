import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Loads a bundled TTF for next/og ImageResponse. Providing the font explicitly
 * avoids @vercel/og's default-font loader, which constructs an invalid file: URL
 * on Windows (and was failing this project's OG image generation). The font is
 * traced into the serverless bundle via next.config outputFileTracingIncludes.
 */
let cached: Buffer | null = null;

export function ogFont(): Buffer {
  if (!cached) {
    cached = readFileSync(join(process.cwd(), 'assets', 'og-noto-sans.ttf'));
  }
  return cached;
}
