// L-sync — mirror local campaign state up into Supabase (marketing_assets) and
// pull admin decisions (killed) back down so a killed campaign stops rendering
// and publishing locally.
//
// Local sources, each read defensively (sibling agents may not have produced
// them yet): output/creative/*.json (script variants), output/reels/<slug>/
// publish.json + final.mp4 (new render pipeline), media/reels/<slug>/
// publish.json (legacy L2/L3 reels), and SQLite content_library.
//
// Never crashes on missing Supabase tables — the owner applies
// RUN_IN_SUPABASE.sql on his own schedule.

import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { db, logRun, ROOT } from '../db/index';
import { isKilled, killInfo } from '../safety/killswitch';
import { writeHeartbeat } from '../scheduler/heartbeat';
import { resolveSupabase, sbGet, sbInsert, sbPatch, MissingTableError, type Sb } from '../supabase';

const OUT_CREATIVE = resolve(ROOT, 'output', 'creative');
const OUT_REELS = resolve(ROOT, 'output', 'reels');
const MEDIA_REELS = resolve(ROOT, 'media', 'reels');

type Status = 'ready_to_render' | 'rendered' | 'published_manual' | 'published_auto' | 'killed';
const RANK: Record<Status, number> = { ready_to_render: 0, rendered: 1, published_manual: 2, published_auto: 2, killed: 99 };

export interface LocalAsset {
  slug: string;
  kind: string;
  status: Status;
  hook: string | null;
  language: string | null;
  parent_slug: string | null;
  script: unknown;
  hashtags: string[] | null;
  youtube_title: string | null;
  youtube_description: string | null;
  utm_campaign: string | null;
  video_path: string | null;
  youtube_video_id: string | null;
  instagram_permalink: string | null;
  render_cost_usd: number | null;
}

const readJson = (file: string): any | null => {
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
};

const asArray = (v: unknown): string[] | null => (Array.isArray(v) && v.length ? v.map(String) : null);

/** Merge b into a: statuses by rank, fields fill gaps only. */
function merge(a: LocalAsset, b: Partial<LocalAsset>): LocalAsset {
  const status = b.status && RANK[b.status] > RANK[a.status] ? b.status : a.status;
  const out: LocalAsset = { ...a, status };
  for (const k of Object.keys(b) as (keyof LocalAsset)[]) {
    if (k === 'status' || k === 'slug') continue;
    if ((out[k] === null || out[k] === undefined) && b[k] != null) (out as any)[k] = b[k];
  }
  return out;
}

/** Tolerant mapping from any publish.json / creative variant shape. */
function fromLoose(slug: string, j: any, status: Status): Partial<LocalAsset> & { slug: string } {
  const yt = j?.platforms?.youtube ?? {};
  let utmCampaign: string | null = j?.utm_campaign ?? j?.utmCampaign ?? null;
  if (!utmCampaign && typeof yt.link === 'string') {
    try {
      utmCampaign = new URL(yt.link).searchParams.get('utm_campaign');
    } catch {
      /* not a URL */
    }
  }
  return {
    slug,
    status,
    hook: j?.hook ?? j?.title ?? null,
    language: j?.language ?? j?.lang ?? null,
    parent_slug: j?.parent_slug ?? j?.parentSlug ?? null,
    script: j?.script ?? j ?? null,
    hashtags: asArray(j?.hashtags) ?? asArray(yt.hashtags),
    youtube_title: j?.youtube_title ?? j?.youtubeTitle ?? j?.title ?? null,
    youtube_description: j?.youtube_description ?? j?.youtubeDescription ?? yt.caption ?? null,
    utm_campaign: utmCampaign,
    video_path: j?.video_path ?? j?.videoPath ?? j?.video ?? null,
    youtube_video_id: j?.youtube_video_id ?? j?.youtubeVideoId ?? null,
    instagram_permalink: j?.instagram_permalink ?? j?.instagramPermalink ?? null,
    render_cost_usd: typeof (j?.render_cost_usd ?? j?.renderCostUsd ?? j?.cost_usd) === 'number' ? (j?.render_cost_usd ?? j?.renderCostUsd ?? j?.cost_usd) : null,
  };
}

