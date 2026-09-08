export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/admin/guard';

/**
 * Which integrations are actually configured in THIS deployment.
 *
 * Exists because every notification path — welcome, report-ready, the day-1/3/7
 * nurture, and abandoned-checkout recovery — silently no-ops when RESEND_API_KEY
 * is unset (see lib/notify/email.ts). A monetisation strategy built on "then they
 * get emails prompting them to buy" is worth nothing if the key was never added,
 * and nothing in the product surfaces that. Vercel's runtime logs expire in about
 * an hour on this plan, so the no-op line is unreadable after the fact.
 *
 * Booleans only. Never return or log a secret's value.
 */
const KEYS = [
  { key: 'RESEND_API_KEY',        label: 'Email sending (Resend)',   impact: 'Without it NO email is ever sent: welcome, report-ready, nurture, abandoned-checkout recovery, founder digest.' },
  { key: 'EMAIL_FROM',            label: 'Email from-address',       impact: 'Falls back to VedicHour <support@vedichour.com>.' },
  { key: 'ZIINA_API_TOKEN',       label: 'Payments (Ziina)',         impact: 'Without it checkout returns 503 and nobody can pay.' },
  { key: 'ZIINA_WEBHOOK_SECRET',  label: 'Ziina webhook signature',  impact: 'Unset means the daily reconcile cron is the only way a payment gets confirmed.' },
  { key: 'ANTHROPIC_API_KEY',     label: 'Report narrative (Claude)', impact: 'Without it reports cannot generate prose.' },
  { key: 'FOUNDER_EMAIL',         label: 'Daily founder digest',     impact: 'Falls back to support@vedichour.com.' },
] as const;

export async function GET() {
  const admin = await requireAdminApi();
  if (admin instanceof NextResponse) return admin;

  const integrations = KEYS.map(({ key, label, impact }) => ({
    key,
    label,
    impact,
    configured: Boolean(process.env[key]?.trim()),
  }));

  const missing = integrations.filter((i) => !i.configured).map((i) => i.key);

  return NextResponse.json({
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? 'unknown',
    integrations,
    missing,
    emailWorks: Boolean(process.env.RESEND_API_KEY?.trim()),
  });
}
