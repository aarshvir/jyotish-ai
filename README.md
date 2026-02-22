# Jyotish AI - Vedic Astrology SaaS Platform

AI-powered Vedic astrology analysis platform providing personalized birth chart analysis and forecasts.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + Shadcn/ui
- **Animation**: Framer Motion
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Payments**: Stripe
- **AI**: Anthropic Claude (Sonnet 4)
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account
- Stripe account
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
- Stripe keys
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
src/
├── app/
│   ├── (marketing)/          # Public landing pages
│   │   ├── page.tsx          # Landing page
│   │   └── layout.tsx
│   ├── (app)/                # Protected app pages
│   │   ├── dashboard/        # User dashboard
│   │   ├── onboarding/       # Birth data entry
│   │   ├── report/[id]/      # Report display
│   │   └── layout.tsx
│   ├── api/
│   │   ├── agents/           # AI agent endpoints
│   │   ├── reports/          # Report generation
│   │   └── webhooks/         # Stripe webhooks
│   ├── layout.tsx            # Root layout
│   └── globals.css
├── components/
│   ├── ui/                   # Shadcn components
│   ├── landing/              # Landing page components
│   ├── report/               # Report components
│   └── shared/               # Shared components
└── lib/
    ├── supabase/             # Supabase clients
    ├── stripe/               # Stripe utilities
    ├── anthropic/            # Anthropic client
    └── utils/                # Helper utilities
```

## Features

- User authentication via Supabase
- Birth chart calculation
- AI-powered nativity analysis
- Daily and hourly forecasts
- Pay-per-report and subscription options
- Secure payment processing with Stripe
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
- stripe_session_id (text)
- amount (integer)
- currency (text)
- status (text)
- created_at (timestamp)

### subscriptions
- id (uuid, primary key)
- user_id (uuid)
- stripe_subscription_id (text)
- stripe_customer_id (text)
- status (text)
- current_period_start (timestamp)
- current_period_end (timestamp)
- created_at (timestamp)

## License

MIT
