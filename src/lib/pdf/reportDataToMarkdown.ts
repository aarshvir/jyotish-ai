import type { ReportData } from '@/lib/schema/report';
import { getCanonicalScoreLabel } from '@/lib/schema/report';
import { plainify, stripTemplateSections, choghadiyaLabel, isDevFallback } from '@/lib/utils/plainify';

function scoreLabel(score: number): string {
  return getCanonicalScoreLabel(score);
}

export function reportDataToMarkdown(
  data: ReportData,
  displayName: string,
  birthDate: string,
  birthCity: string,
): string {
  const lines: string[] = [];

  // Header
  lines.push(`# Vedic Forecast — ${displayName} (${birthDate}, ${birthCity})`);
  lines.push(`Generated: ${data.generated_at}`);
  lines.push('');

  // Nativity
  const nat = data.nativity;
  const chart = nat?.natal_chart;
  const lagna = chart?.lagna ?? 'Unknown';
  const md = chart?.current_dasha?.mahadasha ?? 'Unknown';
  const ad = chart?.current_dasha?.antardasha ?? 'Unknown';
  lines.push('## Your birth chart');
  lines.push(`**Rising sign:** ${lagna}  **Life period:** ${md} · ${ad} sub-period`);
  lines.push('');
  if (nat?.lagna_analysis) {
    lines.push(plainify(nat.lagna_analysis));
    lines.push('');
  }
  if (nat?.current_dasha_interpretation) {
    lines.push(plainify(nat.current_dasha_interpretation));
    lines.push('');
  }

  // Period Synthesis
  const syn = data.synthesis;
  if (syn) {
    lines.push('## Your forecast summary');
    if (syn.opening_paragraph && !isDevFallback(syn.opening_paragraph)) {
      lines.push(plainify(syn.opening_paragraph));
      lines.push('');
    }

    if (syn.strategic_windows?.length) {
      lines.push('### Best openings');
      for (const w of syn.strategic_windows) {
        const reason = plainify(w.reason);
        lines.push(`- **${w.date}** (Score: ${w.score}): ${reason}`);
      }
      lines.push('');
    }

    if (syn.caution_dates?.length) {
      lines.push('### Go slower');
      for (const c of syn.caution_dates) {
        const reason = plainify(c.reason);
        lines.push(`- **${c.date}** (Score: ${c.score}): ${reason}`);
      }
      lines.push('');
    }

    const dp = syn.domain_priorities;
    if (dp) {
      lines.push('### Domain focus');
      if (dp.career) lines.push(`**Career:** ${plainify(dp.career)}`);
      if (dp.money) lines.push(`**Money:** ${plainify(dp.money)}`);
      if (dp.health) lines.push(`**Health:** ${plainify(dp.health)}`);
      if (dp.relationships) lines.push(`**Relationships:** ${plainify(dp.relationships)}`);
      lines.push('');
    }

    if (syn.closing_paragraph && !isDevFallback(syn.closing_paragraph)) {
      lines.push(plainify(syn.closing_paragraph));
      lines.push('');
    }
  }

  // Monthly Forecast
  if (data.months?.length) {
    lines.push('## The year ahead (12 months)');
    lines.push('');
    for (const m of data.months) {
      lines.push(`### ${m.month} — Score: ${m.score}/100`);
      const theme = m.theme && !isDevFallback(m.theme) ? plainify(m.theme) : '';
      if (theme) lines.push(`*${theme}*`);
      lines.push('');
      if (m.commentary && !isDevFallback(m.commentary)) {
        lines.push(plainify(stripTemplateSections(m.commentary)));
        lines.push('');
      }
    }
  }

  // Weekly Outlook
  if (data.weeks?.length) {
    lines.push('## The next 6 weeks');
    lines.push('');
    for (const w of data.weeks) {
      lines.push(`### ${w.week_label} — Score: ${w.score}/100`);
      const theme = w.theme && !isDevFallback(w.theme) ? plainify(w.theme) : '';
      if (theme) lines.push(`*${theme}*`);
      lines.push('');
      if (w.commentary && !isDevFallback(w.commentary)) {
        lines.push(plainify(w.commentary));
        lines.push('');
      }
    }
  }

  // Daily Forecast
  if (data.days?.length) {
    lines.push('## Day by day');
    lines.push('');
    for (const day of data.days) {
      const tier = scoreLabel(day.day_score);
      lines.push(`### ${day.day_label} (${day.date}) — Score: ${day.day_score}/100 [${tier}]`);
      if (day.overview && !isDevFallback(day.overview)) {
        lines.push('');
        lines.push(plainify(stripTemplateSections(day.overview)));
      }
      lines.push('');

      if (day.slots?.length) {
        lines.push('| Time | Score | Quality | Planet hour | Commentary |');
        lines.push('|------|-------|---------|-------------|------------|');
        for (const slot of day.slots) {
          const label = scoreLabel(slot.score);
          const hora = slot.hora_planet ?? '';
          const chog = choghadiyaLabel(slot.choghadiya ?? '');
          const commentary = plainify((slot.commentary_short || slot.commentary || '').replace(/\|/g, '\\|').replace(/\n/g, ' '));
          lines.push(`| ${slot.display_label} | ${slot.score} | ${label} (${chog}) | ${hora} | ${commentary} |`);
        }
        lines.push('');
      }
    }
  }

  return lines.join('\n');
}
