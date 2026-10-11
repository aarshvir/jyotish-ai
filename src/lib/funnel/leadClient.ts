import type { FunnelAnswers } from './screens';
import type { LeadStatus } from './state';

/**
 * Browser side of POST /api/lead/capture. Never throws and never blocks the visitor: any
 * failure comes back as a status the result screen words honestly. A dropped connection is
 * retried once; an answer from the server (even "not saved") is final.
 */

export interface CaptureRequest {
  sessionId: string;
  slug: string;
  lang: 'en' | 'hi';
  email: string;
  firstName?: string;
  source: 'quiz_s15' | 'reveal_reask';
  marketing: boolean;
  /** Whether the first (service) tick box was on screen. */
  serviceBox: boolean;
  answers: FunnelAnswers;
  utm: Record<string, string>;
}

/** What leaves the browser: the answers without the free-text box, which stays here until a purchase. */
export function answersForServer(a: FunnelAnswers): FunnelAnswers {
  const { mind_words: _words, via_link: _link, ...rest } = a;
  void _words;
  void _link;
  return rest;
}

async function once(req: CaptureRequest): Promise<LeadStatus | 'network'> {
  try {
    const r = await fetch('/api/lead/capture', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: req.sessionId,
        slug: req.slug,
        lang: req.lang,
        email: req.email,
        firstName: req.firstName,
        source: req.source,
        consent: { service: true, marketing: req.marketing },
        serviceBox: req.serviceBox,
        answers: answersForServer(req.answers),
        utm: req.utm,
      }),
    });
    const j = (await r.json().catch(() => ({}))) as { saved?: boolean; emailed?: boolean; to?: string; reason?: string };
    if (!r.ok) return { saved: false, emailed: false, reason: r.status === 429 ? 'rate_limited' : 'rejected' };
    return { saved: j.saved === true, emailed: j.emailed === true, to: j.to, reason: j.reason };
  } catch {
    return 'network';
  }
}

export async function captureLeadRequest(req: CaptureRequest, retryMs = 2000): Promise<LeadStatus> {
  const first = await once(req);
  if (first !== 'network') return first;
  await new Promise((r) => setTimeout(r, retryMs));
  const second = await once(req);
  return second === 'network' ? { saved: false, emailed: false, reason: 'network' } : second;
}

/** One honest sentence about what happened, for the result screen. Null when there is nothing to say. */
export function leadStatusLine(s: LeadStatus | null | undefined, lang: 'en' | 'hi'): string | null {
  if (!s) return null;
  const hi = lang === 'hi';
  if (s.emailed) return hi ? `Aapka chart link ${s.to ?? 'aapki email'} par bhej diya.` : `We sent your chart link to ${s.to ?? 'your email'}.`;
  if (s.saved) {
    if (s.reason === 'suppressed')
      return hi
        ? 'Yeh email hamari emails se unsubscribe hai, isliye link nahi bheja. Aapka chart neeche khula hai.'
        : 'This address has unsubscribed from our emails, so no link was sent. Your chart is open below.';
    return hi
      ? 'Aapka chart save ho gaya, par link abhi bhej nahi paaye. Aapka chart neeche khula hai.'
      : 'Your chart is saved, but we could not send the link just now. Your chart is open below.';
  }
  if (s.reason === 'minor') return null;
  return hi
    ? 'Abhi chart save nahi ho paya. Aapka chart neeche khula hai.'
    : 'We could not save your chart just now. It is open below.';
}
