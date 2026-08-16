import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';

/**
 * Regression: #208 changed the /login SSR shell from POST /api/auth/signin to
 * a GET form with name="password". That markup is the Suspense fallback for
 * LoginForm (useSearchParams), i.e. the first HTML paint. Submitting it put
 * the password in the query string — browser history, Referer, access logs.
 */
const LOGIN_PAGE = join(process.cwd(), 'src', 'app', 'login', 'page.tsx');

describe('login SSR shell must not leak credentials via GET', () => {
  const src = readFileSync(LOGIN_PAGE, 'utf8');

  it('does not render a GET form', () => {
    expect(src).not.toMatch(/method\s*=\s*['"]GET['"]/i);
  });

  it('does not put a named password field on the shell', () => {
    expect(src).not.toMatch(/name\s*=\s*['"]password['"]/);
  });

  it('does not put a named email field on the shell (email in a GET URL is still a leak)', () => {
    expect(src).not.toMatch(/name\s*=\s*['"]email['"]/);
  });
});
