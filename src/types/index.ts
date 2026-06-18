/**
 * Canonical database row types for the Jyotish AI platform.
 *
 * These mirror the live Supabase schema (see supabase/canonical-schema.sql and migrations).
 * For report content types (ReportData, HoraSlot, etc.) use src/lib/agents/types.ts.
 */

// ── reports ──────────────────────────────────────────────────────────────────

export type ReportStatus = 'pending' | 'generating' | 'complete' | 'error';
export type PlanType = 'free' | 'preview' | '7day' | 'monthly' | 'annual';
export type PaymentStatus = 'unpaid' | 'free' | 'paid' | 'promo' | 'bypass';

export interface Report {
  id: string;
  user_id: string | null;
  user_email: string | null;
  native_name: string | null;
  birth_date: string | null;
  birth_time: string | null;
  birth_city: string | null;
  birth_lat: number | null;
  birth_lng: number | null;
  current_city: string | null;
  current_lat: number | null;
  current_lng: number | null;
  timezone_offset: number | null;
  plan_type: PlanType | null;
  status: ReportStatus;
  payment_status: PaymentStatus | null;
  payment_provider: string | null;
  report_data: Record<string, unknown> | null;
  lagna_sign: string | null;
  moon_sign: string | null;
  moon_nakshatra: string | null;
  dasha_mahadasha: string | null;
  dasha_antardasha: string | null;
  day_scores: Record<string, number> | null;
  report_start_date: string | null;
  report_end_date: string | null;
  generation_progress: number | null;
  generation_step: string | null;
  generation_started_at: string | null;
  generation_completed_at: string | null;
  generation_time_seconds: number | null;
  generation_trace_id: string | null;
  generation_error: string | null;
  generation_error_code: string | null;
  generation_error_at_phase: string | null;
  pipeline_checkpoint: string | null;
  pipeline_state: Record<string, unknown> | null;
  generation_log: unknown[] | null;
  personal_context: string | null;
  phone: string | null;
  notify_sent_at: string | null;
  created_at: string;
  updated_at: string | null;
}

// ── ziina_payments ────────────────────────────────────────────────────────────

export interface ZiinaPayment {
  id: string;
  user_id: string | null;
  report_id: string | null;
  ziina_intent_id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  plan_type: PlanType | null;
  payment_provider: string | null;
  created_at: string;
  updated_at: string | null;
}

// ── promo_codes ───────────────────────────────────────────────────────────────

export interface PromoCode {
  id: string;
  code: string;
  discount_pct: number;
  max_uses: number | null;
  uses_count: number;
  once_per_user: boolean;
  active: boolean;
  expires_at: string | null;
  created_at: string;
}

// ── referrals ─────────────────────────────────────────────────────────────────

export interface Referral {
  id: string;
  referrer_user_id: string;
  referred_user_id: string;
  referral_code: string;
  status: string;
  created_at: string;
}

// ── admin_users ───────────────────────────────────────────────────────────────

export interface AdminUser {
  id: string;
  user_id: string;
  email: string;
  created_at: string;
}

// ── feedback ──────────────────────────────────────────────────────────────────

export interface Feedback {
  id: string;
  user_id: string | null;
  report_id: string | null;
  rating: number | null;
  message: string | null;
  created_at: string;
}

// ── newsletter_subscribers ────────────────────────────────────────────────────

export interface NewsletterSubscriber {
  id: string;
  email: string;
  subscribed_at: string;
}

// ── analytics_events ─────────────────────────────────────────────────────────

export interface AnalyticsEvent {
  id: string;
  user_id: string | null;
  event_name: string;
  properties: Record<string, unknown> | null;
  created_at: string;
}

// ── first_touch_attribution ───────────────────────────────────────────────────

export interface FirstTouchAttribution {
  id: string;
  user_id: string;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  referrer: string | null;
  landing_page: string | null;
  created_at: string;
}

// ── Database helper type ──────────────────────────────────────────────────────

export interface Database {
  public: {
    Tables: {
      reports: {
        Row: Report;
        Insert: Omit<Report, 'created_at' | 'updated_at'> & { created_at?: string; updated_at?: string };
        Update: Partial<Omit<Report, 'id' | 'created_at'>>;
      };
      ziina_payments: {
        Row: ZiinaPayment;
        Insert: Omit<ZiinaPayment, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<ZiinaPayment, 'id' | 'created_at'>>;
      };
      promo_codes: {
        Row: PromoCode;
        Insert: Omit<PromoCode, 'id' | 'created_at' | 'uses_count'>;
        Update: Partial<Omit<PromoCode, 'id' | 'created_at'>>;
      };
      referrals: {
        Row: Referral;
        Insert: Omit<Referral, 'id' | 'created_at'>;
        Update: Partial<Omit<Referral, 'id' | 'created_at'>>;
      };
      admin_users: {
        Row: AdminUser;
        Insert: Omit<AdminUser, 'id' | 'created_at'>;
        Update: Partial<Omit<AdminUser, 'id' | 'created_at'>>;
      };
      feedback: {
        Row: Feedback;
        Insert: Omit<Feedback, 'id' | 'created_at'>;
        Update: Partial<Omit<Feedback, 'id' | 'created_at'>>;
      };
      newsletter_subscribers: {
        Row: NewsletterSubscriber;
        Insert: Omit<NewsletterSubscriber, 'id' | 'subscribed_at'>;
        Update: Partial<Omit<NewsletterSubscriber, 'id' | 'subscribed_at'>>;
      };
      analytics_events: {
        Row: AnalyticsEvent;
        Insert: Omit<AnalyticsEvent, 'id' | 'created_at'>;
        Update: Partial<Omit<AnalyticsEvent, 'id' | 'created_at'>>;
      };
      first_touch_attribution: {
        Row: FirstTouchAttribution;
        Insert: Omit<FirstTouchAttribution, 'id' | 'created_at'>;
        Update: Partial<Omit<FirstTouchAttribution, 'id' | 'created_at'>>;
      };
    };
  };
}
