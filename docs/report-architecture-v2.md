# Report Architecture V2

## Overview

The V2 report architecture transforms VedicHour from an astrology-recital product into a **decision-support engine**. The deterministic scoring layer is preserved unchanged; the explanation layer is restructured so every hourly window and daily briefing answers:

1. **What are my best windows?**
2. **Best for what?**
3. **What should I avoid?**
4. **Why?**
5. **What is still safe during weak windows?**
6. **What should I do if I cannot avoid a weak window?**

## Architecture Layers

```
┌─────────────────────────────────────────────────┐
│  Ephemeris Service (Python)                      │
│  → Natal chart, panchang, hora, choghadiya, RK   │
└──────────────────┬──────────────────────────────┘
                   ▼
┌─────────────────────────────────────────────────┐
│  RatingAgent (deterministic scoring)             │
│  → slot scores, day scores, labels               │
│  → UNCHANGED in V2                               │
└──────────────────┬──────────────────────────────┘
                   ▼
┌─────────────────────────────────────────────────┐
│  Guidance Builder (NEW — deterministic)           │
│  → category scores, best_for, avoid_for          │
│  → reason tags, still_ok_for, if_unavoidable     │
│  → summary_plain, day briefing                   │
└──────────────────┬──────────────────────────────┘
                   ▼
┌─────────────────────────────────────────────────┐
│  Commentary Routes (LLM + fallback)              │
│  → LLM verbalizes structured guidance            │
│  → Fallback uses guidance summary_plain           │
│  → Never sounds like a grandmaster recital       │
└──────────────────┬──────────────────────────────┘
                   ▼
┌─────────────────────────────────────────────────┐
│  Validation (structural + semantic)              │
│  → 18 slots, day_score = mean, labels match      │
│  → RK never recommends initiation               │
│  → Weak slots never sound excellent              │
│  → Fallback repetition detection                 │
└──────────────────┬──────────────────────────────┘
                   ▼
┌─────────────────────────────────────────────────┐
│  Report Assembly + DB Storage                    │
│  → ReportData (canonical) + guidance_v2 fields   │
│  → Backward compatible: old reports still render │
└──────────────────┬──────────────────────────────┘
                   ▼
┌─────────────────────────────┐  ┌─────────────────┐
│  Web UI (report/[id])       │  │  PDF Adapter      │
│  → Day briefing first       │  │  → Curated output │
│  → Guidance chips           │  │  → From canonical │
│  → Commentary secondary     │  │  → Not parallel   │
└─────────────────────────────┘  └─────────────────┘
```

## Key Types

### SlotGuidanceV2

Attached optionally to each HoraSlot (backward compatible):

- `score`, `label` (GuidanceLabel: excellent/strong/mixed/caution/delay_if_possible)
- `reason_tags[]` — why this score (hora, choghadiya, house, RK)
- `category_scores` — per-category: deep_work, communication, money, relationships, travel, creative, spiritual, admin
- `best_for[]`, `avoid_for[]`, `still_ok_for[]`
- `if_unavoidable` — what to do when this window can't be avoided
- `summary_plain` — one-paragraph decision summary

### DayBriefingV2

Attached optionally to each DayForecast:

- `theme`, `top_windows[]`, `caution_windows[]`
- `best_overall_for[]`, `not_ideal_for[]`
- `why_today` — one-line day summary

## Canonical Sources

| Domain | File | Role |
|--------|------|------|
| Types | `src/lib/agents/types.ts` | Persisted report contract |
| Schema barrel | `src/lib/schema/report.ts` | Single import point |
| Labels | `src/lib/guidance/labels.ts` | Score-to-label mapping |
| Guidance | `src/lib/guidance/builder.ts` | Deterministic guidance |
| Validation | `src/lib/validation/reportValidation.ts` | Structural + semantic |
| DB truth | `supabase/migrations/*.sql` | Schema of record |
| Scoring | `src/lib/agents/RatingAgent.ts` | Slot/day scoring |

## Feature Flag

Set `REPORT_OUTPUT_V2=false` in environment to disable V2 guidance fields.
Default: enabled (true).

## Backward Compatibility

- V2 guidance fields are **optional** on the persisted JSON
- UI renders old reports normally when `guidance_v2` / `briefing_v2` are absent
- Validation accepts reports with or without V2 fields
- No DB migration required (report_data is JSONB)
