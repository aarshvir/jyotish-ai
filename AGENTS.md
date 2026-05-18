# AGENTS.md

## Cursor Cloud specific instructions

### Project overview
Jyotish AI (VedicHour) is a Vedic astrology SaaS platform with two services:
- **Next.js app** (port 3000): Frontend + API routes. Uses Supabase for auth/DB, Stripe/Razorpay for payments, Anthropic Claude (with OpenAI/Gemini/Grok/DeepSeek fallbacks) for AI analysis.
- **Ephemeris microservice** (port 8000): Python FastAPI service using Swiss Ephemeris (`pyswisseph`) for astronomical calculations. Located in `ephemeris-service/`.

### Running services

**Ephemeris service** (must start first for report generation):
```bash
cd ephemeris-service && uvicorn main:app --host 0.0.0.0 --port 8000
```

**Next.js dev server:**
```bash
npm run dev
```

### Lint / Build / Test
- `npm run lint` — ESLint (expect 4 `@typescript-eslint/no-explicit-any` warnings, no errors)
- `npm run build` — Production build; warns about `serverExternalPackages` in `next.config.mjs` (safe to ignore with Next.js 14.2.x)
- `npm run test:e2e` — E2E test script (`scripts/test-report-e2e.mjs`); requires a running Supabase instance and API keys

### Environment variables
Copy `.env.example` to `.env.local`. The app starts with placeholder values but full functionality requires real Supabase and Anthropic API keys. See `SETUP.md` for details.

`EPHEMERIS_SERVICE_URL` defaults to `http://localhost:8000` — no change needed for local dev.

### Gotchas
- `python3-dev` must be installed (system package) for `pyswisseph` to compile. The update script handles this.
- `uvicorn` installs to `~/.local/bin` — ensure it's on `PATH` (e.g. `export PATH="$HOME/.local/bin:$PATH"`).
- The Next.js build warns about `serverExternalPackages` being unrecognized — this is a Next.js 14.2 config key that logs a warning but works correctly at runtime.
- The `/onboard` route requires Supabase auth — it redirects to `/login` without valid Supabase credentials.
