# Jyotish AI -- Full Report Model Comparison
Generated: 2026-03-22 22:32

---

## Part 1: Day Score Variance vs Grandmaster Benchmark

The scoring engine is model-independent (Python ephemeris).
This measures formula accuracy, not AI quality.

| Metric | Value | Target |
|--------|-------|--------|
| Days within 10% variance | 9/22 | 18/22 (80%) |
| Average variance | 11.9% | <10% |
| Status | FAIL | -- |

### Per-Date Breakdown
| Date | Benchmark | Live | Variance | Status |
|------|-----------|------|----------|--------|
| 2026-02-17 | 39.2 | 38 | 3.1% | OK |
| 2026-02-18 | 53.2 | 44 | 17.3% | FAIL |
| 2026-02-19 | 72.4 | 63 | 13.0% | FAIL |
| 2026-02-20 | 69.3 | 65 | 6.2% | OK |
| 2026-02-21 | 55.9 | 62 | 10.9% | FAIL |
| 2026-02-22 | 62.6 | 61 | 2.6% | OK |
| 2026-02-23 | 76.8 | 76 | 1.0% | OK |
| 2026-02-24 | 66.2 | 76 | 14.8% | FAIL |
| 2026-02-25 | 46.8 | 50 | 6.8% | OK |
| 2026-02-26 | 53.0 | 53 | 0.0% | OK |
| 2026-02-27 | 59.9 | 46 | 23.2% | FAIL |
| 2026-02-28 | 79.6 | 61 | 23.4% | FAIL |
| 2026-03-01 | 60.2 | 67 | 11.3% | FAIL |
| 2026-03-02 | 38.1 | 41 | 7.6% | OK |
| 2026-03-03 | 49.0 | 57 | 16.3% | FAIL |
| 2026-03-04 | 61.2 | 51 | 16.7% | FAIL |
| 2026-03-05 | 57.5 | 44 | 23.5% | FAIL |
| 2026-03-06 | 47.9 | 36 | 24.8% | FAIL |
| 2026-03-07 | 65.2 | 54 | 17.2% | FAIL |
| 2026-03-08 | 66.9 | 58 | 13.3% | FAIL |
| 2026-03-09 | 46.3 | 47 | 1.5% | OK |
| 2026-03-10 | 76.2 | 71 | 6.8% | OK |

---

## Part 2: Commentary Quality by Model

Sections evaluated:
- **Daily Overviews** (7 days): word count, STRATEGY sections,
  ALL-CAPS headlines, house references, no generic language
- **Hourly Commentary** (18 slots x 1 day): word count per slot,
  house refs, choghadiya explained, directive CAPS lines
- **Monthly Analysis** (6 months): word count, score spread,
  house refs, planet references
- **Synthesis**: opening paragraph length, CAPS headline,
  strategic windows, domain priorities completeness

Grandmaster standards:
- Daily overview: 280-350 words
- Hourly slot: 150-250 words
- Monthly: 150+ words
- Synthesis opening: 200+ words

### Overall Quality Scores

Structural quality + **Vedic accuracy** (Claude Sonnet judge on lagna/yoga/dasha/choghadiya/consistency).

