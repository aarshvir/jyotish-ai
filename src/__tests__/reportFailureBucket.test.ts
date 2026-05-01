import { describe, expect, it } from 'vitest';
import {
  inferReportFailureBucket,
  inferReportFailureBucketFromCode,
} from '@/lib/reports/reportErrors';

describe('inferReportFailureBucketFromCode', () => {
  it('maps AUTH_ERROR to internal_job_auth', () => {
    expect(inferReportFailureBucketFromCode('AUTH_ERROR')).toBe('internal_job_auth');
  });
  it('maps EPHEMERIS_DOWN', () => {
    expect(inferReportFailureBucketFromCode('EPHEMERIS_DOWN')).toBe('ephemeris');
  });
  it('returns null for unmapped codes', () => {
    expect(inferReportFailureBucketFromCode('UNKNOWN')).toBeNull();
  });
});

describe('inferReportFailureBucket', () => {
  it('prefers code mapping when present', () => {
    expect(inferReportFailureBucket('random noise', undefined, 'AUTH_ERROR')).toBe('internal_job_auth');
  });
  it('classifies 206 / partial LLM', () => {
    expect(inferReportFailureBucket('upstream returned 206 partial: true')).toBe('llm_commentary');
  });
  it('classifies fetch failures', () => {
    expect(inferReportFailureBucket('TypeError: fetch failed')).toBe('internal_fetch_base');
  });
});