/** Collect every locally-known asset, tolerating absent sibling outputs. */
export function collectLocalAssets(notes: string[]): Map<string, LocalAsset> {
  const assets = new Map<string, LocalAsset>();
  const add = (p: (Partial<LocalAsset> & { slug: string }) | null) => {
    if (!p?.slug) return;
    const base: LocalAsset = {
      slug: p.slug,
      kind: 'reel',
      status: 'ready_to_render',
      hook: null,
      language: null,
      parent_slug: null,
      script: null,
      hashtags: null,
      youtube_title: null,
      youtube_description: null,
      utm_campaign: null,
      video_path: null,
      youtube_video_id: null,
      instagram_permalink: null,
      render_cost_usd: null,
    };
    const existing = assets.get(p.slug) ?? base;
    assets.set(p.slug, merge(existing, p));
  };

  // 1) Creative engine variants (sibling agent) — output/creative/*.json
  try {
    if (existsSync(OUT_CREATIVE)) {
      for (const f of readdirSync(OUT_CREATIVE).filter((x) => x.endsWith('.json'))) {
        const j = readJson(resolve(OUT_CREATIVE, f));
        if (!j) continue;
        const items = Array.isArray(j) ? j : Array.isArray(j.variants) ? j.variants : Array.isArray(j.scripts) ? j.scripts : [j];
        for (const it of items) {
          const slug = it?.slug ?? f.replace(/\.json$/, '');
          add(fromLoose(String(slug), it, 'ready_to_render'));
        }
      }
    } else notes.push('no output/creative yet');
  } catch (e: any) {
    notes.push(`creative scan failed: ${String(e?.message ?? e).slice(0, 80)}`);
  }

  // 2) New render pipeline (sibling agent) — output/reels/<slug>/{final.mp4,publish.json}
  //    plus localized dubbed variants at output/reels/<slug>/<lang>/{final.mp4,publish.json}
  //    (Sarvam TTS + lip-sync), which become child assets "<slug>-<lang>" with parent_slug.
  try {
    if (existsSync(OUT_REELS)) {
      const mapReelDir = (dir: string, slug: string, extras: Partial<LocalAsset>): void => {
        const pub = readJson(resolve(dir, 'publish.json'));
        const hasVideo = existsSync(resolve(dir, 'final.mp4'));
        if (!pub && !hasVideo) return;
        const mapped = { ...fromLoose(slug, pub ?? {}, 'rendered'), ...extras };
        if (!mapped.video_path && hasVideo) mapped.video_path = resolve(dir, 'final.mp4');
        if (mapped.youtube_video_id) mapped.status = 'published_auto';
        else if (mapped.instagram_permalink) mapped.status = 'published_manual';
        add(mapped);
      };
      for (const slug of readdirSync(OUT_REELS)) {
        const dir = resolve(OUT_REELS, slug);
        try {
          if (!statSync(dir).isDirectory()) continue;
        } catch {
          continue;
        }
        mapReelDir(dir, slug, {});
        for (const lang of readdirSync(dir)) {
          const sub = resolve(dir, lang);
          try {
            if (!statSync(sub).isDirectory()) continue;
          } catch {
            continue;
          }
          mapReelDir(sub, `${slug}-${lang}`, { language: lang, parent_slug: slug });
        }
      }
    } else notes.push('no output/reels yet');
  } catch (e: any) {
    notes.push(`output/reels scan failed: ${String(e?.message ?? e).slice(0, 80)}`);
  }

  // 3) Legacy L2/L3 reels — media/reels/<slug>/publish.json (+ <slug>.mp4)
  try {
    if (existsSync(MEDIA_REELS)) {
      for (const slug of readdirSync(MEDIA_REELS)) {
        const dir = resolve(MEDIA_REELS, slug);
        const pub = readJson(resolve(dir, 'publish.json'));
        const video = resolve(dir, `${slug}.mp4`);
        if (!pub && !existsSync(video)) continue;
        const mapped = fromLoose(slug, pub ?? {}, 'rendered');
        if (!mapped.video_path && existsSync(video)) mapped.video_path = video;
        add(mapped);
      }
    }
  } catch (e: any) {
    notes.push(`media/reels scan failed: ${String(e?.message ?? e).slice(0, 80)}`);
  }

  // 4) SQLite content_library — confirms reel rows the loops recorded.
  try {
    const rows = db()
      .prepare(`SELECT asset, status, meta FROM content_library WHERE type = 'reel' ORDER BY id`)
      .all() as { asset: string; status: string; meta: string | null }[];
    for (const r of rows) {
      const meta = r.meta ? readJsonText(r.meta) : null;
      const slug = meta?.slug ?? slugFromPath(r.asset);
      if (!slug) continue;
      add({ slug, status: r.status === 'killed' ? 'killed' : 'rendered', hook: meta?.title ?? null });
    }
  } catch (e: any) {
    notes.push(`content_library scan failed: ${String(e?.message ?? e).slice(0, 80)}`);
  }

  return assets;
}

function readJsonText(t: string): any | null {
  try {
    return JSON.parse(t);
  } catch {
    return null;
  }
}

function slugFromPath(p: string): string | null {
  const m = /[\\/]reels[\\/]([a-z0-9-]+)[\\/]/i.exec(p + '\\');
  return m ? m[1] : null;
}

type RemoteAsset = {
  slug: string;
  status: Status;
  youtube_video_id: string | null;
  instagram_permalink: string | null;
  parent_slug: string | null;
  language: string | null;
};

