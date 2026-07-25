// L-insights — turn the last 48h of marketing_stats PLUS the platform's own
// funnel (analytics_events sessions + user_profiles first-touch signups +
// completed payments, joined by utm_campaign) into plain-English verdicts:
// kill / double / watch / localize per live asset. Language variants (dubbed
// hi/ta/te/bn/mr reels, parent_slug set) are analysed as a family so the owner
// sees "does Tamil outperform Hindi for this hook?". Reasoning goes through
// brain() (gemini/codex CLI subscriptions — $0). Deterministic guardrails are
// applied AFTER the model so noise can never kill an asset:
//   - under 2 hours of data  -> always 'watch'
//   - 'double' requires above-median views AND >= 1 attributed site session
//   - 'localize' only for an above-median original with no variants yet
// Verdicts persist to marketing_insights for /admin/campaigns.

import { brain } from '../brain/index';
import { logRun } from '../db/index';
import { isKilled, killInfo } from '../safety/killswitch';
import { writeHeartbeat } from '../scheduler/heartbeat';
import { resolveSupabase, sbGet, sbInsert, MissingTableError, type Sb } from '../supabase';

type Asset = {
  id: string;
  slug: string;
  status: string;
  hook: string | null;
  utm_campaign: string | null;
  created_at: string;
  language: string | null;
  parent_slug: string | null;
};
type StatRow = { asset_id: string; captured_at: string; views: number; likes: number; comments: number; source: string };

interface AssetSummary {
  slug: string;
  status: string;
  hook: string | null;
  language: string | null;
  parentSlug: string | null;
  hasVariants: boolean;
  hoursOfData: number;
  views: number;
  viewsStartOfWindow: number;
  viewsPerHour: number;
  likes: number;
  comments: number;
  sessions: number;
  signups: number;
  payments: number;
}

type Verdict = {
  assetSlug: string;
  action: 'kill' | 'double' | 'watch' | 'localize';
  reason: string;
  confidence: number;
  languages?: string[];
};

const norm = (v?: string | null) => (v && v.trim() ? v.trim().toLowerCase() : null);

function parseJsonBlock(raw: string): any | null {
  const m = raw.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    return JSON.parse(m[0]);
  } catch {
    return null;
  }
}

