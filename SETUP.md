# Jyotish AI - Setup Guide

## Quick Start

### 1. Install Dependencies (Already Done ✓)

All dependencies have been installed. If you need to reinstall:

```bash
npm install
```

### 2. Configure Environment Variables

Edit `.env.local` with your actual API keys:

```env
# Supabase - Get from https://app.supabase.com
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Stripe - Get from https://dashboard.stripe.com
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Anthropic - Get from https://console.anthropic.com
ANTHROPIC_API_KEY=sk-ant-...

# App URL
NEXT_PUBLIC_URL=http://localhost:3000
```

### 3. Set Up Supabase Database

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Run the SQL script in `supabase-schema.sql` to create tables

This will create:
- `reports` table (stores user birth charts and analyses)
- `payments` table (tracks Stripe payments)
- `subscriptions` table (manages recurring subscriptions)

Plus all necessary Row Level Security (RLS) policies.

### 4. Configure Stripe Webhooks

1. Install Stripe CLI: `stripe login`
2. Forward webhooks to local: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
3. Copy the webhook secret to `.env.local` as `STRIPE_WEBHOOK_SECRET`

For production, configure webhooks in Stripe Dashboard to point to:
`https://yourdomain.com/api/webhooks/stripe`

### 5. Run Development Server

```bash
npm run dev
```

Visit http://localhost:3000 to see your app!

## Project Architecture

### Route Groups

- **(marketing)**: Public pages (landing, pricing)
- **(app)**: Protected pages requiring authentication (dashboard, reports)

### AI Agents

The platform uses a multi-agent architecture:

1. **Validate Agent** (`/api/agents/validate`) - Validates birth data
2. **Ephemeris Agent** (`/api/agents/ephemeris`) - Calculates planetary positions
3. **Nativity Agent** (`/api/agents/nativity`) - Analyzes birth chart
4. **Forecast Agent** (`/api/agents/forecast`) - Generates predictions

### Report Generation Pipeline

1. User enters birth data in `/onboarding`
2. Data validated via Validate Agent
3. Ephemeris calculated
4. Nativity and Forecast analyses run in parallel
5. Report saved to database
6. User redirected to `/report/[id]`

## Key Features to Implement

### Authentication
- Supabase Auth is integrated in middleware
- Protected routes automatically redirect unauthenticated users
- Add login/signup UI as needed

### Payments
- Pay-per-report: Single purchase flow
- Subscriptions: Monthly/yearly recurring
- Webhook handler processes payment events

### Report Display
- `DayTabs`: Shows daily forecasts for the week
- `HourlyTable`: Displays muhurta timings (auspicious hours)
- `RatingBadge`: Color-coded rating system (1-10)
- `LoadingPipeline`: Shows real-time generation progress

## Next Steps

1. **Configure API Keys**: Add real credentials to `.env.local`
2. **Set Up Database**: Run the Supabase schema
3. **Test Authentication**: Add login/signup pages
4. **Configure Stripe Products**: Create products in Stripe Dashboard
5. **Customize AI Prompts**: Refine the prompts in agent routes
6. **Deploy**: Push to Vercel

## Development Commands

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run start        # Run production build
npm run lint         # Run ESLint
```

## Troubleshooting

### Build Errors
- Ensure all environment variables are set (even dummy values for build)
- Check Node.js version (18+ required)

### Supabase Errors
- Verify URLs and keys are correct
- Check RLS policies in Supabase dashboard

### Stripe Errors
- Test with Stripe test mode keys first
- Ensure webhook secret matches Stripe CLI output

## Production Deployment

### Vercel

1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy!

### Environment Variables for Production

Make sure to set all variables from `.env.example` in your Vercel project settings with production values.
