# Deployment Guide

## Supabase
Run the SQL in the Supabase SQL editor (Dashboard → SQL Editor). Use the schema in project root: `supabase-schema.sql` (creates users, birth_charts, reports, transactions, RLS policies, indexes).

## Railway (Ephemeris Service)
1. Connect the GitHub repo to Railway.
2. Set root directory to `ephemeris-service/`.
3. Railway will auto-detect Python. Ensure `railway.json` exists with start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`.
4. Set healthcheck path to `/validate` if supported.
5. Copy the Railway URL and set it as `EPHEMERIS_SERVICE_URL` (and `EPHEMERIS_API_URL`) in Vercel.

## Vercel (Next.js)
1. Connect the GitHub repo to Vercel.
2. Set environment variables from `.env.local` (do not commit `.env.local`).
3. Deploy. Set `NEXT_PUBLIC_URL` to the Vercel URL after first deploy.

## Environment Variables Needed
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ANTHROPIC_API_KEY`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_URL` (Vercel app URL after deploy)
- `EPHEMERIS_SERVICE_URL` (Railway ephemeris URL)
- `EPHEMERIS_API_URL` (same as above)

## Test Mode
If `STRIPE_SECRET_KEY` starts with `your_` or is a test key, the app can skip payment and go straight to report generation for end-to-end testing.