| Model | Quality /10 | Accuracy /10 | Lagna | Yoga | Dasha | Chog | Cost | vs baseline |
|-------|------------|--------------|-------|------|-------|------|------|-------------|
| **Grok 4.20 Multi-Agent** | **9.0/10** | **0/10** | -- | -- | -- | -- | **$0.2860** | 58% cheaper |
| **Claude Sonnet 4.6** | **8.5/10** | **0/10** | -- | -- | -- | -- | **$0.6750** | baseline |
| **GPT-5.4 Reasoning-High** | **8.5/10** | **0/10** | -- | -- | -- | -- | **$0.6650** | 1% cheaper |
| **Gemini 2.5 Flash** | **8.5/10** | **0/10** | -- | -- | -- | -- | **$0.1085** | 84% cheaper |
| **Gemini 3.1 Pro** | **8.5/10** | **0/10** | -- | -- | -- | -- | **$0.5320** | 21% cheaper |
| **Grok 4.20 Reasoning** | **8.5/10** | **0/10** | -- | -- | -- | -- | **$0.2860** | 58% cheaper |
| **GPT-5.4 mini** | **8.2/10** | **0/10** | -- | -- | -- | -- | **$0.1995** | 70% cheaper |
| **Grok 4** | **8.0/10** | **0/10** | -- | -- | -- | -- | **$0.6750** | 0% cheaper |
| **GPT-5.4 nano** | **7.8/10** | **0/10** | -- | -- | -- | -- | **$0.0552** | 92% cheaper |
| **DeepSeek V3.2** | **7.2/10** | **0/10** | -- | -- | -- | -- | **$0.0228** | 97% cheaper |
| **Claude Haiku 4.5** | **7.0/10** | **0/10** | -- | -- | -- | -- | **$0.1800** | 73% cheaper |
| **Grok 4.1 Fast Reasoning** | **7.0/10** | **0/10** | -- | -- | -- | -- | **$0.0245** | 96% cheaper |
| **DeepSeek R1** | **5.2/10** | **0/10** | -- | -- | -- | -- | **$0.1008** | 85% cheaper |

*Lagna / Yoga / Dasha / Choghadiya columns = mean of Sonnet judge scores across daily, hourly, monthly, and synthesis samples.*


### Detailed Section Analysis

#### Claude Haiku 4.5

**Daily Overviews** (Quality: 3/10)
- Avg word count: 124 (target: 280-350w)
- STRATEGY sections: 3/7
- ALL-CAPS headlines: 0/7
- Total house references: 16
- Generic phrases: 0 (target: 0)
- Overviews with nakshatra: 3/7

**Hourly Commentary** (Quality: 8/10)
- Slots evaluated: 18/18
- Avg word count: 107 (target: 150-250w)
- Slots meeting min word count: 0/18
- Total house refs: 72
- Choghadiya explained: 17/18
- Directive CAPS lines: 0/18

**Monthly Commentary** (Quality: 9/10)
- Avg word count: 186 (target: 150+ words)
- Score spread: 24 (range: 48-72)
- Total house refs: 23
- Avg planets/month: 5.8

**Synthesis** (Quality: 8/10)
- Opening paragraph: 316w (target: 200+ words)
- ALL-CAPS headline: False
- Strategic windows: 6
- Windows with high score (70+): 6
- Domain priorities complete: True

---

#### Claude Sonnet 4.6

**Daily Overviews** (Quality: 9/10)
- Avg word count: 352 (target: 280-350w)
- STRATEGY sections: 7/7
- ALL-CAPS headlines: 7/7
- Total house references: 34
- Generic phrases: 1 (target: 0)
- Overviews with nakshatra: 7/7

**Hourly Commentary** (Quality: 8/10)
- Slots evaluated: 18/18
- Avg word count: 146 (target: 150-250w)
- Slots meeting min word count: 4/18
- Total house refs: 251
- Choghadiya explained: 17/18
- Directive CAPS lines: 0/18

**Monthly Commentary** (Quality: 9/10)
- Avg word count: 206 (target: 150+ words)
- Score spread: 31 (range: 42-73)
- Total house refs: 45
- Avg planets/month: 5.8

**Synthesis** (Quality: 8/10)
- Opening paragraph: 296w (target: 200+ words)
- ALL-CAPS headline: False
- Strategic windows: 3
- Windows with high score (70+): 3
- Domain priorities complete: True

---

#### DeepSeek V3.2

**Daily Overviews** (Quality: 6/10)
- Avg word count: 212 (target: 280-350w)
- STRATEGY sections: 7/7
- ALL-CAPS headlines: 0/7
- Total house references: 71
- Generic phrases: 1 (target: 0)
- Overviews with nakshatra: 7/7

**Hourly Commentary** (Quality: 7/10)
- Slots evaluated: 18/18
- Avg word count: 98 (target: 150-250w)
- Slots meeting min word count: 0/18
- Total house refs: 84
- Choghadiya explained: 17/18
- Directive CAPS lines: 0/18

**Monthly Commentary** (Quality: 9/10)
- Avg word count: 169 (target: 150+ words)
- Score spread: 26 (range: 48-74)
- Total house refs: 37
- Avg planets/month: 4.8

