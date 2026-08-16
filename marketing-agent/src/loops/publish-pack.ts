import { BRAND, utm, landingPath } from '../brand';
import { defaultCaption } from './package';
import type { CreativeScript } from '../render/types';
import type { VerifyResult } from '../render/assemble';

export type ReelPublishStatus = 'dry_placeholder_do_not_post' | 'failed_verification' | 'ready_to_post_manually';

/** Dry cards and failed listens must never look like a paste-ready reel. */
export function reelPublishStatus(dry: boolean, verified: boolean): ReelPublishStatus {
  if (dry) return 'dry_placeholder_do_not_post';
  if (!verified) return 'failed_verification';
  return 'ready_to_post_manually';
}

export function verifyNoteFrom(v: VerifyResult): string {
  if (v.listen) {
    const extra = v.problems.filter((p) => !(v.listen?.problems.includes(p))).join('; ');
    if (!v.ok) {
      const all = v.problems.join('; ');
      return `PROBLEMS: ${all}`;
    }
    return listenPassNote(v, extra);
  }
  if (!v.ok) return `PROBLEMS: ${v.problems.join('; ')}`;
  return (
    `PASS — ${v.probe.width}x${v.probe.height}, ${v.probe.fps}fps, ${v.probe.durationSec.toFixed(2)}s, ` +
    `${v.probe.codec}, audible. ${v.frames.length} frames extracted — stills are not a substitute for playing the mp4.`
  );
}

function listenPassNote(v: VerifyResult, extra: string): string {
  const l = v.listen!;
  const mean =
    l.meanVolumeDb === Number.NEGATIVE_INFINITY
      ? '-inf'
      : l.meanVolumeDb === null
        ? 'n/a'
        : `${l.meanVolumeDb.toFixed(1)}`;
  return (
    `PASS — ${v.probe.width}x${v.probe.height}, ${v.probe.fps}fps, ${v.probe.durationSec.toFixed(2)}s, ${v.probe.codec}, ` +
    `audible (mean ${mean} dB, longest silence ${l.longestSilenceSec.toFixed(1)}s). ` +
    `${v.frames.length} frames extracted to \`frames/\`. Play the mp4 and listen before posting.` +
    (extra ? ` ${extra}` : '')
  );
}

export interface PublishPack {
  slug: string;
  title: string;
  product: string;
  video: string;
  durationSec: number;
  generationCostUsd: number;
  dryRun: boolean;
  youtubeTitle: string;
  description: string;
  tags: string[];
  hashtags: string[];
  caption: string;
  links: { instagram: string; youtube: string; tiktok: string; facebook: string };
  status: ReelPublishStatus;
}

export function buildPublishPack(
  c: CreativeScript,
  videoPath: string,
  durationSec: number,
  costUsd: number,
  opts: { dry: boolean; verified: boolean },
): PublishPack {
  const landing = landingPath(c.product);
  const p = c.publish ?? {};
  const hashtags = p.hashtags ?? ['#vedichour', '#vedictiming'];
  const tags = p.tags ?? ['vedic astrology', 'hourly timing', 'kundli', 'vedichour'];
  const spoken = c.shots.map((s) => s.dialogue ?? s.vo ?? '').filter(Boolean).join(' ');
  const caption = p.caption ?? defaultCaption(p as Record<string, unknown>, c as unknown as Record<string, unknown>);
  const description =
    p.description ??
    `${c.hook}\n\n${spoken}\n\nVedicHour ${BRAND.adSafeDifferentiators[0]}, ${BRAND.adSafeDifferentiators[1]}, ${BRAND.adSafeDifferentiators[2]}.\n\n` +
      `Start free: ${utm(BRAND.links.freeKundli, 'youtube', 'short', 'launch_video', c.slug)}\n` +
      `See the sample: ${utm(landing, 'youtube', 'short', 'launch_video', c.slug)}\n` +
      `Use ${BRAND.promoPublic} for 30% off your first paid report.\n\n` +
      `${BRAND.disclaimer}\n\n${tags.map((t) => `#${t.replace(/\s+/g, '')}`).join(' ')}`;

  return {
    slug: c.slug,
    title: c.title,
    product: c.product,
    video: videoPath,
    durationSec,
    generationCostUsd: costUsd,
    dryRun: opts.dry,
    youtubeTitle: p.youtubeTitle ?? `${c.hook} | VedicHour`,
    description,
    tags,
    hashtags,
    caption,
    links: {
      instagram: utm(landing, 'instagram', 'reel', 'launch_video', c.slug),
      youtube: utm(landing, 'youtube', 'short', 'launch_video', c.slug),
      tiktok: utm(landing, 'tiktok', 'video', 'launch_video', c.slug),
      facebook: utm(landing, 'facebook', 'reel', 'launch_video', c.slug),
    },
    status: reelPublishStatus(opts.dry, opts.verified),
  };
}
