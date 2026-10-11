"""Run: python scripts/gen_transits.py   (needs: pip install pyswisseph)

Generate src/content/transits.ts: sidereal (Lahiri) sign ingress dates, in IST, for the slow planets.

Source: Swiss Ephemeris (pyswisseph 2.10), Lahiri ayanamsa, mean lunar node for Rahu and Ketu.
Ketu is always Rahu + 180 degrees, so Ketu's segments are Rahu's with the sign shifted by six.
"""
import os
import swisseph as swe
from datetime import datetime, timedelta, timezone

swe.set_sid_mode(swe.SIDM_LAHIRI)
SIGNS = ['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces']
IST = timezone(timedelta(hours=5, minutes=30))
FLAGS = swe.FLG_SIDEREAL | swe.FLG_SWIEPH


def jd(dt):
    return swe.julday(dt.year, dt.month, dt.day, dt.hour + dt.minute / 60 + dt.second / 3600)


def lon(planet, j):
    if planet == 'rahu':
        return swe.calc_ut(j, swe.MEAN_NODE, FLAGS)[0][0]
    pid = {'saturn': swe.SATURN, 'jupiter': swe.JUPITER}[planet]
    return swe.calc_ut(j, pid, FLAGS)[0][0]


def sign_at(planet, t):
    return int(lon(planet, jd(t)) // 30)


def ingresses(planet, start, end, step_h):
    out = []
    t = start
    prev = sign_at(planet, t)
    while t < end:
        t2 = t + timedelta(hours=step_h)
        s = sign_at(planet, t2)
        if s != prev:
            lo, hi = t, t2
            for _ in range(32):
                mid = lo + (hi - lo) / 2
                if sign_at(planet, mid) == prev:
                    lo = mid
                else:
                    hi = mid
            out.append((hi.astimezone(IST), prev, s))
            prev = s
        t = t2
    return out


def segments(planet, start_year, end_year, step_h):
    S = datetime(start_year, 1, 1, tzinfo=timezone.utc)
    E = datetime(end_year, 1, 1, tzinfo=timezone.utc)
    ing = ingresses(planet, S, E, step_h)
    segs = {s: [] for s in SIGNS}
    # segment i: sign ing[i].to from ing[i].time to ing[i+1].time. The first and last partial
    # segments are dropped, so every segment listed is complete.
    for i in range(len(ing) - 1):
        _, _, to_sign = ing[i]
        a = ing[i][0].strftime('%Y-%m-%d')
        b = ing[i + 1][0].strftime('%Y-%m-%d')
        segs[SIGNS[to_sign]].append([a, b])
    return segs


data = {
    'saturn': segments('saturn', 1985, 2068, 12),
    'jupiter': segments('jupiter', 1990, 2056, 12),
    'rahu': segments('rahu', 1990, 2056, 24),
}
# Ketu: opposite sign of Rahu on the same dates.
ketu = {SIGNS[(i + 6) % 12]: list(data['rahu'][SIGNS[i]]) for i in range(12)}
data['ketu'] = ketu

lines = []
lines.append("/**")
lines.append(" * Sidereal (Lahiri) sign transits of the four slow planets, as complete [start, end] segments in IST dates.")
lines.append(" *")
lines.append(" * Generated with the Swiss Ephemeris (pyswisseph) on 2026-10-11. Rahu and Ketu use the mean node, as most")
lines.append(" * Indian panchangs do; Ketu is always six signs from Rahu. A planet that turns retrograde can step back into")
lines.append(" * the previous sign, so one stay in a sign may appear as two or three segments.")
lines.append(" * Do not edit by hand; regenerate from the ephemeris.")
lines.append(" */")
lines.append("export type SlowPlanet = 'saturn' | 'jupiter' | 'rahu' | 'ketu';")
lines.append("export type SignSlug = 'aries' | 'taurus' | 'gemini' | 'cancer' | 'leo' | 'virgo' | 'libra' | 'scorpio' | 'sagittarius' | 'capricorn' | 'aquarius' | 'pisces';")
lines.append("export type Segment = readonly [start: string, end: string];")
lines.append("")
lines.append("/** Date the table was generated and checked against the ephemeris. */")
lines.append("export const TRANSIT_DATA_DATE = '2026-10-11';")
lines.append("")
lines.append("export const SLOW_PLANETS: readonly SlowPlanet[] = ['saturn', 'jupiter', 'rahu', 'ketu'];")
lines.append("")
lines.append("export const TRANSIT_SEGMENTS: Record<SlowPlanet, Record<SignSlug, readonly Segment[]>> = {")
for pl in ['saturn', 'jupiter', 'rahu', 'ketu']:
    lines.append(f"  {pl}: {{")
    for s in SIGNS:
        segs = data[pl][s]
        inner = ', '.join(f"['{a}', '{b}']" for a, b in segs)
        lines.append(f"    {s}: [{inner}],")
    lines.append("  },")
lines.append("};")
open(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'src', 'content', 'transits.ts'), 'w', encoding='utf-8', newline='\n').write('\n'.join(lines) + '\n')
for pl in ['saturn', 'jupiter', 'rahu']:
    print(pl, {s: len(v) for s, v in data[pl].items()})
print(data['saturn']['pisces'], data['saturn']['aries'])
print(data['jupiter']['cancer'], data['jupiter']['leo'])
print(data['rahu']['aquarius'], data['rahu']['capricorn'], data['ketu']['leo'])
