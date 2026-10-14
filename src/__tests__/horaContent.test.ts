import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const source = readFileSync(join(process.cwd(), 'src/app/hora/page.tsx'), 'utf8');
const text = source.replace(/\s+/g, ' ');

describe('hora page availability and content contract', () => {
  it('offers free chart facts and dasha without promising a free personal hour grid', () => {
    expect(text).toContain('shows natal chart facts, not a personal hourly forecast.');
    expect(source).toContain('<Link href="/vimshottari-dasha-calculator">current dasha</Link>');
    expect(source).toContain('<Link href="/free-kundli" className="btn-primary">Get your free chart facts');
    expect(text).not.toContain('to see a sample hour-by-hour grid for your chart');
    expect(text).not.toContain('Read your day, hour by hour');
  });

  it('labels the sample fictional and distinguishes fixed windows from variable horas', () => {
    expect(source).toContain('<Link href="/sample-report">fictional example hour grid</Link>');
    expect(source).toContain('<Link href="/sample-report">view the fictional example reading</Link>');
    expect(text).toContain('These clock-hour windows are not the variable sunrise-based horas.');
    expect(text).toContain('a hora can change within a clock-hour window.');
    expect(source).toContain('<strong>60-minute windows</strong>');
  });

  it('states new paid forecasts are unavailable and links to existing readings', () => {
    expect(text).toContain('New paid forecasts are currently unavailable. Existing readings remain accessible from your account.');
    expect(source).toContain('<Link href="/dashboard">Open existing readings</Link>');
    expect(source).not.toContain('href="/start"');
    expect(text).not.toContain('comes with a VedicHour subscription');
    expect(text).not.toContain('2-minute quiz');
  });

  it('keeps the traditional explanation and consistent review dates without dead code or duplicate copy', () => {
    expect(source).toContain('HORA_ORDER.join(');
    expect(source).toContain('WEEKDAY_RULERS.map(');
    expect(source).toContain("horasFrom('Sun').slice(0, 12)");
    expect(source).toContain('Updated 15 October 2026');
    expect(source).toContain("dateModified: '2026-10-15'");
    expect(source).not.toContain('articleLd');
    expect(text).not.toContain('draws on drawing on');
  });
});