**Synthesis** (Quality: 7/10)
- Opening paragraph: 141w (target: 200+ words)
- ALL-CAPS headline: False
- Strategic windows: 2
- Windows with high score (70+): 2
- Domain priorities complete: True

---

#### DeepSeek R1

**Daily Overviews** (Quality: 6/10)
- Avg word count: 203 (target: 280-350w)
- STRATEGY sections: 7/7
- ALL-CAPS headlines: 0/7
- Total house references: 115
- Generic phrases: 1 (target: 0)
- Overviews with nakshatra: 7/7

**Hourly Commentary** (Quality: 3/10)
- Slots evaluated: 18/18
- Avg word count: 7 (target: 150-250w)
- Slots meeting min word count: 0/18
- Total house refs: 0
- Choghadiya explained: 17/18
- Directive CAPS lines: 0/18

**Monthly Commentary** (Quality: 8/10)
- Avg word count: 135 (target: 150+ words)
- Score spread: 27 (range: 48-75)
- Total house refs: 44
- Avg planets/month: 6.8

**Synthesis** (Quality: 4/10)
- Opening paragraph: 91w (target: 200+ words)
- ALL-CAPS headline: False
- Strategic windows: 2
- Windows with high score (70+): 2
- Domain priorities complete: False

---

#### GPT-5.4 nano

**Daily Overviews** (Quality: 7/10)
- Avg word count: 247 (target: 280-350w)
- STRATEGY sections: 0/7
- ALL-CAPS headlines: 7/7
- Total house references: 16
- Generic phrases: 0 (target: 0)
- Overviews with nakshatra: 7/7

**Hourly Commentary** (Quality: 8/10)
- Slots evaluated: 18/18
- Avg word count: 144 (target: 150-250w)
- Slots meeting min word count: 2/18
- Total house refs: 75
- Choghadiya explained: 17/18
- Directive CAPS lines: 0/18

**Monthly Commentary** (Quality: 9/10)
- Avg word count: 170 (target: 150+ words)
- Score spread: 32 (range: 42-74)
- Total house refs: 21
- Avg planets/month: 5.2

**Synthesis** (Quality: 7/10)
- Opening paragraph: 150w (target: 200+ words)
- ALL-CAPS headline: False
- Strategic windows: 3
- Windows with high score (70+): 2
- Domain priorities complete: True

---

#### GPT-5.4 mini

**Daily Overviews** (Quality: 8/10)
- Avg word count: 252 (target: 280-350w)
- STRATEGY sections: 7/7
- ALL-CAPS headlines: 0/7
- Total house references: 84
- Generic phrases: 0 (target: 0)
- Overviews with nakshatra: 7/7

**Hourly Commentary** (Quality: 9/10)
- Slots evaluated: 18/18
- Avg word count: 147 (target: 150-250w)
- Slots meeting min word count: 5/18
- Total house refs: 182
- Choghadiya explained: 17/18
- Directive CAPS lines: 0/18

**Monthly Commentary** (Quality: 9/10)
- Avg word count: 162 (target: 150+ words)
- Score spread: 33 (range: 42-75)
- Total house refs: 67
- Avg planets/month: 3.8

**Synthesis** (Quality: 7/10)
- Opening paragraph: 156w (target: 200+ words)
- ALL-CAPS headline: False
- Strategic windows: 3
- Windows with high score (70+): 3
- Domain priorities complete: True

---

#### GPT-5.4 Reasoning-High

**Daily Overviews** (Quality: 10/10)
- Avg word count: 300 (target: 280-350w)
- STRATEGY sections: 7/7
- ALL-CAPS headlines: 7/7
- Total house references: 56
- Generic phrases: 0 (target: 0)
- Overviews with nakshatra: 7/7

**Hourly Commentary** (Quality: 9/10)
- Slots evaluated: 18/18
- Avg word count: 134 (target: 150-250w)
- Slots meeting min word count: 0/18
- Total house refs: 103
- Choghadiya explained: 17/18
- Directive CAPS lines: 0/18

**Monthly Commentary** (Quality: 8/10)
- Avg word count: 130 (target: 150+ words)
- Score spread: 25 (range: 48-73)
- Total house refs: 42
- Avg planets/month: 6.0

