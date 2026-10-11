import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { HORA_ORDER, HORA_THEMES, WEEKDAY_RULERS, horasFrom, nextDayFirstHora } from '@/lib/seo/horaFacts';
import { METHOD_FACTS, METHOD_REVIEWED, METHOD_SHORT } from '@/lib/seo/methodology';
import { buildLlmsFullTxt, buildLlmsTxt } from '@/lib/seo/aiVisibility';
import { GET as sitemap } from '@/app/api/sitemap/route';

const SITE = 'https://www.vedichour.com';
const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8');

describe('hora arithmetic (the table on /hora is computed from this)', () => {
  it('runs Sun, Venus, Mercury, Moon, Saturn, Jupiter, Mars', () => {
    expect([...HORA_ORDER]).toEqual(['Sun', 'Venus', 'Mercury', 'Moon', 'Saturn', 'Jupiter', 'Mars']);
    expect(horasFrom('Sun').slice(0, 7)).toEqual([...HORA_ORDER]);
  });

  it('a day has 24 horas', () => {
    for (const [, ruler] of WEEKDAY_RULERS) expect(horasFrom(ruler)).toHaveLength(24);
  });

  it('the 24th hora is followed by the NEXT weekday’s ruler — the sequence agrees with the weekday rulers', () => {
    WEEKDAY_RULERS.forEach(([day, ruler], i) => {
      const next = WEEKDAY_RULERS[(i + 1) % 7][1];
      expect(nextDayFirstHora(ruler), `${day} → ${WEEKDAY_RULERS[(i + 1) % 7][0]}`).toBe(next);
    });
  });

  it('every weekday has a distinct ruler and every planet has a stated theme', () => {
    expect(new Set(WEEKDAY_RULERS.map(([, r]) => r)).size).toBe(7);
    for (const p of HORA_ORDER) expect(HORA_THEMES[p].length).toBeGreaterThan(20);
  });
});

describe('methodology is true to the code that runs', () => {
  it('has a valid review date and the facts AI assistants need', () => {
    expect(METHOD_REVIEWED).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    const all = METHOD_FACTS.map((f) => `${f.label} ${f.text}`).join(' ');
    for (const needle of ['Swiss Ephemeris', 'Lahiri', 'Whole-sign', 'Vimshottari', 'hora', 'choghadiya', 'Rahu Kaal', 'AI writes']) {
      expect(all, needle).toContain(needle);
    }
    expect(METHOD_SHORT).toMatch(/Lahiri/);
  });

  // If the engine changes, these fail until the public claims are updated to match.
  it('the ephemeris service still uses the Lahiri ayanamsa, whole-sign houses and a pinned ephemeris', () => {
    const main = read('ephemeris-service/main.py');
    expect(main).toContain('swe.SIDM_LAHIRI');
    expect(main).toContain('get_whole_sign_house');
    expect(main).not.toMatch(/Placidus\s*=|b'P'|swe\.houses\([^)]*b?['"]P['"]/);
    expect(read('ephemeris-service/requirements.txt')).toMatch(/^pyswisseph==\d/m);
  });

  it('the hourly score still has the layers the methodology describes, over 18 slots from 06:00', () => {
    const rating = read('src/lib/agents/RatingAgent.ts');
    for (const layer of ['Hora base score', 'Choghadiya modifier', 'Transit Lagna House mod', 'Panchang day adjustment', 'Rahu Kaal penalty']) {
      expect(rating, layer).toContain(layer);
    }
    const main = read('ephemeris-service/main.py');
    expect(main).toMatch(/18 fixed hourly slots/);
    expect(main).toContain('06:00–07:00');
  });
});

describe('where the methodology is published', () => {
  it('llms.txt links it and llms-full.txt carries every fact', () => {
    expect(buildLlmsTxt(SITE)).toContain(`${SITE}/methodology`);
    const full = buildLlmsFullTxt(SITE);
    for (const f of METHOD_FACTS) expect(full).toContain(f.text);
    expect(full).toContain(`reviewed ${METHOD_REVIEWED}`);
  });

  it('the sitemap lists /methodology with its review date', async () => {
    const xml = await (await sitemap()).text();
    const block = xml.split('<url>').find((b) => b.includes('/methodology</loc>'));
    expect(block).toBeTruthy();
    expect(block).toContain(`<lastmod>${METHOD_REVIEWED}</lastmod>`);
  });

  it('every calculator page renders the note (it lives in the shared CalculatorPage)', () => {
    expect(read('src/components/tools/CalculatorPage.tsx')).toContain('<MethodNote />');
  });
});
