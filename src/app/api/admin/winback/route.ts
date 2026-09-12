export const dynamic = 'force-dynamic';
export const maxDuration = 300;

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import type { SupabaseClient } from '@supabase/supabase-js';
import { requireAdminApi } from '@/lib/admin/guard';
import { createServiceClient } from '@/lib/supabase/admin';
import { EphemerisAgent } from '@/lib/agents/EphemerisAgent';
import { sendEmail } from '@/lib/notify/email';
import { unsubscribeUrl, signingSecretOrNull } from '@/lib/notify/suppression';
import { makeResumeToken } from '@/lib/onboard/resumeToken';
import { classifyQuestion } from '@/lib/notify/winback';
import {
  WINBACK_CAMPAIGN,
  composeWinback,
  winbackAudience,
  type ChartFetcher,
  type WinbackRecipient,
} from '@/lib/notify/winbackPipeline';

/**
 * Admin-only win-back sender.
 *
 *   GET            → readiness checklist, audience size, progress
 *   POST preview   → fully rendered emails for the next few people (sends nothing)
 *   POST send      → sends to the next ≤5 people, then returns; the admin page loops
 *
 * Why sending lives here and not in a script: unsubscribe and resume links are
 * HMAC-signed, and only production holds the key production verifies with. A
 * link signed anywhere else would silently fail when clicked.
 *
 * Why batches: each email needs a chart and a model call, and a function may run
 * at most 300s. Why claim-before-send: a double-clicked button or a retried batch
 * must never email anyone twice — the insert on (email, campaign) is the lock.
 */

const SITE = 'https://www.vedichour.com';
const MAX_BATCH = 5;

async function tableExists(db: SupabaseClient, table: string): Promise<boolean> {
  const { error } = await db.from(table).select('*', { count: 'exact', head: true });
  return !error;
}

async function readiness(db: SupabaseClient) {
  const [suppressionTable, sendLogTable] = await Promise.all([
    tableExists(db, 'email_suppressions'),
    tableExists(db, 'winback_sends'),
  ]);
  return {
    production: process.env.VERCEL_ENV === 'production',
    resendConfigured: Boolean(process.env.RESEND_API_KEY?.trim()),
    signingKeyConfigured: Boolean(signingSecretOrNull()),
    anthropicConfigured: Boolean(process.env.ANTHROPIC_API_KEY?.trim()),
    suppressionTable,
    sendLogTable,
  };
}

/** Everyone already attempted in this campaign — sent, failed, or mid-send. None are picked again. */
async function attempted(db: SupabaseClient): Promise<Map<string, string>> {
  const { data, error } = await db
    .from('winback_sends')
    .select('email, status')
    .eq('campaign', WINBACK_CAMPAIGN)
    .limit(1000);
  const out = new Map<string, string>();
  if (error) return out;
  for (const row of (data ?? []) as { email: string; status: string }[]) out.set(row.email, row.status);
  return out;
}

function chartFetcher(): ChartFetcher {
  const agent = new EphemerisAgent();
  return async (r: WinbackRecipient) => {
    try {
      const c = await agent.getNatalChart({
        birth_date: r.birthDate,
        birth_time: r.birthTime,
        birth_city: r.birthCity || 'Unknown',
        birth_lat: r.birthLat,
        birth_lng: r.birthLng,
      });
      return {
        lagna: c.lagna ?? null,
        moonSign: c.planets?.Moon?.sign ?? null,
        nakshatra: c.moon_nakshatra ?? null,
        current: c.current_dasha ?? null,
        sequence: c.dasha_sequence ?? null,
      };
    } catch (e) {
      console.error('[admin/winback] chart failed:', (e as Error).message);
      return null;
    }
  };
}

function resumeHref(reportId: string): string {
  const t = encodeURIComponent(makeResumeToken(reportId));
  return `${SITE}/resume?t=${t}&utm_source=winback&utm_medium=email&utm_campaign=${WINBACK_CAMPAIGN}`;
}

export async function GET() {
  const admin = await requireAdminApi();
  if (admin instanceof NextResponse) return admin;

  const db = createServiceClient();
  const ready = await readiness(db);
  const audience = await winbackAudience(db, { requireSuppressionList: false });
  const done = ready.sendLogTable ? await attempted(db) : new Map<string, string>();

  const counts = { sent: 0, failed: 0, claimed: 0 };
  done.forEach((status) => {
    if (status === 'sent') counts.sent++;
    else if (status === 'failed') counts.failed++;
    else counts.claimed++;
  });

  const categories: Record<string, number> = {};
  for (const r of audience) {
    const c = classifyQuestion(r.question);
    categories[c] = (categories[c] ?? 0) + 1;
  }

  return NextResponse.json({
    campaign: WINBACK_CAMPAIGN,
    readiness: ready,
    canSend: Object.values(ready).every(Boolean),
    audience: audience.length,
    remaining: audience.filter((r) => !done.has(r.email)).length,
    ...counts,
    categories,
  });
}

