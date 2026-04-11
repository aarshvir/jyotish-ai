# Commentary & Guidance Rules

## Philosophy

VedicHour answers: **"What should I do in this hour?"** — not: "What does astrology say about this hour?"

Every slot is task-aware. A strong window tells the user what it's good for, what it's not ideal for, and why. A weak window tells the user what to avoid, what's still safe, and what to do if it can't be avoided.

## Guidance Derivation (Deterministic)

The guidance builder (`src/lib/guidance/builder.ts`) derives structured recommendations from:

1. **Final slot score** (from RatingAgent)
2. **Hora planet** → category affinities (e.g., Mercury → communication, money, admin)
3. **Choghadiya** → boost/penalty (e.g., Amrit boosts all categories; Kaal penalizes)
4. **Transit lagna house** → category affinities (e.g., H2 → money, H10 → career)
5. **Rahu Kaal** → hard override: avoid all initiation
6. **Panchang** → day-level context (nakshatra, yoga, tithi, day ruler)

No LLM is involved in guidance derivation. The LLM's role is to **verbalize** the structured guidance, not invent it.

## Fallback Rules

When the LLM fails or returns insufficient content, fallbacks use `summary_plain` from the guidance builder.

### Hard Rules

| Condition | Rule |
|-----------|------|
| Rahu Kaal | Never recommend starting, signing, committing, or initiating |
| Score < 35 | Never sound excellent or recommend bold action |
| Score < 50 | Always include safe-use suggestions |
| All slots | Must include at least one actionable suggestion |
| All slots | No ALL CAPS directives |
| All slots | No "EXECUTE THE ONE MOST IMPORTANT TASK" |
| All slots | No contradictory recommendations |

### Fallback Style Examples

**Weak slot:**
> "15:00–16:00 is weak for financial decisions. Better for review, cleanup, admin, or quiet preparation. Delay commitments if possible."

**Strong slot:**
> "15:00–16:00 is one of the stronger windows for communication and decisive work. Mercury hora with Labh choghadiya supports proposals, follow-up, or structured action."

**Rahu Kaal slot:**
> "15:00–16:00 falls in Rahu Kaal. Complete existing work only. Do not start new projects, sign documents, or make financial commitments."

## LLM Commentary Contract

When the LLM is used, the prompt should:

1. Provide the structured guidance as context
2. Ask the LLM to verbalize it naturally
3. Require mention of best_for and avoid_for
4. Not require every sentence to name a planet (relaxed from V1)
5. Not require ALL CAPS directives
6. Not force exactly 60-90 words

## Semantic Validation

The validation layer (`reportValidation.ts`) checks:

- Score-label mismatch
- Rahu Kaal slots recommending initiation without negation
- Low-score slots using strong action language
- Day score not matching mean of 18 slots
- Excessive fallback repetition (>50% identical commentaries)

## Day Briefing Rules

Each day must answer:
- **Top windows** — the 3 best scoring non-RK slots
- **Caution windows** — RK + score < 45
- **Best overall for** — aggregated from top slot category scores
- **Not ideal for** — lowest category aggregation
- **Why today** — one-line with score, top windows, and category advice

## Category System

| Category | Maps to |
|----------|---------|
| deep_work | Focused execution, project work, deadlines |
| communication | Messages, meetings, proposals, follow-up |
| money | Financial decisions, salary, investments |
| relationships | Personal connections, emotional conversations |
| travel | Journeys, relocation, commuting |
| creative | Design, writing, art, innovation |
| spiritual | Meditation, contemplation, study |
| admin | Paperwork, cleanup, routine, organizing |
