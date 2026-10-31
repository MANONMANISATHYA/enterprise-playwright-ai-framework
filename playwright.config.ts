import { defineConfig, devices } from '@playwright/test';
import { env } from './config/env';

const isCI = env.TEST_ENV === 'ci' || !!process.env.CI;
const useLocalApp = new URL(env.UI_BASE_URL).hostname === 'localhost';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 2 : undefined,
  timeout: 30_000,
  expect: { timeout: 5_000 },
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'reports/results.json' }],
  ],
  use: {
    baseURL: env.UI_BASE_URL,
    testIdAttribute: 'data-test',
    trace: isCI ? 'on-first-retry' : 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: useLocalApp
    ? {
        command: 'node target-app/server.cjs',
        url: env.UI_BASE_URL,
        reuseExistingServer: false,
        timeout: 15_000,
      }
    : undefined,
});