export async function POST(request: NextRequest) {
  const admin = await requireAdminApi();
  if (admin instanceof NextResponse) return admin;

  const body = (await request.json().catch(() => ({}))) as { mode?: string; limit?: number };
  const mode = body.mode === 'send' ? 'send' : 'preview';
  const limit = Math.min(Math.max(Math.floor(Number(body.limit) || 3), 1), MAX_BATCH);

  const db = createServiceClient();
  const ready = await readiness(db);

  if (!ready.anthropicConfigured) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY is not configured.' }, { status: 503 });
  }
  if (mode === 'send') {
    const missing = Object.entries(ready)
      .filter(([, ok]) => !ok)
      .map(([k]) => k);
    if (missing.length) {
      return NextResponse.json({ error: 'Not ready to send.', missing }, { status: 409 });
    }
  }

  const audience = await winbackAudience(db, { requireSuppressionList: mode === 'send' });
  const done = ready.sendLogTable ? await attempted(db) : new Map<string, string>();
  const batch = audience.filter((r) => !done.has(r.email)).slice(0, limit);

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const fetchChart = chartFetcher();

  if (mode === 'preview') {
    const previews = [];
    for (const r of batch) {
      let offerHref = `${SITE}/resume`;
      try {
        offerHref = resumeHref(r.reportId);
      } catch {
        /* no signing key yet — the button just opens checkout */
      }
      // A placeholder, so opening a preview can never unsubscribe the real person.
      const mail = await composeWinback({ recipient: r, fetchChart, anthropic, offerHref, unsubscribeHref: `${SITE}/api/unsubscribe?t=PREVIEW` });
      previews.push(
        mail.ok
          ? { email: r.email, question: r.question, subject: mail.subject, category: mail.category, html: mail.html }
          : { email: r.email, question: r.question, error: mail.reason },
      );
    }
    return NextResponse.json({ previews });
  }

  const results: { email: string; status: 'sent' | 'failed' | 'skipped'; error?: string }[] = [];
  for (const r of batch) {
    const { error: claimErr } = await db
      .from('winback_sends')
      .insert({ email: r.email, campaign: WINBACK_CAMPAIGN, report_id: r.reportId, status: 'claimed' });
    if (claimErr) {
      if (claimErr.code === '23505') {
        results.push({ email: r.email, status: 'skipped' });
        continue;
      }
      return NextResponse.json({ error: `Send log unavailable: ${claimErr.message}`, results }, { status: 500 });
    }

    const settle = (patch: Record<string, unknown>) =>
      db
        .from('winback_sends')
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq('email', r.email)
        .eq('campaign', WINBACK_CAMPAIGN);

    try {
      const unsub = unsubscribeUrl(r.email, SITE);
      const mail = await composeWinback({ recipient: r, fetchChart, anthropic, offerHref: resumeHref(r.reportId), unsubscribeHref: unsub });
      if (!mail.ok) {
        await settle({ status: 'failed', error: mail.reason });
        results.push({ email: r.email, status: 'failed', error: mail.reason });
        continue;
      }
      const sent = await sendEmail({ to: r.email, subject: mail.subject, html: mail.html, text: mail.text, listUnsubscribeUrl: unsub });
      if (sent.ok) {
        await settle({ status: 'sent', subject: mail.subject, category: mail.category, error: null });
        results.push({ email: r.email, status: 'sent' });
      } else {
        const reason = sent.error ?? (sent.skipped ? 'email sending is not configured' : 'send failed');
        await settle({ status: 'failed', subject: mail.subject, category: mail.category, error: reason });
        results.push({ email: r.email, status: 'failed', error: reason });
      }
    } catch (e) {
      const reason = (e as Error).message.slice(0, 300);
      await settle({ status: 'failed', error: reason });
      results.push({ email: r.email, status: 'failed', error: reason });
    }
  }

  const after = await attempted(db);
  return NextResponse.json({ results, remaining: audience.filter((r) => !after.has(r.email)).length });
}
