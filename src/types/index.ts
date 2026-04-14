export interface User {
  id: string;
  name?: string;
  email: string;
  plan: string;
  stripe_customer_id?: string;
  reports_used_this_month: number;
  created_at: string;
}

export interface BirthChart {
  id: string;
  user_id: string;
  name: string;
  birth_date: string;
  birth_time: string;
  birth_city: string;
  birth_lat?: number;
  birth_lng?: number;
  current_city?: string;
  current_lat?: number;
  current_lng?: number;
  lagna?: string;
  moon_sign?: string;
  moon_nakshatra?: string;
  dasha_sequence?: Record<string, unknown>;
  nativity_profile?: Record<string, unknown>;
  created_at: string;
}

export interface Report {
  id: string;
  user_id: string;
  user_email?: string;
  native_name?: string;
  birth_date?: string;
  birth_time?: string;
  birth_city?: string;
  birth_lat?: number | null;
  birth_lng?: number | null;
  current_city?: string | null;
  current_lat?: number | null;
  current_lng?: number | null;
  timezone_offset?: number | null;
  plan_type: string;
  status: string;
  payment_status?: string;
  report_data?: Record<string, unknown> | null;
  day_scores?: Record<string, number> | null;
  lagna_sign?: string | null;
  moon_sign?: string | null;
  moon_nakshatra?: string | null;
  dasha_mahadasha?: string | null;
  dasha_antardasha?: string | null;
  report_start_date?: string | null;
  report_end_date?: string | null;
  generation_started_at?: string | null;
  generation_completed_at?: string | null;
  generation_step?: string | null;
  generation_progress?: number | null;
  created_at: string;
  updated_at?: string;
}

export interface Transaction {
  id: string;
  user_id?: string;
  amount: number;
  currency: string;
  stripe_payment_id?: string;
  report_id?: string;
  status: string;
  created_at: string;
}

export interface Database {
  public: {
    Tables: {
      users: {
        Row: User;
        Insert: Omit<User, 'id' | 'created_at' | 'reports_used_this_month'>;
        Update: Partial<Omit<User, 'id' | 'created_at'>>;
      };
      birth_charts: {
        Row: BirthChart;
        Insert: Omit<BirthChart, 'id' | 'created_at'>;
        Update: Partial<Omit<BirthChart, 'id' | 'created_at'>>;
      };
      reports: {
        Row: Report;
        Insert: Omit<Report, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Report, 'id' | 'created_at'>>;
      };
      transactions: {
        Row: Transaction;
        Insert: Omit<Transaction, 'id' | 'created_at'>;
        Update: Partial<Omit<Transaction, 'id' | 'created_at'>>;
      };
    };
  };
}