**Synthesis** (Quality: 7/10)
- Opening paragraph: 180w (target: 200+ words)
- ALL-CAPS headline: True
- Strategic windows: 2
- Windows with high score (70+): 2
- Domain priorities complete: False

---

#### Gemini 2.5 Flash

**Daily Overviews** (Quality: 10/10)
- Avg word count: 300 (target: 280-350w)
- STRATEGY sections: 7/7
- ALL-CAPS headlines: 7/7
- Total house references: 56
- Generic phrases: 0 (target: 0)
- Overviews with nakshatra: 7/7

**Hourly Commentary** (Quality: 9/10)
- Slots evaluated: 18/18
- Avg word count: 134 (target: 150-250w)
- Slots meeting min word count: 0/18
- Total house refs: 103
- Choghadiya explained: 17/18
- Directive CAPS lines: 0/18

**Monthly Commentary** (Quality: 8/10)
- Avg word count: 130 (target: 150+ words)
- Score spread: 25 (range: 48-73)
- Total house refs: 42
- Avg planets/month: 6.0

**Synthesis** (Quality: 7/10)
- Opening paragraph: 180w (target: 200+ words)
- ALL-CAPS headline: True
- Strategic windows: 2
- Windows with high score (70+): 2
- Domain priorities complete: False

---

#### Gemini 3.1 Pro

**Daily Overviews** (Quality: 10/10)
- Avg word count: 300 (target: 280-350w)
- STRATEGY sections: 7/7
- ALL-CAPS headlines: 7/7
- Total house references: 56
- Generic phrases: 0 (target: 0)
- Overviews with nakshatra: 7/7

**Hourly Commentary** (Quality: 9/10)
- Slots evaluated: 18/18
- Avg word count: 134 (target: 150-250w)
- Slots meeting min word count: 0/18
- Total house refs: 103
- Choghadiya explained: 17/18
- Directive CAPS lines: 0/18

**Monthly Commentary** (Quality: 8/10)
- Avg word count: 130 (target: 150+ words)
- Score spread: 25 (range: 48-73)
- Total house refs: 42
- Avg planets/month: 6.0

**Synthesis** (Quality: 7/10)
- Opening paragraph: 180w (target: 200+ words)
- ALL-CAPS headline: True
- Strategic windows: 2
- Windows with high score (70+): 2
- Domain priorities complete: False

---

#### Grok 4

**Daily Overviews** (Quality: 8/10)
- Avg word count: 387 (target: 280-350w)
- STRATEGY sections: 7/7
- ALL-CAPS headlines: 0/7
- Total house references: 312
- Generic phrases: 0 (target: 0)
- Overviews with nakshatra: 7/7

**Hourly Commentary** (Quality: 7/10)
- Slots evaluated: 18/18
- Avg word count: 142 (target: 150-250w)
- Slots meeting min word count: 7/18
- Total house refs: 1
- Choghadiya explained: 17/18
- Directive CAPS lines: 0/18

**Monthly Commentary** (Quality: 9/10)
- Avg word count: 218 (target: 150+ words)
- Score spread: 27 (range: 48-75)
- Total house refs: 69
- Avg planets/month: 7.2

**Synthesis** (Quality: 8/10)
- Opening paragraph: 267w (target: 200+ words)
- ALL-CAPS headline: False
- Strategic windows: 2
- Windows with high score (70+): 2
- Domain priorities complete: True

---

#### Grok 4.1 Fast Reasoning

**Daily Overviews** (Quality: 8/10)
- Avg word count: 275 (target: 280-350w)
- STRATEGY sections: 7/7
- ALL-CAPS headlines: 0/7
- Total house references: 185
- Generic phrases: 0 (target: 0)
- Overviews with nakshatra: 7/7

**Hourly Commentary** (Quality: 7/10)
- Slots evaluated: 18/18
- Avg word count: 90 (target: 150-250w)
- Slots meeting min word count: 0/18
- Total house refs: 276
- Choghadiya explained: 18/18
- Directive CAPS lines: 0/18

