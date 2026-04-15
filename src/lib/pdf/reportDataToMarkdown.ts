import type { ReportData } from '@/lib/schema/report';
import { getCanonicalScoreLabel } from '@/lib/schema/report';

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
  lines.push('## Nativity');
  lines.push(`**Lagna:** ${lagna}  **Dasha:** ${md}–${ad}`);
  lines.push('');
  if (nat?.lagna_analysis) {
    lines.push(nat.lagna_analysis);
    lines.push('');
  }
  if (nat?.current_dasha_interpretation) {
    lines.push(nat.current_dasha_interpretation);
    lines.push('');
  }

  // Period Synthesis
  const syn = data.synthesis;
  if (syn) {
    lines.push('## Period Synthesis');
    if (syn.opening_paragraph) {
      lines.push(syn.opening_paragraph);
      lines.push('');
    }

    if (syn.strategic_windows?.length) {
      lines.push('### Strategic Windows');
      for (const w of syn.strategic_windows) {
        lines.push(`- **${w.date}** (Score: ${w.score}, ${w.nakshatra}): ${w.reason}`);
      }
      lines.push('');
    }

    if (syn.caution_dates?.length) {
      lines.push('### Caution Dates');
      for (const c of syn.caution_dates) {
        lines.push(`- **${c.date}** (Score: ${c.score}, ${c.nakshatra}): ${c.reason}`);
      }
      lines.push('');
    }

    const dp = syn.domain_priorities;
    if (dp) {
      lines.push('### Domain Priorities');
      if (dp.career) lines.push(`**Career:** ${dp.career}`);
      if (dp.money) lines.push(`**Money:** ${dp.money}`);
      if (dp.health) lines.push(`**Health:** ${dp.health}`);
      if (dp.relationships) lines.push(`**Relationships:** ${dp.relationships}`);
      lines.push('');
    }

    if (syn.closing_paragraph) {
      lines.push(syn.closing_paragraph);
      lines.push('');
    }
  }

  // Monthly Forecast
  if (data.months?.length) {
    lines.push('## Monthly Forecast (12 Months)');
    lines.push('');
    for (const m of data.months) {
      lines.push(`### ${m.month} — Score: ${m.score}/100`);
      if (m.theme) lines.push(`*${m.theme}*`);
      lines.push('');
      if (m.commentary) {
        lines.push(m.commentary);
        lines.push('');
      }
    }
  }

  // Weekly Outlook
  if (data.weeks?.length) {
    lines.push('## Weekly Outlook (6 Weeks)');
    lines.push('');
    for (const w of data.weeks) {
      lines.push(`### ${w.week_label} — Score: ${w.score}/100`);
      if (w.theme) lines.push(`*${w.theme}*`);
      lines.push('');
      if (w.commentary) {
        lines.push(w.commentary);
        lines.push('');
      }
    }
  }

  // Daily Forecast
  if (data.days?.length) {
    lines.push('## Daily Forecast');
    lines.push('');
    for (const day of data.days) {
      const tier = scoreLabel(day.day_score);
      lines.push(`### ${day.day_label} (${day.date}) — Score: ${day.day_score}/100 [${tier}]`);
      if (day.overview) {
        lines.push('');
        lines.push(day.overview);
      }
      lines.push('');

      if (day.slots?.length) {
        lines.push('| Time | Score | Label | Hora | Choghadiya | Commentary |');
        lines.push('|------|-------|-------|------|------------|------------|');
        for (const slot of day.slots) {
          const label = scoreLabel(slot.score);
          const hora = slot.hora_planet ?? '';
          const chog = slot.choghadiya ?? '';
          const commentary = (slot.commentary_short || slot.commentary || '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
          lines.push(`| ${slot.display_label} | ${slot.score} | ${label} | ${hora} | ${chog} | ${commentary} |`);
        }
        lines.push('');
      }
    }
  }

  return lines.join('\n');
}
