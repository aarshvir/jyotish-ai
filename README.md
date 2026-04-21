# Jyotish AI - Vedic Astrology SaaS Platform

AI-powered Vedic astrology analysis platform providing personalized birth chart analysis and forecasts.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + Shadcn/ui
- **Animation**: Framer Motion
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Payments**: Ziina
- **AI**: Anthropic Claude (Sonnet 4)
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account
- Ziina account
- Anthropic API key

### Installation

1. Clone the repository and install dependencies:

```bash
npm install
```

2. Set up environment variables:

```bash
cp .env.example .env.local
```

Fill in your API keys in `.env.local`:
- Supabase URL and Anon Key
- Ziina API key
- Anthropic API key

3. Set up Supabase database:

Run the SQL schema in your Supabase project to create the required tables:
- `reports`
- `payments`
- `subscriptions`

4. Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## Project Structure

```
data/scriptures/     # Optional markdown corpus (see data/scriptures/README.md)
src/
├── app/
│   ├── (marketing)/   # Public landing pages
│   ├── (app)/         # Authenticated app (dashboard, report, onboarding)
│   └── api/
│       ├── agents/    # AI + ephemeris helpers
│       ├── reports/   # Report generation; ingress POST /api/reports/start
│       ├── ziina/     # create-intent, verify redirect, upgrade; optional webhook (Business)
│       ├── inngest/   # Inngest executor (report DAG + scripture embed cron)
│       └── cron/      # Secured cron-style routes (e.g. refresh-embeddings)
├── components/
└── lib/
    ├── supabase/
    ├── ziina/         # Ziina API client, optional webhook verify, shared payment finalization
    └── …
```

## Features

- User authentication via Supabase
- Birth chart calculation
- AI-powered nativity analysis
- Daily and hourly forecasts
- Pay-per-report and subscription options
- Secure payment processing with Ziina
- Responsive, modern UI

## Development

```bash
npm run dev      # Start dev server
npm run build    # Build for production
npm run lint     # Run ESLint
```

## Deployment

Deploy to Vercel with one click or via CLI:

```bash
vercel
```

Make sure to add all environment variables in your Vercel project settings.

## Database Schema

Required Supabase tables:

### reports
- id (uuid, primary key)
- user_id (uuid, foreign key to auth.users)
- name (text)
- birth_date (date)
- birth_time (time)
- latitude (decimal)
- longitude (decimal)
- timezone (text)
- chart_data (jsonb)
- nativity_analysis (text)
- forecast_analysis (text)
- created_at (timestamp)

### payments
- id (uuid, primary key)
- user_id (uuid)
- ziina_intent_id (text)
- amount (integer)
- currency (text)
- status (text)
- created_at (timestamp)

### subscriptions
- id (uuid, primary key)
- user_id (uuid)
- ziina_subscription_id (text)
- status (text)
- current_period_start (timestamp)
- current_period_end (timestamp)
- created_at (timestamp)

## License

MIT
