/**
 * Heuristic metrics for BPHS / RAG A/B on ReportData-shaped JSON.
 */

const CITATION_RE = /\[\[([^\]]+)\]\]/g;

/** @param {string | undefined} text */
export function countInlineCitations(text) {
  if (!text || typeof text !== 'string') return 0;
  const m = text.match(CITATION_RE);
  return m ? m.length : 0;
}

/** @param {string | undefined} text */
export function uniqueCitationKeys(text) {
  if (!text || typeof text !== 'string') return 0;
  const seen = new Set();
  let x;
  const re = new RegExp(CITATION_RE.source, 'g');
  while ((x = re.exec(text)) !== null) {
    seen.add(x[1].trim());
  }
  return seen.size;
}

/**
 * @param {Record<string, unknown> | null} report
 * @returns {Record<string, unknown>}
 */
export function computeRagMetrics(report) {
  const nat = report?.nativity;
  const lagna = (nat?.lagna_analysis && String(nat.lagna_analysis)) || '';
  const dasha = (nat?.current_dasha_interpretation && String(nat.current_dasha_interpretation)) || '';
  const syn = (report?.synthesis?.opening_paragraph && String(report.synthesis.opening_paragraph)) || '';
  const days = Array.isArray(report?.days) ? report.days : [];
  const firstDay = days[0];
  const overview = (firstDay?.overview && String(firstDay.overview)) || '';
  let slotCites = 0;
  let slotTextLen = 0;
  const slotComs = [];
  for (const d of days) {
    const slots = Array.isArray(d?.slots) ? d.slots : [];
    for (const s of slots) {
      const c = (s?.commentary && String(s.commentary)) || '';
      slotCites += countInlineCitations(c);
      slotTextLen += c.length;
      if (c.trim()) slotComs.push(c.trim());
    }
  }
  const uniqueSlots = new Set(slotComs);
  const repRate = slotComs.length ? 1 - uniqueSlots.size / slotComs.length : 0;

  return {
    nativity_lagna_chars: lagna.length,
    nativity_lagna_citations: countInlineCitations(lagna),
    nativity_lagna_unique_cites: uniqueCitationKeys(lagna),
    nativity_dasha_chars: dasha.length,
    nativity_dasha_citations: countInlineCitations(dasha),
    synthesis_opening_citations: countInlineCitations(syn),
    first_day_overview_citations: countInlineCitations(overview),
    all_slot_citations: slotCites,
    slot_commentary_total_chars: slotTextLen,
    slot_identical_commentary_rate: Math.round(repRate * 1000) / 1000,
  };
}

/** @param {string} s */
export function excerpt(s, max = 420) {
  const t = (s || '').replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  return t.slice(0, max) + '…';
}
