/**
 * Every time limit around the nativity call, in one place, so they cannot drift apart again.
 *
 * Measured 2026-09-12 on a real natal chart through the production NativityAgent:
 *   claude-sonnet-4-6  114.3 s,  5,102 output tokens — complete profile
 *   claude-opus-5      116.2 s,  8,000 output tokens — HIT max_tokens mid-JSON, parse failed, stub shipped
 *   claude-opus-5      163.0 s, 11,164 output tokens — complete profile once max_tokens was 16,000
 * The old limits (8,000 tokens, 110 s SDK, 150 s route) were sized for Sonnet. Opus 5 writes ~2.2x
 * more, so it was truncated and timed out — and with every fallback rung dead, paid reports failed.
 *
 * Each inner limit must fit inside the next outer one (locked by nativityBudget.test.ts):
 *   SDK timeout  <  route budget  <  orchestrator fetch  <  Inngest per-step budget
 */

/** Production per-step pipeline budget inside an Inngest step (orchestrator.ts). */
export const INNGEST_STEP_BUDGET_MS = 290_000;

/** Anthropic SDK hard stop for one nativity attempt: the 163 s measurement plus ~47% headroom. */
export const NATIVITY_SDK_TIMEOUT_MS = 240_000;

/** /api/agents/nativity wall-clock budget. Route maxDuration is 300 s. */
export const NATIVITY_ROUTE_BUDGET_MS = 255_000;

/** Orchestrator fetch timeout for the nativity route. Below the 298 s hard kill. */
export const NATIVITY_FETCH_TIMEOUT_MS = 270_000;

/** One attempt: a second 270 s attempt cannot fit inside a 290 s step. */
export const NATIVITY_FETCH_ATTEMPTS = 1;

/** Opus 5 wrote 11,164 tokens for one real chart; 8,000 truncated it mid-JSON. */
export const NATIVITY_MAX_TOKENS = 16_000;
