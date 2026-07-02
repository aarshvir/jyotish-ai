export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/admin/guard';
import { createServiceClient } from '@/lib/supabase/admin';
import { fmtMoneyMinor } from '@/lib/admin/analytics';

/**
 * Marketing analytics hub — one payload powering /admin/marketing (campaigns,
 * blog performance, funnel, correlations). Everything is computed in memory
 * from a single windowed sweep of analytics_events (paginated — PostgREST
 * silently caps large .limit() calls at 1000) plus one query each on reports
 * and ziina_payments, joined via Maps.
 *
 * Attribution rules:
 * - A session belongs to the utm_campaign carried by the FIRST event in that
 *   session which has one; sessions with none fall into "(no campaign)".
 * - Signup = the session contains any event with a user_id.
 * - Reports/paid/revenue are attributed per USER (first-touch: the campaign of
 *   the earliest session where that user was identified) so a user with many
 *   sessions is never double-counted across campaigns.
 */

type Props = {
  path?: string | null;
  referrer?: string | null;
  utm?: Record<string, string> | null;
  session_id?: string | null;
  href?: string | null;
  text?: string | null;
};

type EventRow = { user_id: string | null; event_name: string; properties: Props | null; created_at: string };

function hostOf(ref?: string | null): string {
  if (!ref) return '';
  try { return new URL(ref).hostname.replace(/^www\./, ''); } catch { return ''; }
}
function channelOf(ref: string | null | undefined, utmSource?: string | null): string {
  if (utmSource) return `Campaign · ${utmSource}`;
  const h = hostOf(ref);
  if (!h || h.includes('vedichour')) return 'Direct';
  if (/google|bing|duckduckgo|yahoo|ecosia|search/.test(h)) return 'Organic Search';
  if (/instagram|facebook|fb\.|youtube|reddit|twitter|x\.com|t\.co|linkedin|pinterest|whatsapp|threads|quora/.test(h)) return 'Social / Community';
  return `Referral · ${h}`;
}

/** Sum-by-currency helper: { AED: 12300, INR: 79900 } → "AED 123 · ₹799". */
function fmtRevenue(byCurrency: Record<string, number>): string {
  const parts = Object.entries(byCurrency)
    .filter(([, minor]) => minor > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([cur, minor]) => fmtMoneyMinor(cur, minor));
  return parts.length ? parts.join(' · ') : '—';
}

const pct = (num: number, den: number) => (den ? Math.round((num / den) * 1000) / 10 : 0);
const ratio = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 10) / 10 : 0);

type SessionAgg = {
  sid: string;
  firstSeen: string;
  entryPath: string | null;
  channel: string;
  campaign: string | null; // first utm_campaign seen in the session
  pageViews: number;
  clicks: number;
  userId: string | null;
  sawFreeKundli: boolean;
  sawKundaliResult: boolean;
};

