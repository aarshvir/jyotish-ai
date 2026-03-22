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
  birth_chart_id?: string;
  report_type: string;
  date_from?: string;
  date_to?: string;
  status: string;
  output_json?: Record<string, unknown>;
  file_url?: string;
  agent_log?: Record<string, unknown>;
  created_at: string;
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
        Insert: Omit<Report, 'id' | 'created_at'>;
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