**Monthly Commentary** (Quality: 8/10)
- Avg word count: 168 (target: 150+ words)
- Score spread: 33 (range: 42-75)
- Total house refs: 15
- Avg planets/month: 7.8

**Synthesis** (Quality: 5/10)
- Opening paragraph: 165w (target: 200+ words)
- ALL-CAPS headline: False
- Strategic windows: 2
- Windows with high score (70+): 2
- Domain priorities complete: False

---

#### Grok 4.20 Multi-Agent

**Daily Overviews** (Quality: 10/10)
- Avg word count: 360 (target: 280-350w)
- STRATEGY sections: 7/7
- ALL-CAPS headlines: 6/7
- Total house references: 209
- Generic phrases: 0 (target: 0)
- Overviews with nakshatra: 7/7

**Hourly Commentary** (Quality: 9/10)
- Slots evaluated: 18/18
- Avg word count: 232 (target: 150-250w)
- Slots meeting min word count: 18/18
- Total house refs: 351
- Choghadiya explained: 17/18
- Directive CAPS lines: 0/18

**Monthly Commentary** (Quality: 9/10)
- Avg word count: 182 (target: 150+ words)
- Score spread: 30 (range: 45-75)
- Total house refs: 77
- Avg planets/month: 7.0

**Synthesis** (Quality: 8/10)
- Opening paragraph: 199w (target: 200+ words)
- ALL-CAPS headline: False
- Strategic windows: 2
- Windows with high score (70+): 2
- Domain priorities complete: True

---

#### Grok 4.20 Reasoning

**Daily Overviews** (Quality: 10/10)
- Avg word count: 300 (target: 280-350w)
- STRATEGY sections: 7/7
- ALL-CAPS headlines: 7/7
- Total house references: 56
- Generic phrases: 0 (target: 0)
- Overviews with nakshatra: 7/7

**Hourly Commentary** (Quality: 9/10)
- Slots evaluated: 18/18
- Avg word count: 134 (target: 150-250w)
- Slots meeting min word count: 0/18
- Total house refs: 103
- Choghadiya explained: 17/18
- Directive CAPS lines: 0/18

**Monthly Commentary** (Quality: 8/10)
- Avg word count: 130 (target: 150+ words)
- Score spread: 25 (range: 48-73)
- Total house refs: 42
- Avg planets/month: 6.0

**Synthesis** (Quality: 7/10)
- Opening paragraph: 180w (target: 200+ words)
- ALL-CAPS headline: True
- Strategic windows: 2
- Windows with high score (70+): 2
- Domain priorities complete: False

---

## Part 3: Cost at Scale

**Best quality:** Grok 4.20 Multi-Agent (9.0/10)
**Cheapest:** DeepSeek V3.2 ($0.0228/report)
**Baseline (Claude Sonnet 4.6):** $0.6750/report

| Reports/month | Claude Haiku 4.5 | Claude Sonnet 4.6 | DeepSeek V3.2 | DeepSeek R1 | GPT-5.4 nano | GPT-5.4 mini | GPT-5.4 Reasoning-High | Gemini 2.5 Flash | Gemini 3.1 Pro | Grok 4 | Grok 4.1 Fast Reasoning | Grok 4.20 Multi-Agent | Grok 4.20 Reasoning | 
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 100 | $18.00 | $67.50 | $2.28 | $10.08 | $5.52 | $19.95 | $66.50 | $10.85 | $53.20 | $67.50 | $2.45 | $28.60 | $28.60 |
| 500 | $90.00 | $337.50 | $11.40 | $50.40 | $27.60 | $99.75 | $332.50 | $54.25 | $266.00 | $337.50 | $12.25 | $143.00 | $143.00 |
| 1,000 | $180.00 | $675.00 | $22.80 | $100.80 | $55.20 | $199.50 | $665.00 | $108.50 | $532.00 | $675.00 | $24.50 | $286.00 | $286.00 |
| 5,000 | $900.00 | $3375.00 | $114.00 | $504.00 | $276.00 | $997.50 | $3325.00 | $542.50 | $2660.00 | $3375.00 | $122.50 | $1430.00 | $1430.00 |

---

## Part 4: Hybrid Combo Results

### Combo Summary