export async function GET(req: NextRequest) {
  const admin = await requireAdminApi();
  if (admin instanceof NextResponse) return admin;

  const daysRaw = parseInt(req.nextUrl.searchParams.get('days') ?? '30', 10);
  const days = [7, 30, 90].includes(daysRaw) ? daysRaw : 30;
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - days);
  const sinceIso = since.toISOString();

  const db = createServiceClient();

  // ── Windowed event sweep, paginated (PostgREST caps big limits at 1000) ──
  const PAGE = 1000;
  const events: EventRow[] = [];
  for (let from = 0; from < 200_000; from += PAGE) {
    const { data, error } = await db
      .from('analytics_events')
      .select('user_id, event_name, properties, created_at')
      .gte('created_at', sinceIso)
      .order('created_at', { ascending: true })
      .order('id', { ascending: true }) // stable tiebreak so pages never overlap
      .range(from, from + PAGE - 1);
    if (error) return NextResponse.json({ error: 'Failed to load analytics events' }, { status: 500 });
    const rows = (data ?? []) as EventRow[];
    events.push(...rows);
    if (rows.length < PAGE) break;
  }

  // Reports + payments: one query each, joined via Maps below. Reports are
  // fetched all-time (small table) so payments can resolve a user through
  // report_id even when the report predates the window.
  const [reportsRes, paymentsRes] = await Promise.all([
    db.from('reports').select('id, user_id, created_at').limit(50000),
    db
      .from('ziina_payments')
      .select('user_id, report_id, amount, currency, status, created_at')
      .eq('status', 'completed')
      .gte('created_at', sinceIso)
      .limit(50000),
  ]);
  const reports = (reportsRes.data ?? []) as { id: string; user_id: string | null; created_at: string }[];
  const payments = (paymentsRes.data ?? []) as {
    user_id: string | null; report_id: string | null; amount: number; currency: string; status: string; created_at: string;
  }[];

  const reportUserById = new Map<string, string>();
  const reportsInWindowByUser = new Map<string, number>();
  const usersWithReportInWindow = new Set<string>();
  for (const r of reports) {
    if (r.user_id) reportUserById.set(r.id, r.user_id);
    if (r.user_id && r.created_at >= sinceIso) {
      reportsInWindowByUser.set(r.user_id, (reportsInWindowByUser.get(r.user_id) ?? 0) + 1);
      usersWithReportInWindow.add(r.user_id);
    }
  }

  // Payments per user (user_id directly, else via report_id → reports.user_id).
  const paymentsByUser = new Map<string, { count: number; byCurrency: Record<string, number> }>();
  let unattributedPayments = 0;
  const unattributedRevenue: Record<string, number> = {};
  for (const p of payments) {
    const uid = p.user_id ?? (p.report_id ? reportUserById.get(p.report_id) ?? null : null);
    const cur = (p.currency || 'AED').toUpperCase();
    if (!uid) {
      unattributedPayments++;
      unattributedRevenue[cur] = (unattributedRevenue[cur] ?? 0) + (p.amount || 0);
      continue;
    }
    const agg = paymentsByUser.get(uid) ?? { count: 0, byCurrency: {} };
    agg.count++;
    agg.byCurrency[cur] = (agg.byCurrency[cur] ?? 0) + (p.amount || 0);
    paymentsByUser.set(uid, agg);
  }

  // ── Single pass over events → session aggregates + blog aggregates ──
  const bySid = new Map<string, SessionAgg>();
  const blogAgg = new Map<string, { views: number; sessions: Set<string>; ctaClicks: number }>();
  let totalPageViews = 0;
  let totalClicks = 0;

  for (const e of events) {
    const p = (e.properties ?? {}) as Props;
    const sid = p.session_id;
    if (!sid) continue;
    const isPageView = e.event_name === 'page_view';
    const isClick = e.event_name === 'click';
    const path = p.path ?? null;

    let s = bySid.get(sid);
    if (!s) {
      s = {
        sid,
        firstSeen: e.created_at,
        entryPath: isPageView ? path : null,
        channel: channelOf(p.referrer ?? null, p.utm?.utm_source ?? null),
        campaign: p.utm?.utm_campaign ?? null,
        pageViews: 0,
        clicks: 0,
        userId: e.user_id ?? null,
        sawFreeKundli: false,
        sawKundaliResult: false,
      };
      bySid.set(sid, s);
    }
    if (e.user_id) s.userId = e.user_id; // a session may sign up partway through
    if (!s.campaign && p.utm?.utm_campaign) s.campaign = p.utm.utm_campaign; // first event carrying one
    if (isPageView) {
      s.pageViews++;
      totalPageViews++;
      if (!s.entryPath && path) s.entryPath = path;
      if (path) {
        if (path.startsWith('/free-kundli')) s.sawFreeKundli = true;
        if (path.startsWith('/kundali')) s.sawKundaliResult = true;
        if (path.startsWith('/blog/')) {
          const b = blogAgg.get(path) ?? { views: 0, sessions: new Set<string>(), ctaClicks: 0 };
          b.views++;
          b.sessions.add(sid);
          blogAgg.set(path, b);
        }
      }
    } else if (isClick) {
      s.clicks++;
      totalClicks++;
      // CTA click = a click ON a blog post that targets /free-kundli or /pricing
      // (href is stored as a same-origin pathname by the click tracker).
      if (path?.startsWith('/blog/') && (p.href === '/free-kundli' || p.href === '/pricing')) {
        const b = blogAgg.get(path) ?? { views: 0, sessions: new Set<string>(), ctaClicks: 0 };
        b.ctaClicks++;
        blogAgg.set(path, b);
      }
    }
  }

  const sessions = Array.from(bySid.values());
  const signedUpSessions = sessions.filter((s) => s.userId);
  const identifiedSids = new Set(signedUpSessions.map((s) => s.sid));

  // First-touch campaign per user (earliest identified session in the window),
  // so reports/revenue are never double-counted across campaigns.
  const firstTouchCampaign = new Map<string, string>();
  const sorted = [...signedUpSessions].sort((a, b) => (a.firstSeen < b.firstSeen ? -1 : 1));
  for (const s of sorted) {
    if (s.userId && !firstTouchCampaign.has(s.userId)) {
      firstTouchCampaign.set(s.userId, s.campaign ?? '(no campaign)');
    }
  }

  // ── CAMPAIGNS ──
  type CampaignRow = {
    campaign: string; sessions: number; pageViews: number; clicks: number; signups: number;
    reports: number; paid: number; revenue: string; convPct: number;
  };
  const campMap = new Map<string, { sessions: number; pageViews: number; clicks: number; signups: number }>();
  for (const s of sessions) {
    const key = s.campaign ?? '(no campaign)';
    const c = campMap.get(key) ?? { sessions: 0, pageViews: 0, clicks: 0, signups: 0 };
    c.sessions++;
    c.pageViews += s.pageViews;
    c.clicks += s.clicks;
    if (s.userId) c.signups++;
    campMap.set(key, c);
  }
  const campUserStats = new Map<string, { reports: number; paid: number; byCurrency: Record<string, number> }>();
  for (const [uid, campaign] of Array.from(firstTouchCampaign.entries())) {
    const stat = campUserStats.get(campaign) ?? { reports: 0, paid: 0, byCurrency: {} };
    stat.reports += reportsInWindowByUser.get(uid) ?? 0;
    const pay = paymentsByUser.get(uid);
    if (pay) {
      stat.paid += pay.count;
      for (const [cur, minor] of Object.entries(pay.byCurrency)) {
        stat.byCurrency[cur] = (stat.byCurrency[cur] ?? 0) + minor;
      }
    }
    campUserStats.set(campaign, stat);
  }
  const campaigns: CampaignRow[] = Array.from(campMap.entries())
    .map(([campaign, c]) => {
      const u = campUserStats.get(campaign) ?? { reports: 0, paid: 0, byCurrency: {} };
      return {
        campaign,
        ...c,
        reports: u.reports,
        paid: u.paid,
        revenue: fmtRevenue(u.byCurrency),
        convPct: pct(u.paid, c.sessions),
      };
    })
    .sort((a, b) => b.sessions - a.sessions);

  // ── BLOG ──
  const blog = Array.from(blogAgg.entries())
    .map(([path, b]) => {
      let signups = 0;
      for (const sid of Array.from(b.sessions)) if (identifiedSids.has(sid)) signups++;
      return { path, views: b.views, sessions: b.sessions.size, ctaClicks: b.ctaClicks, signups };
    })
    .sort((a, b) => b.views - a.views);

  // ── FUNNEL (session-based; each step counted independently) ──
  const nIdentified = signedUpSessions.length;
  const nReport = signedUpSessions.filter((s) => s.userId && usersWithReportInWindow.has(s.userId)).length;
  const nPaid = signedUpSessions.filter((s) => s.userId && paymentsByUser.has(s.userId)).length;
  const funnel = [
    { key: 'sessions', label: 'Sessions', count: sessions.length },
    { key: 'free_kundli', label: 'Viewed free kundli', count: sessions.filter((s) => s.sawFreeKundli).length },
    { key: 'kundali_result', label: 'Saw kundali result', count: sessions.filter((s) => s.sawKundaliResult).length },
    { key: 'identified', label: 'Identified (signed in)', count: nIdentified },
    { key: 'report', label: 'Created a report', count: nReport },
    { key: 'paid', label: 'Paid', count: nPaid },
  ];

  // ── CORRELATIONS ──
  const rateRows = (group: (s: SessionAgg) => string | null) => {
    const m = new Map<string, { sessions: number; signups: number }>();
    for (const s of sessions) {
      const key = group(s);
      if (!key) continue;
      const r = m.get(key) ?? { sessions: 0, signups: 0 };
      r.sessions++;
      if (s.userId) r.signups++;
      m.set(key, r);
    }
    return Array.from(m.entries())
      .map(([key, r]) => ({ key, ...r, ratePct: pct(r.signups, r.sessions) }))
      .sort((a, b) => b.sessions - a.sessions);
  };

  const channels = rateRows((s) => s.channel);
  const entryPages = rateRows((s) => s.entryPath).slice(0, 10);
  const overallRate = pct(nIdentified, sessions.length);

  // Hour-of-day (IST = UTC+5:30) from each session's first event.
  const hours = Array.from({ length: 24 }, (_, hour) => ({ hour, sessions: 0, signups: 0 }));
  for (const s of sessions) {
    const h = new Date(new Date(s.firstSeen).getTime() + 5.5 * 3600_000).getUTCHours();
    hours[h].sessions++;
    if (s.userId) hours[h].signups++;
  }

  // Blog-first vs direct-first (entry page starts with /blog vs everything else).
  const blogFirst = { sessions: 0, signups: 0 };
  const directFirst = { sessions: 0, signups: 0 };
  for (const s of sessions) {
    const bucket = s.entryPath?.startsWith('/blog') ? blogFirst : directFirst;
    bucket.sessions++;
    if (s.userId) bucket.signups++;
  }
  const blogRate = pct(blogFirst.signups, blogFirst.sessions);
  const directRate = pct(directFirst.signups, directFirst.sessions);

  // Auto-generated one-line insights (guarded against tiny/no data).
  const MIN = 3; // minimum sessions before a segment is worth a claim
  const bestChannel = channels.filter((c) => c.sessions >= MIN && c.signups > 0).sort((a, b) => b.ratePct - a.ratePct)[0];
  const channelInsight = bestChannel && overallRate > 0
    ? `${bestChannel.key} sessions sign up ${ratio(bestChannel.ratePct, overallRate)}× the site average (${bestChannel.ratePct}% vs ${overallRate}%).`
    : 'Not enough signups per channel yet to call a winner — check back as traffic grows.';
  const bestEntry = entryPages.filter((e) => e.sessions >= MIN && e.signups > 0).sort((a, b) => b.ratePct - a.ratePct)[0];
  const entryInsight = bestEntry
    ? `Visitors landing on ${bestEntry.key} sign up at ${bestEntry.ratePct}% — the strongest entry page in this window.`
    : 'No entry page has enough signups yet to stand out.';
  const peakSessions = hours.reduce((a, b) => (b.sessions > a.sessions ? b : a), hours[0]);
  const peakSignups = hours.reduce((a, b) => (b.signups > a.signups ? b : a), hours[0]);
  const hourInsight = peakSessions.sessions > 0
    ? `Traffic peaks around ${String(peakSessions.hour).padStart(2, '0')}:00 IST${peakSignups.signups > 0 ? `; signups peak around ${String(peakSignups.hour).padStart(2, '0')}:00 IST` : ''}.`
    : 'No sessions in this window yet.';
  let blogInsight = 'Not enough blog-first sessions yet to compare against direct traffic.';
  if (blogFirst.sessions >= MIN && directFirst.sessions >= MIN && (blogFirst.signups > 0 || directFirst.signups > 0)) {
    if (blogRate > directRate && directRate > 0) {
      blogInsight = `Blog-first sessions sign up ${ratio(blogRate, directRate)}× more than direct-first (${blogRate}% vs ${directRate}%).`;
    } else if (directRate > blogRate && blogRate > 0) {
      blogInsight = `Direct-first sessions sign up ${ratio(directRate, blogRate)}× more than blog-first (${directRate}% vs ${blogRate}%).`;
    } else {
      blogInsight = `Blog-first and direct-first sessions sign up at similar rates (${blogRate}% vs ${directRate}%).`;
    }
  }

  // Window totals for the KPI strip.
  const totalRevenue: Record<string, number> = { ...unattributedRevenue };
  let totalPaid = unattributedPayments;
  for (const pay of Array.from(paymentsByUser.values())) {
    totalPaid += pay.count;
    for (const [cur, minor] of Object.entries(pay.byCurrency)) {
      totalRevenue[cur] = (totalRevenue[cur] ?? 0) + minor;
    }
  }
  let totalReports = 0;
  for (const n of Array.from(reportsInWindowByUser.values())) totalReports += n;

  return NextResponse.json({
    range: { days, since: sinceIso },
    totals: {
      sessions: sessions.length,
      pageViews: totalPageViews,
      clicks: totalClicks,
      signups: nIdentified,
      reports: totalReports,
      paid: totalPaid,
      revenue: fmtRevenue(totalRevenue),
    },
    campaigns,
    blog,
    funnel,
    correlations: {
      channels,
      channelInsight,
      entryPages,
      entryInsight,
      hours,
      hourInsight,
      blogVsDirect: {
        blog: { ...blogFirst, ratePct: blogRate },
        direct: { ...directFirst, ratePct: directRate },
      },
      blogInsight,
    },
    note:
      `Sessions are attributed to the first utm_campaign they arrive with; reports and revenue are attributed per user (first-touch). ` +
      (unattributedPayments ? `${unattributedPayments} completed payment(s) in this window had no resolvable user and are counted only in the totals. ` : '') +
      `Events scanned: ${events.length.toLocaleString()}.`,
  });
}