/** Reflect an admin kill locally: SQLite status + a KILLED marker file the render/publish loops can check. */
function applyKillLocally(r: Pick<RemoteAsset, 'slug' | 'parent_slug' | 'language'>): void {
  try {
    db()
      .prepare(`UPDATE content_library SET status = 'killed', updated_at = datetime('now') WHERE asset LIKE ? AND status != 'killed'`)
      .run(`%${r.slug}%`);
  } catch {
    /* content_library may not have the row */
  }
  const dirs: string[] = [];
  if (r.parent_slug) {
    // localized variant lives at output/reels/<parent>/<lang>/
    const lang = r.language ?? (r.slug.startsWith(`${r.parent_slug}-`) ? r.slug.slice(r.parent_slug.length + 1) : null);
    if (lang) dirs.push(resolve(OUT_REELS, r.parent_slug, lang));
  } else {
    dirs.push(resolve(OUT_REELS, r.slug), resolve(MEDIA_REELS, r.slug));
  }
  for (const dir of dirs) {
    try {
      if (existsSync(dir)) {
        writeFileSync(resolve(dir, 'KILLED'), JSON.stringify({ killed_at: new Date().toISOString(), by: 'admin:/admin/campaigns' }, null, 2));
      }
    } catch {
      /* marker is best-effort */
    }
  }
}

export async function runSyncLoop(): Promise<void> {
  const loop = 'sync';
  if (isKilled()) {
    console.log(`[sync] KILL-SWITCH engaged (${killInfo()?.reason}) — skipping.`);
    logRun({ loop, status: 'killed', detail: killInfo()?.reason ?? 'kill-switch' });
    return;
  }
  logRun({ loop, status: 'started' });

  const sb: Sb | null = await resolveSupabase();
  if (!sb) {
    const msg = 'missing SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (marketing-agent/.env or ../.env.local)';
    console.error(`[sync] ${msg}`);
    logRun({ loop, status: 'error', detail: msg });
    writeHeartbeat(loop, 'error: no supabase creds');
    return;
  }

  const notes: string[] = [];
  const local = collectLocalAssets(notes);
  console.log(`[sync] local assets: ${local.size}${notes.length ? ` (${notes.join('; ')})` : ''}`);

  try {
    // ── DOWN: pull remote state; apply admin kills locally (family-wide) ──
    const remoteRows = (await sbGet(sb, 'marketing_assets?select=slug,status,youtube_video_id,instagram_permalink,parent_slug,language&limit=1000')) as RemoteAsset[];
    const remote = new Map(remoteRows.map((r) => [r.slug, r]));
    const killedSlugs = new Set(remoteRows.filter((r) => r.status === 'killed').map((r) => r.slug));
    let killsApplied = 0;
    for (const r of remoteRows) {
      if (r.status === 'killed') {
        applyKillLocally(r);
        killsApplied++;
        if (local.has(r.slug)) local.get(r.slug)!.status = 'killed';
      }
    }

    // ── UP: insert new assets, patch existing ones (without fighting the admin) ──
    let inserted = 0;
    let updated = 0;
    const now = new Date().toISOString();
    for (const a of local.values()) {
      const r = remote.get(a.slug);
      if (r?.status === 'killed') continue; // never resurrect a killed campaign
      if (a.parent_slug && killedSlugs.has(a.parent_slug)) {
        // parent was killed in the admin — the whole family stays down
        applyKillLocally({ slug: a.slug, parent_slug: a.parent_slug, language: a.language });
        continue;
      }
      const fields = {
        kind: a.kind,
        hook: a.hook,
        // omit when unknown so the DB default ('hinglish') applies and PATCH never nulls it
        ...(a.language ? { language: a.language } : {}),
        ...(a.parent_slug ? { parent_slug: a.parent_slug } : {}),
        script: a.script,
        hashtags: a.hashtags,
        youtube_title: a.youtube_title,
        youtube_description: a.youtube_description,
        utm_campaign: a.utm_campaign,
        video_path: a.video_path,
        render_cost_usd: a.render_cost_usd,
        ...(a.youtube_video_id ? { youtube_video_id: a.youtube_video_id } : {}),
        ...(a.instagram_permalink ? { instagram_permalink: a.instagram_permalink } : {}),
        updated_at: now,
      };
      if (!r) {
        await sbInsert(sb, 'marketing_assets', [{ slug: a.slug, status: a.status, ...fields }]);
        inserted++;
      } else {
        // Only advance status (ready → rendered → published); never demote.
        const patch = RANK[a.status] > RANK[r.status] ? { status: a.status, ...fields } : fields;
        await sbPatch(sb, `marketing_assets?slug=eq.${encodeURIComponent(a.slug)}`, patch);
        updated++;
      }
    }

    const detail = `up: ${inserted} inserted, ${updated} updated | down: ${killsApplied} kill(s) applied locally`;
    console.log(`[sync] ${detail}`);
    logRun({ loop, status: 'ok', detail });
    writeHeartbeat(loop, detail);
  } catch (e: any) {
    if (e instanceof MissingTableError) {
      console.log(`[sync] ${e.message}`);
      console.log('[sync] Nothing synced this run — re-run after the owner applies the migration.');
      logRun({ loop, status: 'skipped', detail: 'marketing_* tables not created yet' });
      writeHeartbeat(loop, 'waiting on RUN_IN_SUPABASE.sql');
      return;
    }
    const msg = String(e?.message ?? e);
    console.error(`[sync] failed: ${msg}`);
    logRun({ loop, status: 'error', detail: msg.slice(0, 200) });
    writeHeartbeat(loop, `error: ${msg.slice(0, 80)}`);
  }
}
