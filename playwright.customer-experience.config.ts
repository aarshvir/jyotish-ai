import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e', testMatch: 'customer-experience.spec.ts',
  timeout: 90_000, workers: 1, retries: 0,
  reporter: [['list'], ['json', { outputFile: 'artifacts/customer-experience/task-results.json' }]],
  outputDir: 'artifacts/customer-experience/task-artifacts',
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3100',
    channel: 'chrome', contextOptions: { reducedMotion: 'reduce' }, timezoneId: 'Asia/Dubai',
    screenshot: 'only-on-failure', trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 1000 } } },
    { name: 'mobile', use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
    { name: 'narrow', use: { viewport: { width: 320, height: 740 }, isMobile: true, hasTouch: true } },
  ],
});
