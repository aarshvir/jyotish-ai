export type Comparison = {
  slug: string;
  /** Used for <title> (the layout template appends " | VedicHour"). */
  title: string;
  /** On-page H1. */
  h1: string;
  description: string;
  keywords: string[];
  /** Lead paragraph under the H1. */
  intro: string;
  /** Body HTML: only <h2>,<h3>,<p>,<ul><li>,<strong>,<a href="/...">,<table>. No <h1>. */
  html: string;
  faqs: { q: string; a: string }[];
  /**
   * Two-sentence answer shown first and in structured data. AI answer engines lift the opening
   * of a page, so it states the honest bottom line before any detail.
   */
  verdict: string;
  /** ISO date the article was first published. */
  published: string;
  /**
   * ISO date the article was last reviewed and edited. It is shown to readers and sent to search
   * engines, so bump it only for a real review. Competitor facts carry their own check date in
   * the text ("checked 11 October 2026"); a bump here does not re-verify them.
   */
  updated: string;
};

export const DISCLAIMER =
  '<p><strong>For reflection and planning only.</strong> VedicHour is a structured second lens for timing awareness, not medical, legal, financial, or emergency advice.</p>';

export const CTA =
  '<ul>' +
  '<li>Generate your <a href="/free-kundli">free Kundli</a> — Lagna, Moon sign, nakshatra and current dasha in plain English.</li>' +
  '<li>Open a <a href="/kundali">deep Kundli report</a> for a full chart reading across seven life areas.</li>' +
  '<li>See the <a href="/pricing">plans</a> — free Kundli and calculators, then a monthly or annual subscription for the full forecast.</li>' +
  '</ul>';