| Combo | Quality | Accuracy | Lagna | Yoga | Dasha | Chog | Est. $/report | vs Sonnet |
|-------|---------|----------|-------|------|-------|------|---------------|-------------|
| **Combo: Smart Hybrid** | 5.4/10 | 3.5/10 | 2.7 | 0.7 | 3.3 | 2.3 | $0.2561 | 62% cheaper |
| **Combo: GPT Thinking Stack** | 1.6/10 | 3.6/10 | 6.0 | 0.0 | 7.0 | 0.0 | $0.5231 | 23% cheaper |
| **Combo: Ultra Budget** | 1.6/10 | 3.0/10 | 5.0 | 0.0 | 6.0 | 0.0 | $0.0743 | 89% cheaper |

**Per-section models:**

- **Combo: Smart Hybrid**:

```json
{
  "daily_overviews": "grok-4.20-multi-agent",
  "hourly": "gpt-5.4-mini",
  "monthly": "gpt-5.4-nano",
  "synthesis": "claude-haiku-4-5-20251001",
  "nativity": "gpt-5.4-nano"
}
```

- **Combo: GPT Thinking Stack**:

```json
{
  "daily_overviews": "gpt-5.4-high-reasoning",
  "hourly": "gpt-5.4-mini",
  "monthly": "gpt-5.4-nano",
  "synthesis": "gpt-5.4-high-reasoning",
  "nativity": "gpt-5.4-nano"
}
```

- **Combo: Ultra Budget**:

```json
{
  "daily_overviews": "gpt-5.4-nano",
  "hourly": "gpt-5.4-nano",
  "monthly": "gpt-5.4-nano",
  "synthesis": "gpt-5.4-nano",
  "nativity": "gpt-5.4-nano"
}
```

### Critical Errors Found

