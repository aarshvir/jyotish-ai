import { sendEmail } from '@/lib/notify/email';

/**
 * How lead mail leaves the building — and when it must not.
 *
 *   LEADS_DRY_RUN=1        nothing is sent anywhere (a kill switch, also on production);
 *   LEADS_ALLOWLIST=a,b    only these addresses get real mail, everyone else is dry-run
 *                          (how production sending is verified with a team inbox);
 *   NODE_ENV != production dry-run unless LEADS_LIVE_SEND=1, so a developer machine or a
 *                          test run can never email a real person;
 *   otherwise              live, through Resend (and a no-op if RESEND_API_KEY is unset).
 *
 * Nothing here throws. Every outcome is a typed result, so a caller can never mistake "not
 * sent" for "sent" (the audit found lifecycle code that did exactly that).
 */

export type MailMode = 'live' | 'dry_run';
export type MailOutcome =
  | { status: 'sent' }
  | { status: 'dry_run' }
  | { status: 'unconfigured' }
  | { status: 'invalid' }
  | { status: 'provider_error'; error: string };

export interface OutgoingMail {
  to: string;
  subject: string;
  html: string;
  text: string;
  listUnsubscribeUrl: string;
}

export interface LeadMailer {
  send(mail: OutgoingMail): Promise<MailOutcome>;
}

type Env = Record<string, string | undefined>;

export function mailModeFor(email: string, env: Env = process.env): MailMode {
  if ((env.LEADS_DRY_RUN ?? '').trim() === '1') return 'dry_run';
  const allow = (env.LEADS_ALLOWLIST ?? '')
    .split(',')
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean);
  if (allow.length) return allow.includes(email.toLowerCase()) ? 'live' : 'dry_run';
  if (env.NODE_ENV !== 'production' && (env.LEADS_LIVE_SEND ?? '').trim() !== '1') return 'dry_run';
  return 'live';
}

/** a***@gmail.com — for logs and for the screen. */
export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return '***';
  return `${local.slice(0, 1)}***@${domain}`;
}

export function resendMailer(env: Env = process.env): LeadMailer {
  return {
    async send(mail) {
      if (!mail.to || !mail.to.includes('@')) return { status: 'invalid' };
      if (mailModeFor(mail.to, env) === 'dry_run') {
        console.log(`[leads/mail] dry run, not sent: "${mail.subject}" -> ${maskEmail(mail.to)}`);
        return { status: 'dry_run' };
      }
      // sendEmail logs the full recipient when no key is set; check first so an address is never logged.
      if (!env.RESEND_API_KEY?.trim()) return { status: 'unconfigured' };
      const r = await sendEmail({
        to: mail.to,
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
        listUnsubscribeUrl: mail.listUnsubscribeUrl,
      });
      if (r.ok) return { status: 'sent' };
      if (r.skipped) return { status: 'unconfigured' };
      return { status: 'provider_error', error: r.error ?? 'unknown' };
    },
  };
}

/** A mailer that records instead of sending. Used by tests. */
export function recordingMailer(outcome: MailOutcome = { status: 'sent' }): LeadMailer & { sent: OutgoingMail[] } {
  const sent: OutgoingMail[] = [];
  return {
    sent,
    async send(mail) {
      sent.push(mail);
      return outcome;
    },
  };
}
