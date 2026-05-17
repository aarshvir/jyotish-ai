# Content Audit Checklist

**When to run:** Before launch (one final review of 3 reports). Also after any
prompt change or RAG corpus update.
**Source:** v5 §3.7 + v3 §4.1

## 1. Pull a sample

Pre-launch: one free preview report + one 7-day paid/bypass report + one
monthly bypass report (if available).

Post-launch: pull a fresh paid report once per day for the first week.

```sql
select r.id, r.plan, r.user_id, r.generation_trace_id, r.status, r.created_at
from reports r
where r.status = 'completed'
  and r.plan in ('forecast_7day', 'forecast_monthly')
order by r.created_at desc
limit 3;
```

## 2. Domain correctness (must all pass)

For each sampled report, verify:

### 2.1 Lagna (ascendant)
- [ ] Lagna sign is **sidereal / Lahiri**, not tropical. Way to verify: a person born
      around mid-April should have an Aries lagna in tropical but typically a
      Pisces lagna in sidereal. Cross-check against `ephemeris-service /natal-chart`
      with the same inputs.
- [ ] Lagna degree is plausible (0–30°, not negative or >30).

### 2.2 Moon sign + nakshatra
- [ ] Moon sign present and consistent with planet positions.
- [ ] Moon's nakshatra (one of 27) is named and pada (1–4) included.

### 2.3 Vimshottari dasha
- [ ] Current Mahadasha lord is one of: Sun, Moon, Mars, Rahu, Jupiter,
      Saturn, Mercury, Ketu, Venus.
- [ ] Current Antardasha lord is also from that list.
- [ ] Mahadasha + Antardasha date ranges are plausible (Mahadasha is multi-year,
      Antardasha is months-to-years).
- [ ] Dasha lord sequence in the displayed timeline follows the Vimshottari
      120-year order: Sun → Moon → Mars → Rahu → Jupiter → Saturn → Mercury → Ketu → Venus.

### 2.4 Hora schedule (planetary hours)
- [ ] 24 hora segments per day (12 day + 12 night).
- [ ] Lords rotate in the Chaldean order: Sun → Venus → Mercury → Moon →
      Saturn → Jupiter → Mars.
- [ ] Day's first hora lord matches the day-ruler (Sunday = Sun, Monday = Moon,
      Tuesday = Mars, Wednesday = Mercury, Thursday = Jupiter, Friday = Venus,
      Saturday = Saturn).

### 2.5 Choghadiya
- [ ] 8 choghadiya windows per day (Amrit, Shubha, Labha, Char, Rog, Udveg,
      Kaal — sequence varies by day-ruler).
- [ ] Each window is ~90 minutes.

### 2.6 Rahu Kaal
- [ ] Present for the user's current city/date.
- [ ] Day-of-week mapping is the standard rule:
  - Sunday: 16:30–18:00
  - Monday: 07:30–09:00
  - Tuesday: 15:00–16:30
  - Wednesday: 12:00–13:30
  - Thursday: 13:30–15:00
  - Friday: 10:30–12:00
  - Saturday: 09:00–10:30
  (windows shift with sunrise; within ±90 min of the table is fine).
- [ ] Copy avoids fatalism — does NOT say "every action will fail" or similar.

## 3. Citation truthfulness (HARD gate)

For each citation footnote rendered in the report:
- [ ] The marker corresponds to a real source family: BPHS, PHAL, JAIMINI, or UPADESHA.
- [ ] If a chapter number is shown, it is a plausible chapter number for that text
      (BPHS has 97 chapters; Phaladeepika has 28 adhyayas; etc.).
- [ ] If a verse number is shown, it should be cross-referenceable to retrieved RAG
      context — i.e. the chunk that grounded the citation should contain that verse
      number in its metadata. If it does not, the citation is invented and the report
      must NOT ship.

**Acceptance after the v6 corrections:**
- Source-only citations (e.g. `[1] Brihat Parashara Hora Shastra`) are allowed.
- Chapter-only citations (e.g. `[1] Brihat Parashara Hora Shastra, Ch. 34`) are
  allowed when the chunk has a chapter but no verse metadata.
- Full citations (e.g. `[1] Brihat Parashara Hora Shastra, Ch. 34, v. 12`) are
  allowed ONLY when the retrieved chunk explicitly contains both chapter and verse.

**If any verse-level citation cannot be traced to a real chunk: rollback the
report, do not ship.**

## 4. Trust / safety

- [ ] No medical claims ("you will get sick", "you will be cured").
- [ ] No legal claims ("you will win the case", "you will lose property").
- [ ] No guaranteed-outcome claims ("you will definitely marry", "you will
      definitely get the job").
- [ ] No system-prompt leak (no fragments like "You are a Vedic astrologer
      writing a..." in user-visible text).
- [ ] No other-user PII bleed (no other people's names, birth dates, cities
      in this user's report).

## 5. PDF + UI rendering

- [ ] PDF downloads without error.
- [ ] PDF has user's name in title + filename.
- [ ] Citation footnotes render correctly with conditional Ch./v.
- [ ] All sections (nativity, monthly, weekly, daily, synthesis) present and non-empty.
- [ ] No "Commentary is generating" placeholder text on a paid report.

## 6. Sign-off

If all of §2–§5 pass: **GO.**
If any §2 or §3 fails: **NO-GO.** Patch the issue, regenerate, re-audit.
If §4 or §5 fails: **NO-GO.** Same — patch and re-audit.

Auditor signs and dates below for each report:

| Report ID | Auditor | Date | Result | Notes |
|---|---|---|---|---|
|  |  |  |  |  |
|  |  |  |  |  |
|  |  |  |  |  |