- **Combo: Smart Hybrid** (daily): Harshana yoga is described as 'disciplines action' and keeps 'mind focused' — correct meaning is joy, delight, happiness, auspicious for celebrations; this is a hallucination of meaning
- **Combo: Smart Hybrid** (daily): 'Anuradha nakshatra activates decision gates through Saturn influence' — Anuradha is not mentioned in ground truth and this is an unsupported hallucination
- **Combo: Smart Hybrid** (daily): Best action window recommendation directs use of 'Mars hora' and earliest strong display_label, completely ignoring the verified 11:00–12:00 Labh choghadiya best window
- **Combo: Smart Hybrid** (daily): Rahu Kaal window cited as 15:26–16:55 — ground truth confirms Rahu Kaal is active but does not specify this time range; the specific window is fabricated
- **Combo: Smart Hybrid** (daily): Saturn pressure on H6 (Sagittarius) is asserted without any Saturn placement reference in the ground truth
- **Combo: Smart Hybrid** (daily): Jupiter influence on H12 (Gemini) steadying expenditure is asserted without any Jupiter placement reference in the ground truth
- **Combo: Smart Hybrid** (daily): Moon-linked timing connecting to H11 outcomes is ungrounded — Moon is in H5 (Scorpio) per ground truth, not H11
- **Combo: Smart Hybrid** (daily): Commentary calls the yoga 'Exalted Anuradha Yoga Harshana' conflating nakshatra and yoga into a fabricated combined concept not present in ground truth
- **Combo: Smart Hybrid** (daily): H11 gains emphasis is misplaced — Mercury rules H3 and H12 for Cancer lagna, not H11; no ground truth basis for H11 focus
- **Combo: Smart Hybrid** (hourly): Harshana yoga is never mentioned; the commentary invents 'Jupiter hora' as the governing factor, which is a hallucination not present in ground truth
- **Combo: Smart Hybrid** (hourly): 6th-house (Sagittarius) and 9th-house (Pisces) themes are introduced with no astrological justification tied to the active planets or dasha lords for this slot
- **Combo: Smart Hybrid** (hourly): Mercury's rulership of H3 (Virgo) and H12 (Gemini) is not mentioned; dasha logic is vague and technically unsupported
- **Combo: Smart Hybrid** (hourly): No reference to the best action window of 11:00–12:00 is made in the commentary
- **Combo: Smart Hybrid** (hourly): Rahu Kaal being active is not acknowledged, which is a significant omission given it is flagged as True in ground truth
- **Combo: Smart Hybrid** (hourly): Commentary tone implies a moderately strong slot but fails to integrate the day score of 71 or benchmark context in any meaningful way
- **Combo: Smart Hybrid** (hourly): The phrase 'follow-up slot after the primary Mars window' implies a Mars hora or Mars choghadiya context that is not supported by ground truth data
- **Combo: GPT Thinking Stack** (monthly): Harshana yoga is never mentioned or interpreted; its correct meaning of joy, delight, and auspiciousness for celebrations is entirely absent — the commentary tone directly contradicts this yoga
- **Combo: GPT Thinking Stack** (monthly): No reference to the best action window 11:00–12:00 or Labh choghadiya; choghadiya guidance is completely missing
- **Combo: GPT Thinking Stack** (monthly): Commentary claims 'Jupiter's constructive Cancer entry is still not yet effective in May' — this is a hallucination; the ground truth date is March 10, 2026, and no Jupiter-Cancer entry is referenced in the ground truth
- **Combo: GPT Thinking Stack** (monthly): The Moon is stated to traverse H3, H5, H8, and H9 during the month — Moon in H5 (Scorpio) is confirmed by ground truth, but H3, H8, H9 traversals are speculative assertions not grounded in the provided data
- **Combo: GPT Thinking Stack** (monthly): Rahu described as causing '10th-house reputation swings' implies Rahu is placed or ruling H10; Rahu does not rule any sign and no placement in H10 is given in the ground truth
- **Combo: GPT Thinking Stack** (monthly): Overall tone is excessively cautionary and pessimistic, inconsistent with a day score of 71 (above the ~76.2 benchmark proximity) and an auspicious Harshana yoga
- **Combo: Ultra Budget** (monthly): Harshana yoga (joy, delight, auspicious for celebrations) is entirely absent from the commentary — no yoga interpretation provided at all, scoring 0
- **Combo: Ultra Budget** (monthly): No reference to the best action window 11:00–12:00 or Labh choghadiya anywhere in the commentary
- **Combo: Ultra Budget** (monthly): Saturn described as ruling H7 and H8 for Cancer lagna — correct rulerships are H7 (Capricorn) and H8 (Aquarius), but the commentary attributes this to Saturn without verification; Saturn does rule Capricorn (H7) and Aquarius (H8) which is technically correct, yet framing Saturn as 'mixed ownership' malefic is misleading for Cancer lagna where Saturn rules H7/H8
- **Combo: Ultra Budget** (monthly): Jupiter described as having '6th/9th influence' — for Cancer lagna Jupiter rules H6 (Sagittarius) and H9 (Pisces), making Jupiter a functional mixed planet, but the commentary presents this without acknowledging Jupiter's natural benefic status creates nuance, not straightforward 'lesson/workload' framing
- **Combo: Ultra Budget** (monthly): Moon described as 'commonly moves through the 4th, 5th, and 6th houses' — ground truth places Moon specifically in Scorpio (H5 for Cancer lagna); vague generalization misrepresents the actual chart data
- **Combo: Ultra Budget** (monthly): Commentary references 'May' as the month but the ground truth date is March 10, 2026 — wrong month stated
- **Combo: Ultra Budget** (monthly): Rahu described as stirring 'the 8th house of transformation and hidden obstacles for Cancer lagna' without basis in ground truth; Rahu's house placement is not specified in ground truth and this is an unsupported claim
- **Combo: Ultra Budget** (monthly): Day score of 71 is moderately positive yet the commentary's tone is predominantly cautionary and warning-heavy, inconsistent with a score above 70

### Quality × Accuracy Matrix

Combined = **quality × 0.4 + accuracy × 0.6** (Vedic correctness weighted higher).

