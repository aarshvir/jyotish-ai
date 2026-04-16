# AGENTS.md

## Cursor Cloud specific instructions

### Architecture

This is a **Next.js 14 App Router** + **TypeScript** Vedic astrology SaaS platform with two services:

| Service | Port | Tech | Purpose |
|---|---|---|---|
| **Next.js app** | 3000 | Node.js / TypeScript | Main web application (frontend + API routes) |
| **Ephemeris microservice** | 8000 | Python / FastAPI | Vedic astrology calculations (Swiss Ephemeris) |

### Commands

Standard dev commands are in `package.json`:
- `npm run dev` — Start Next.js dev server (port 3000)
- `npm run build` — Production build
- `npm run lint` — ESLint
- `npx tsc --noEmit` — TypeScript type-check (not a package.json script)

Ephemeris service (from `/workspace/ephemeris-service/`):
- `uvicorn main:app --reload --host 0.0.0.0 --port 8000` — Start the FastAPI server

### Environment variables

Copy `.env.example` to `.env.local`. The app needs Supabase credentials to enable auth/database and at least one LLM API key (Anthropic preferred) for report generation. Placeholder values are sufficient for build/lint/type-check but not for authenticated flows.

Key env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `ANTHROPIC_API_KEY`, `EPHEMERIS_SERVICE_URL` (defaults to `http://localhost:8000`).

### Gotchas

- The ephemeris Python service requires `python3-dev` system package for building `pyswisseph` from source. The update script handles this.
- `uvicorn` and `fastapi` install to `~/.local/bin` which may not be on PATH by default. The update script adds it.
- Protected routes (`/onboard`, `/dashboard`, `/report/*`) require Supabase authentication. Without valid Supabase credentials, these routes redirect to `/login` and signup will fail.
- `next.config.mjs` emits a warning about `serverExternalPackages` being unrecognized — this is benign and does not affect the build.
- The `NEXT_PUBLIC_SKIP_VALIDATION=true` env var skips birth-data validation, useful during development.
- Payment routes (Stripe/Razorpay) gracefully degrade without real API keys — they return test-mode responses.
