# Getting Started with Jyotish AI

## ✅ Current Status

Your Jyotish AI platform is **fully initialized** and running!

- **Location**: `C:\Users\aarsh\Downloads\jyotish-ai`
- **Dev Server**: http://localhost:3000 ✅ Running
- **Build Status**: ✅ Passing

## 🚀 What You Have

### Pages Ready to View

1. **Landing Page** → http://localhost:3000
   - Hero section with call-to-action
   - How It Works (3-step process)
   - Pricing section (3 tiers)

2. **Onboarding** → http://localhost:3000/onboarding
   - Birth data entry form
   - Validation with Zod
   - Integration with report generation API

3. **Dashboard** → http://localhost:3000/dashboard
   - User reports list
   - Create new report button
   - Empty state handling

4. **Report View** → http://localhost:3000/report/[id]
   - Daily forecast tabs
   - Hourly muhurta table
   - Nativity analysis section

### API Routes Working

- `/api/agents/validate` - Birth data validation
- `/api/agents/ephemeris` - Planetary position calculations
- `/api/agents/nativity` - Birth chart analysis
- `/api/agents/forecast` - Predictions and forecasts
- `/api/reports/generate` - Orchestrates full report creation
- `/api/webhooks/stripe` - Payment webhook handler

## ⚙️ Required Configuration

Before the app is fully functional, configure these services:

### 1. Supabase Setup (30 minutes)

**Create Project**:
1. Go to https://app.supabase.com
2. Create a new project
3. Wait for database to provision

**Run Schema**:
1. Go to SQL Editor in Supabase dashboard
2. Paste contents of `supabase-schema.sql`
3. Click Run

**Get Credentials**:
1. Go to Project Settings → API
2. Copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - Anon/Public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**Update `.env.local`**:
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
```

### 2. Anthropic API (5 minutes)

1. Go to https://console.anthropic.com
2. Create API key
3. Add to `.env.local`:
```env
ANTHROPIC_API_KEY=sk-ant-api03-...
```

### 3. Stripe Setup (Optional - for payments)

**Test Mode**:
1. Go to https://dashboard.stripe.com
2. Get test keys from Developers → API keys
3. Add to `.env.local`:
```env
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
```

**Webhook Testing**:
```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Copy the webhook secret to `.env.local`:
```env
STRIPE_WEBHOOK_SECRET=whsec_...
```

## 🎨 Customization Points

### 1. Landing Page Content
Edit `src/components/landing/`:
- `Hero.tsx` - Main headline and CTA
- `HowItWorks.tsx` - Process explanation
- `Pricing.tsx` - Pricing tiers and features

### 2. AI Prompts
Customize prompts in `src/app/api/agents/`:
- `ephemeris/route.ts` - Calculation instructions
- `nativity/route.ts` - Birth chart analysis style
- `forecast/route.ts` - Prediction format

### 3. Astrology Logic
Enhance calculations in:
- `src/lib/utils/astrology.ts` - Add dasha calculations, yogas, etc.

### 4. UI Theme
The project uses Shadcn/ui with Neutral base color.
- Modify `components.json` to change theme
- Update Tailwind colors in `tailwind.config.ts`

## 🧪 Testing the App

### Without API Keys (Limited)

You can still view:
- Landing page design
- Component layouts
- Form validation
- Navigation flow

### With Supabase Only

- User authentication
- Dashboard (empty state)
- Database operations

### With All Services

- Full report generation
- Payment processing
- Complete user flow

## 📋 Development Workflow

### Start Development
```bash
npm run dev
```

### Build for Production
```bash
npm run build
npm start
```

### Deploy to Vercel
```bash
npx vercel
```

## 🔍 Code Tour

### How Report Generation Works

1. User submits form in `/onboarding`
2. POST to `/api/reports/generate`
3. Validates data via `/api/agents/validate`
4. Calculates ephemeris via `/api/agents/ephemeris`
5. Runs nativity and forecast agents in parallel
6. Saves complete report to Supabase
7. Redirects to `/report/[id]`

### Authentication Flow

- `middleware.ts` checks session on every request
- Protected `(app)` routes redirect to login if unauthenticated
- `(marketing)` routes are public

### Payment Integration

- Single purchase: `createCheckoutSession()` in `lib/stripe/server.ts`
- Subscriptions: `createSubscription()` in `lib/stripe/server.ts`
- Webhooks update database when payments complete

## 🐛 Common Issues

### "Module not found" errors
→ Run `npm install` to ensure all dependencies are installed

### Supabase auth errors
→ Check `.env.local` has correct credentials
→ Verify tables exist in Supabase dashboard

### Build fails
→ Check all env vars are set (even dummy values work for build)
→ Run `npm run lint` to check for syntax errors

### Stripe webhook not working
→ Use Stripe CLI: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
→ Copy webhook secret to `.env.local`

## 📚 Learning Resources

- **Vedic Astrology**: Research classical texts (Brihat Parashara Hora Shastra)
- **Next.js 14**: App Router patterns, Server Components
- **Supabase**: Row Level Security, Auth patterns
- **Claude API**: Prompt engineering for astrology domain

## 🎯 Recommended Next Steps

1. **Immediate** (Do now):
   - Configure Supabase and add credentials
   - Add Anthropic API key
   - Test the onboarding flow

2. **Soon** (This week):
   - Enhance astrology calculations
   - Add login/signup pages
   - Refine AI prompts for better analysis
   - Create Stripe products

3. **Later**:
   - Add PDF export functionality
   - Implement email notifications
   - Create admin panel
   - Add more astrology features (dashas, transits, etc.)

---

**You're all set!** Start by configuring your environment variables, then visit http://localhost:3000 to see your app. 🎉
