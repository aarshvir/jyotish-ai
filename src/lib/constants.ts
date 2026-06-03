export const PLANS = {
  FREE: 'free',
  MONTHLY: 'monthly',
  YEARLY: 'yearly',
} as const;

export const REPORT_TYPES = {
  FULL_ANALYSIS: 'Full Vedic Analysis',
  DAILY_FORECAST: 'Daily Forecast',
  YEARLY_FORECAST: 'Yearly Forecast',
  COMPATIBILITY: 'Compatibility Report',
  CAREER: 'Career Analysis',
  MARRIAGE: 'Marriage Timing',
} as const;

export const REPORT_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const;
