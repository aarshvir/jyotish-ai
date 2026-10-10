import { describe, expect, it } from 'vitest';
import {
  isClientEventName,
  isSafeCode,
  sanitizeAttribution,
  sanitizeEventProps,
  scrubFreeText,
  slugFromPath,
} from './events';

describe('canonical event schema', () => {
  it('accepts spec §8 names and drop-off events, rejects others', () => {
    for (const n of ['quiz_view', 'quiz_answer', 'checkout_start', 'purchase', 'refund', 'dropoff_reason']) {
      expect(isClientEventName(n)).toBe(true);
    }
    expect(isClientEventName('cron_run')).toBe(false); // server-only
    expect(isClientEventName('page_view')).toBe(false);
    expect(isClientEventName(42)).toBe(false);
  });

  it('keeps only allow-listed props', () => {
    const out = sanitizeEventProps('quiz_view', { step: 'concern', step_index: 2, email: 'a@b.com', name: 'Asha' });
    expect(out).toEqual({ step: 'concern', step_index: 2 });
  });

  it('drops quiz answers that are not option codes (dates, names, places, emails)', () => {
    expect(sanitizeEventProps('quiz_answer', { step: 'birth_date', value: '1990-05-12' })).toEqual({ step: 'birth_date' });
    expect(sanitizeEventProps('quiz_answer', { step: 'first_name', value: 'Asha Rao' })).toEqual({ step: 'first_name' });
    expect(sanitizeEventProps('quiz_answer', { step: 'x', value: 'me@mail.com' })).toEqual({ step: 'x' });
    expect(sanitizeEventProps('quiz_answer', { step: 'concern', value: 'career' })).toEqual({ step: 'concern', value: 'career' });
    expect(sanitizeEventProps('quiz_answer', { step: 'frustration', value: ['vague', 'too_long', 'Not A Code!'] })).toEqual({
      step: 'frustration',
      value: 'vague,too_long',
    });
  });

  it('normalises drop-off reasons and scrubs contact details from free text', () => {
    const out = sanitizeEventProps('dropoff_reason', {
      context: 'paywall_back',
      reason: 'bogus',
      text: 'mail me at x@y.com or +91 98765 43210',
    });
    expect(out.reason).toBe('other');
    expect(out.context).toBe('paywall_back');
    expect(out.text).toBe('mail me at [email] or [number]');
    expect(sanitizeEventProps('dropoff_reason', { context: 'nope', reason: 'price' })).toEqual({ reason: 'price' });
  });

  it('money and ints are validated', () => {
    expect(sanitizeEventProps('purchase', { value: '199', currency: 'INR' })).toEqual({ value: 199, currency: 'INR' });
    expect(sanitizeEventProps('purchase', { value: -5 })).toEqual({});
  });

  it('attribution: path-only landing, slug must be a code', () => {
    const a = sanitizeAttribution({ slug: 'Repeating-Lessons', utm_source: 'ig', landing: '/q/x?email=a@b.com', evil: 'x' });
    expect(a).toEqual({ slug: 'repeating-lessons', utm_source: 'ig', landing: '/q/x' });
    expect(sanitizeAttribution({ slug: 'has space' })).toEqual({});
  });

  it('slugFromPath', () => {
    expect(slugFromPath('/q/known-before')).toBe('known-before');
    expect(slugFromPath('/start')).toBe('start');
    expect(slugFromPath('/blog/x')).toBeNull();
    expect(slugFromPath(null)).toBeNull();
  });

  it('isSafeCode / scrubFreeText edge cases', () => {
    expect(isSafeCode('sub_monthly')).toBe(true);
    expect(isSafeCode('9876543210')).toBe(false);
    expect(scrubFreeText('  a   b  ')).toBe('a b');
  });
});
