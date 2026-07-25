// L-stats — hourly performance poller. For every marketing_asset with a
// youtube_video_id, hit the public YouTube Data API (videos.list, 1 quota unit
// per call of up to 50 ids — free tier 10,000/day, so hourly polling is
// trivial) and append one marketing_stats row per asset. Instagram has no
// API hookup yet, so a manual_stats.json drop-file the owner edits by hand
// ({slug, views, likes, ...} or an array of those) is ingested as source
// 'manual'. Skips gracefully when YOUTUBE_API_KEY or the tables are absent.

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { logRun, ROOT } from '../db/index';
import { isKilled, killInfo } from '../safety/killswitch';
import { writeHeartbeat } from '../scheduler/heartbeat';
import { loadEnv, resolveSupabase, sbGet, sbInsert, MissingTableError, type Sb } from '../supabase';

const MANUAL_FILE = resolve(ROOT, 'manual_stats.json');

type Asset = { id: string; slug: string; youtube_video_id: string | null };

interface StatRow {
  asset_id: string;
  captured_at: string;
  source: 'youtube' | 'instagram' | 'manual';
  views: number;
  likes: number;
  comments: number;
  shares: number | null;
  watch_pct: number | null;
  raw: unknown;
}

const toNum = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

async function pollYouTube(key: string, assets: Asset[], capturedAt: string): Promise<StatRow[]> {
  const rows: StatRow[] = [];
  const withVideo = assets.filter((a) => a.youtube_video_id);
  for (let i = 0; i < withVideo.length; i += 50) {
    const batch = withVideo.slice(i, i + 50);
    const ids = batch.map((a) => a.youtube_video_id).join(',');
    const url = `https://www.googleapis.com/youtube/v3/videos?part=statistics,contentDetails&id=${encodeURIComponent(ids)}&key=${encodeURIComponent(key)}`;
    const res = await fetch(url);
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`YouTube API HTTP ${res.status}: ${JSON.stringify(body?.error?.message ?? body).slice(0, 160)}`);
    const byId = new Map<string, any>((body.items ?? []).map((it: any) => [it.id, it]));
    for (const a of batch) {
      const it = byId.get(a.youtube_video_id!);
      if (!it) {
        console.warn(`[stats] ${a.slug}: video ${a.youtube_video_id} not found on YouTube (deleted/private?)`);
        continue;
      }
      const s = it.statistics ?? {};
      rows.push({
        asset_id: a.id,
        captured_at: capturedAt,
        source: 'youtube',
        views: toNum(s.viewCount),
        likes: toNum(s.likeCount),
        comments: toNum(s.commentCount),
        shares: null,
        watch_pct: null, // watch time needs OAuth'd Analytics API — public stats only here
        raw: { statistics: s, contentDetails: { duration: it.contentDetails?.duration ?? null } },
      });
    }
  }
  return rows;
}

function readManualEntries(): any[] {
  if (!existsSync(MANUAL_FILE)) return [];
  try {
    const j = JSON.parse(readFileSync(MANUAL_FILE, 'utf8'));
    return Array.isArray(j) ? j : [j];
  } catch (e: any) {
    console.warn(`[stats] manual_stats.json is not valid JSON (${String(e?.message ?? e).slice(0, 60)}) — skipping it.`);
    return [];
  }
}

export async function runStatsLoop(): Promise<void> {
  const loop = 'stats';
  if (isKilled()) {
    console.log(`[stats] KILL-SWITCH engaged (${killInfo()?.reason}) — skipping.`);
    logRun({ loop, status: 'killed', detail: killInfo()?.reason ?? 'kill-switch' });
    return;
  }
  logRun({ loop, status: 'started' });

  const sb: Sb | null = await resolveSupabase();
  if (!sb) {
    const msg = 'missing Supabase creds (marketing-agent/.env or ../.env.local)';
    console.error(`[stats] ${msg}`);
    logRun({ loop, status: 'error', detail: msg });
    writeHeartbeat(loop, 'error: no supabase creds');
    return;
  }

  try {
    const assets = (await sbGet(sb, 'marketing_assets?select=id,slug,youtube_video_id&status=neq.killed&limit=500')) as Asset[];
    if (!assets.length) {
      console.log('[stats] no marketing_assets yet — nothing to poll.');
      logRun({ loop, status: 'skipped', detail: 'no assets' });
      writeHeartbeat(loop, 'no assets yet');
      return;
    }

    const capturedAt = new Date().toISOString();
    const rows: StatRow[] = [];

    // ── YouTube public stats ──
    const ytKey = loadEnv().YOUTUBE_API_KEY || '';
    const ytAssets = assets.filter((a) => a.youtube_video_id);
    if (!ytAssets.length) {
      console.log('[stats] no assets with a youtube_video_id yet.');
    } else if (!ytKey) {
      console.log(`[stats] YOUTUBE_API_KEY not set — skipping YouTube polling for ${ytAssets.length} asset(s). Get a key: Google Cloud Console -> enable "YouTube Data API v3" -> Credentials -> API key.`);
    } else {
      rows.push(...(await pollYouTube(ytKey, ytAssets, capturedAt)));
    }

    // ── Manual drop-file (Instagram until the API is wired) ──
    const bySlug = new Map(assets.map((a) => [a.slug, a]));
    let manualCount = 0;
    for (const m of readManualEntries()) {
      const slug = String(m?.slug ?? '');
      const asset = bySlug.get(slug);
      if (!asset) {
        if (slug) console.warn(`[stats] manual_stats.json: unknown slug "${slug}" — sync it first.`);
        continue;
      }
      rows.push({
        asset_id: asset.id,
        captured_at: capturedAt,
        source: 'manual',
        views: toNum(m.views),
        likes: toNum(m.likes),
        comments: toNum(m.comments),
        shares: m.shares != null ? toNum(m.shares) : null,
        watch_pct: m.watch_pct != null ? toNum(m.watch_pct) : null,
        raw: m,
      });
      manualCount++;
    }

    if (rows.length) await sbInsert(sb, 'marketing_stats', rows);

    const detail = `${rows.length} stat row(s) inserted (${rows.length - manualCount} youtube, ${manualCount} manual) across ${assets.length} asset(s)`;
    console.log(`[stats] ${detail}`);
    logRun({ loop, status: 'ok', detail });
    writeHeartbeat(loop, detail);
  } catch (e: any) {
    if (e instanceof MissingTableError) {
      console.log(`[stats] ${e.message}`);
      logRun({ loop, status: 'skipped', detail: 'marketing_* tables not created yet' });
      writeHeartbeat(loop, 'waiting on RUN_IN_SUPABASE.sql');
      return;
    }
    const msg = String(e?.message ?? e);
    console.error(`[stats] failed: ${msg}`);
    logRun({ loop, status: 'error', detail: msg.slice(0, 200) });
    writeHeartbeat(loop, `error: ${msg.slice(0, 80)}`);
  }
}