| Model | Quality | Accuracy | Combined | Type |
|-------|---------|----------|----------|------|
| **Combo: Smart Hybrid** | 5.4 | 3.5 | **4.26** | Combo |
| **Grok 4.20 Multi-Agent** | 9.0 | 0 | **3.6** | Solo |
| **Claude Sonnet 4.6** | 8.5 | 0 | **3.4** | Solo |
| **GPT-5.4 Reasoning-High** | 8.5 | 0 | **3.4** | Solo |
| **Gemini 2.5 Flash** | 8.5 | 0 | **3.4** | Solo |
| **Gemini 3.1 Pro** | 8.5 | 0 | **3.4** | Solo |
| **Grok 4.20 Reasoning** | 8.5 | 0 | **3.4** | Solo |
| **GPT-5.4 mini** | 8.2 | 0 | **3.28** | Solo |
| **Grok 4** | 8.0 | 0 | **3.2** | Solo |
| **GPT-5.4 nano** | 7.8 | 0 | **3.12** | Solo |
| **DeepSeek V3.2** | 7.2 | 0 | **2.88** | Solo |
| **Claude Haiku 4.5** | 7.0 | 0 | **2.8** | Solo |
| **Grok 4.1 Fast Reasoning** | 7.0 | 0 | **2.8** | Solo |
| **Combo: GPT Thinking Stack** | 1.6 | 3.6 | **2.8** | Combo |
| **Combo: Ultra Budget** | 1.6 | 3.0 | **2.44** | Combo |
| **DeepSeek R1** | 5.2 | 0 | **2.08** | Solo |

### Final Recommendation (auto)

**PRODUCTION RECOMMENDATION:** *Combo: Smart Hybrid* scores **5.4/10** structural quality and **3.5/10** Vedic accuracy at **$0.2561/report** (**~62%** vs Sonnet solo baseline on est. cost).

- **Critical errors (this combo):** Harshana yoga is described as 'disciplines action' and keeps 'mind focused' — correct meaning is joy, delight, happiness, auspicious for celebrations; this is a hallucination of meaning; 'Anuradha nakshatra activates decision gates through Saturn influence' — Anuradha is not mentioned in ground truth and this is an unsupported hallucination; Best action window recommendation directs use of 'Mars hora' and earliest strong display_label, completely ignoring the verified 11:00–12:00 Labh choghadiya best window; Rahu Kaal window cited as 15:26–16:55 — ground truth confirms Rahu Kaal is active but does not specify this time range; the specific window is fabricated; Saturn pressure on H6 (Sagittarius) is asserted without any Saturn placement reference in the ground truth; Jupiter influence on H12 (Gemini) steadying expenditure is asserted without any Jupiter placement reference in the ground truth; Moon-linked timing connecting to H11 outcomes is ungrounded — Moon is in H5 (Scorpio) per ground truth, not H11; Commentary calls the yoga 'Exalted Anuradha Yoga Harshana' conflating nakshatra and yoga into a fabricated combined concept not present in ground truth; H11 gains emphasis is misplaced — Mercury rules H3 and H12 for Cancer lagna, not H11; no ground truth basis for H11 focus; Harshana yoga is never mentioned; the commentary invents 'Jupiter hora' as the governing factor, which is a hallucination not present in ground truth; 6th-house (Sagittarius) and 9th-house (Pisces) themes are introduced with no astrological justification tied to the active planets or dasha lords for this slot; Mercury's rulership of H3 (Virgo) and H12 (Gemini) is not mentioned; dasha logic is vague and technically unsupported; No reference to the best action window of 11:00–12:00 is made in the commentary; Rahu Kaal being active is not acknowledged, which is a significant omission given it is flagged as True in ground truth; Commentary tone implies a moderately strong slot but fails to integrate the day score of 71 or benchmark context in any meaningful way; The phrase 'follow-up slot after the primary Mars window' implies a Mars hora or Mars choghadiya context that is not supported by ground truth data
- **Switch immediately:** **NO**
- **Reason:** Low judge accuracy and/or critical factual errors — do not ship without review.


## Recommendation

Based on this evaluation:

**If quality is paramount:** Choose the model with highest
overall score -- likely Claude Sonnet or GPT-5.4.

**If Vedic correctness matters:** Prefer high **Accuracy /10** and zero **Critical Errors**
even if word-count quality is slightly lower.

**If cost/quality balance matters:** See Part 4 hybrid combos and the Quality × Accuracy matrix.

Score variance (9/22 days within 10%) is
independent of the AI model -- it is a formula problem,
not a model problem. Fix the formula in main.py separately.
