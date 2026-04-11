# Schema Truth Map

## Canonical Sources

| Domain | Source of Truth | Path |
|--------|----------------|------|
| **Database schema** | Supabase migrations | `supabase/migrations/*.sql` |
| **Report JSON contract** | TypeScript types | `src/lib/agents/types.ts` |
| **Score-to-label mapping** | Centralized labels | `src/lib/guidance/labels.ts` |
| **Scoring algorithm** | RatingAgent | `src/lib/agents/RatingAgent.ts` |
| **V2 guidance types** | Guidance module | `src/lib/guidance/types.ts` |
| **Route DTOs** | Shared DTOs | `src/lib/schema/dtos.ts` |
| **Validation rules** | Validation module | `src/lib/validation/reportValidation.ts` |
| **Schema barrel** | Schema module | `src/lib/schema/report.ts` |

## Deprecated / Non-Canonical

| File | Status | Notes |
|------|--------|-------|
| `supabase-schema.sql` | DEPRECATED | Header says so. Do not apply. Use migrations. |
| Local `getScoreLabel` in UI components | Being migrated | Should import from `@/lib/guidance/labels` |
| Local `toLabel` in orchestrator | Wrapped | Now delegates to `getCanonicalScoreLabel` |

## Import Rules

### For new code:

```typescript
// Use the schema barrel for report types
import type { ReportData, HoraSlot, DayForecast } from '@/lib/schema/report';

// Use guidance module for labels and guidance
import { getCanonicalScoreLabel, buildSlotGuidance } from '@/lib/guidance';

// Use DTOs for route boundaries
import type { HourlyDayRequestDTO } from '@/lib/schema/dtos';
```

### For existing code being modified:

Existing imports from `@/lib/agents/types` are still valid and will not break.
The schema barrel re-exports everything from types.ts.

## Route DTO Boundaries

| Route | Request DTO | Response DTO |
|-------|-------------|--------------|
| `/api/commentary/hourly-day` | `HourlyDayRequestDTO` | `HourlyDayResponseDTO` |
| `/api/commentary/daily-overviews` | `DailyOverviewRequestDTO` | `DailyOverviewResponseDTO` |
| `/api/report/pdf` | `PdfReportPayload` | Binary PDF |
| `/api/validation/report` | `ValidationRequestDTO` | `ValidationResponseDTO` |

## Naming Conventions (resolved drift)

| Old (may exist in stored data) | Canonical V2 | Notes |
|-------------------------------|--------------|-------|
| `day_overview` | `overview` | DayForecast uses `overview` |
| `dominant_hora` | `hora_planet` | Orchestrator maps during assembly |
| `dominant_choghadiya` | `choghadiya` | Orchestrator maps during assembly |
| `rating` | `score` | HoraSlot uses `score` |
| `love_score` | `relationships` | DomainScores uses `relationships` |
| `plan_type` | `report_type` | ReportData uses `report_type` |

## Validation Layers

1. **Structural** (`validateReportData`): field presence, array lengths, ISO dates
2. **Semantic** (`validateReportSemantics`): score-label match, RK safety, fallback detection
3. **Day score invariant**: `day_score === Math.round(mean of 18 slot scores)`