function median(xs: number[]): number {
  if (!xs.length) return 0;
  const s = xs.slice().sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function insightPrompt(summaries: AssetSummary[], medianViews: number): string {
  return `You are the growth analyst for VedicHour (vedichour.com). Below is the last-48-hour performance of every live marketing asset (faceless reels), including the on-site funnel each one drove (sessions -> signups -> payments, attributed by utm_campaign).

DATA (JSON):
${JSON.stringify({ medianViews, assets: summaries }, null, 2)}

FAMILIES: assets with a parentSlug are dubbed language variants (hi/ta/te/bn/mr/...) of the original (language "hinglish"). Compare languages WITHIN a family ("does Tamil outperform Hindi for this hook?") and say so in the body when one language clearly leads.

RULES (hard, non-negotiable):
- An asset with hoursOfData < 2 is ALWAYS "watch" — never kill on noise.
- "double" requires views above the median (${medianViews}) AND at least 1 attributed site session.
- "localize" (recommend dubbing into more Indian languages) is ONLY for a hinglish ORIGINAL (no parentSlug) that is outperforming (above-median views) and has hasVariants=false; include a "languages" array like ["hi","ta"].
- Every reason must cite concrete numbers from the data (views, views/hour, sessions, signups).
- Reasons are at most 2 sentences, plain English, no hype.

TASK: For EACH asset return a verdict. Also write one headline (<= 90 chars) and a 2-4 sentence body summarising what is working, what is not (including any language-vs-language finding), and the single most useful thing the owner should do next.

OUTPUT STRICT JSON ONLY, exactly this shape, no markdown fences:
{"headline":"...","body":"...","actions":[{"assetSlug":"...","action":"kill|double|watch|localize","reason":"...","confidence":0.0,"languages":["hi"]}]}`;
}

/** Deterministic guardrails on top of whatever the model returned. */
export function enforceRules(actions: Verdict[], summaries: AssetSummary[], medianViews: number): Verdict[] {
  const bySlug = new Map(actions.map((a) => [a.assetSlug, a]));
  return summaries.map((s) => {
    const raw = bySlug.get(s.slug);
    let v: Verdict = raw
      ? {
          assetSlug: s.slug,
          action: raw.action,
          reason: raw.reason ?? '',
          confidence: Number(raw.confidence) || 0.5,
          ...(Array.isArray(raw.languages) && raw.languages.length ? { languages: raw.languages.map(String) } : {}),
        }
      : { assetSlug: s.slug, action: 'watch', reason: `No verdict returned by the model — watching (${s.views} views, ${s.sessions} sessions).`, confidence: 0.3 };
    if (!['kill', 'double', 'watch', 'localize'].includes(v.action)) v = { ...v, action: 'watch' };
    if (s.hoursOfData < 2 && v.action !== 'watch') {
      v = { ...v, action: 'watch', reason: `${v.reason} Overridden: only ${s.hoursOfData.toFixed(1)}h of data — never act on noise.`.trim(), confidence: Math.min(v.confidence, 0.4) };
    }
    if (v.action === 'double' && !(s.views > medianViews && s.sessions >= 1)) {
      v = { ...v, action: 'watch', reason: `${v.reason} Overridden: 'double' needs above-median views (${s.views} vs median ${medianViews}) and at least 1 attributed session (${s.sessions}).`.trim() };
    }
    if (v.action === 'localize' && !(s.parentSlug === null && !s.hasVariants && s.views > medianViews)) {
      v = { ...v, action: 'watch', reason: `${v.reason} Overridden: 'localize' is only for an above-median original with no language variants yet.`.trim() };
    }
    return v;
  });
}

export async function runInsightsLoop(): Promise<void> {
  const loop = 'insights';
  if (isKilled()) {
    console.log(`[insights] KILL-SWITCH engaged (${killInfo()?.reason}) — skipping.`);
    logRun({ loop, status: 'killed', detail: killInfo()?.reason ?? 'kill-switch' });
    return;
  }
  logRun({ loop, status: 'started' });

  const sb: Sb | null = await resolveSupabase();
  if (!sb) {
    const msg = 'missing Supabase creds (marketing-agent/.env or ../.env.local)';
    console.error(`[insights] ${msg}`);
    logRun({ loop, status: 'error', detail: msg });
    writeHeartbeat(loop, 'error: no supabase creds');
    return;
  }

  try {
    const since = new Date(Date.now() - 48 * 3600 * 1000).toISOString();
    const assets = (await sbGet(sb, 'marketing_assets?select=id,slug,status,hook,utm_campaign,created_at,language,parent_slug&status=neq.killed&limit=200')) as Asset[];
    if (!assets.length) {
      console.log('[insights] no live assets — nothing to analyse.');
      logRun({ loop, status: 'skipped', detail: 'no assets' });
      writeHeartbeat(loop, 'no assets yet');
      return;
    }

    const stats = (await sbGet(
      sb,
      `marketing_stats?select=asset_id,captured_at,views,likes,comments,source&captured_at=gte.${encodeURIComponent(since)}&order=captured_at.asc&limit=10000`,
    )) as StatRow[];
    if (!stats.length) {
      console.log('[insights] no stats in the last 48h — run loop:stats first (needs published assets + YOUTUBE_API_KEY or manual_stats.json).');
      logRun({ loop, status: 'skipped', detail: 'no stats in window' });
      writeHeartbeat(loop, 'no stats in 48h window');
      return;
    }

    // ── Funnel side from the platform's own first-party analytics ──
    const campaigns = new Set(assets.map((a) => norm(a.utm_campaign)).filter(Boolean) as string[]);
    const sessionsByCampaign = new Map<string, number>();
    const signupsByCampaign = new Map<string, number>();
    const paymentsByCampaign = new Map<string, number>();
    if (campaigns.size) {
      try {
        const events = (await sbGet(
          sb,
          `analytics_events?select=properties&event_name=eq.page_view&created_at=gte.${encodeURIComponent(since)}&limit=50000`,
        )) as { properties?: { session_id?: string; utm?: Record<string, string> } }[];
        const seen = new Set<string>();
        for (const e of events) {
          const camp = norm(e.properties?.utm?.utm_campaign);
          const sid = e.properties?.session_id;
          if (!camp || !campaigns.has(camp) || !sid || seen.has(sid)) continue;
          seen.add(sid);
          sessionsByCampaign.set(camp, (sessionsByCampaign.get(camp) ?? 0) + 1);
        }
      } catch (e: any) {
        console.warn(`[insights] analytics_events unavailable (${String(e?.message ?? e).slice(0, 80)}) — sessions counted as 0.`);
      }
      try {
        const profiles = (await sbGet(sb, 'user_profiles?select=id,first_touch_campaign&limit=50000')) as { id: string; first_touch_campaign?: string | null }[];
        const usersByCampaign = new Map<string, Set<string>>();
        for (const p of profiles) {
          const camp = norm(p.first_touch_campaign);
          if (!camp || !campaigns.has(camp)) continue;
          signupsByCampaign.set(camp, (signupsByCampaign.get(camp) ?? 0) + 1);
          if (!usersByCampaign.has(camp)) usersByCampaign.set(camp, new Set());
          usersByCampaign.get(camp)!.add(p.id);
        }
        const attributedUsers = new Map<string, string>(); // user_id -> campaign
        for (const [camp, ids] of usersByCampaign) for (const id of ids) attributedUsers.set(id, camp);
        if (attributedUsers.size) {
          const payments = (await sbGet(sb, `ziina_payments?select=user_id&status=eq.completed&limit=50000`)) as { user_id?: string | null }[];
          for (const p of payments) {
            const camp = p.user_id ? attributedUsers.get(p.user_id) : undefined;
            if (camp) paymentsByCampaign.set(camp, (paymentsByCampaign.get(camp) ?? 0) + 1);
          }
        }
      } catch (e: any) {
        console.warn(`[insights] first-touch/payments unavailable (${String(e?.message ?? e).slice(0, 80)}) — signups/payments counted as 0.`);
      }
    }

    // ── Per-asset trend summaries ──
    const statsByAsset = new Map<string, StatRow[]>();
    for (const s of stats) {
      const arr = statsByAsset.get(s.asset_id) ?? [];
      arr.push(s);
      statsByAsset.set(s.asset_id, arr);
    }
    const parentsWithVariants = new Set(assets.map((a) => a.parent_slug).filter(Boolean) as string[]);
    const summaries: AssetSummary[] = assets.map((a) => {
      const series = statsByAsset.get(a.id) ?? [];
      const first = series[0];
      const last = series[series.length - 1];
      const hours = first && last ? Math.max(0, (new Date(last.captured_at).getTime() - new Date(first.captured_at).getTime()) / 3600000) : 0;
      const views = last?.views ?? 0;
      const viewsStart = first?.views ?? 0;
      const camp = norm(a.utm_campaign);
      return {
        slug: a.slug,
        status: a.status,
        hook: a.hook,
        language: a.language ?? 'hinglish',
        parentSlug: a.parent_slug,
        hasVariants: parentsWithVariants.has(a.slug),
        hoursOfData: Math.round(hours * 10) / 10,
        views,
        viewsStartOfWindow: viewsStart,
        viewsPerHour: hours > 0.5 ? Math.round(((views - viewsStart) / hours) * 10) / 10 : 0,
        likes: last?.likes ?? 0,
        comments: last?.comments ?? 0,
        sessions: camp ? (sessionsByCampaign.get(camp) ?? 0) : 0,
        signups: camp ? (signupsByCampaign.get(camp) ?? 0) : 0,
        payments: camp ? (paymentsByCampaign.get(camp) ?? 0) : 0,
      };
    });
    const withData = summaries.filter((s) => s.hoursOfData > 0 || s.views > 0);
    if (!withData.length) {
      console.log('[insights] assets exist but none has stats yet — skipping verdicts.');
      logRun({ loop, status: 'skipped', detail: 'no assets with stats' });
      writeHeartbeat(loop, 'no per-asset stats yet');
      return;
    }
    const medianViews = median(withData.map((s) => s.views));

    // ── Brain verdicts + deterministic guardrails ──
    const res = await brain(insightPrompt(withData, medianViews), { tier: 'smart', loop });
    const parsed = parseJsonBlock(res.text);
    if (!parsed || !Array.isArray(parsed.actions)) throw new Error(`could not parse insight JSON from ${res.cli} (len ${res.text.length})`);
    const actions = enforceRules(parsed.actions as Verdict[], withData, medianViews);

    const headline = String(parsed.headline ?? 'Campaign check-in').slice(0, 140);
    const body = String(parsed.body ?? '').slice(0, 2000);
    await sbInsert(sb, 'marketing_insights', [
      {
        generated_at: new Date().toISOString(),
        period: '48h',
        headline,
        body,
        actions,
        raw: { medianViews, assets: withData, cli: res.cli },
      },
    ]);

    console.log(`[insights] "${headline}" (via ${res.cli}, ${res.durationMs}ms)`);
    for (const v of actions) console.log(`  ${v.action.toUpperCase().padEnd(6)} ${v.assetSlug} — ${v.reason}`);
    const detail = `${actions.filter((a) => a.action === 'kill').length} kill / ${actions.filter((a) => a.action === 'double').length} double / ${actions.filter((a) => a.action === 'localize').length} localize / ${actions.filter((a) => a.action === 'watch').length} watch`;
    logRun({ loop, status: 'ok', detail: `${headline} | ${detail}` });
    writeHeartbeat(loop, detail);
  } catch (e: any) {
    if (e instanceof MissingTableError) {
      console.log(`[insights] ${e.message}`);
      logRun({ loop, status: 'skipped', detail: 'marketing_* tables not created yet' });
      writeHeartbeat(loop, 'waiting on RUN_IN_SUPABASE.sql');
      return;
    }
    const msg = String(e?.message ?? e);
    console.error(`[insights] failed: ${msg}`);
    logRun({ loop, status: 'error', detail: msg.slice(0, 200) });
    writeHeartbeat(loop, `error: ${msg.slice(0, 80)}`);
  }
}
