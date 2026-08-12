import { describe, expect, it } from 'vitest';
import { oncePerUserOrderId } from './server';

describe('oncePerUserOrderId', () => {
  it('prefers normalized email over user id', () => {
    expect(oncePerUserOrderId('code-1', 'user-1', '  Alice@Example.COM ')).toBe(
      'promo:code-1:email:alice@example.com',
    );
  });

  it('falls back to user id when email missing', () => {
    expect(oncePerUserOrderId('code-1', 'user-1', null)).toBe('promo:code-1:user-1');
    expect(oncePerUserOrderId('code-1', 'user-1', '  ')).toBe('promo:code-1:user-1');
  });
});
