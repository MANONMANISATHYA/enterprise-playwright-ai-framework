import { defineConfig, devices } from '@playwright/test';
import { env } from './config/env';

const isCI = env.TEST_ENV === 'ci' || !!process.env.CI;

const isLocalUrl = (url: string): boolean => new URL(url).hostname === 'localhost';
// Start the bundled app when either the UI or the API points at localhost.
const localAppUrl = [env.UI_BASE_URL, env.API_BASE_URL].find(isLocalUrl);
const uiIsLocal = isLocalUrl(env.UI_BASE_URL);

export default defineConfig({
  testDir: './tests',
  testIgnore: uiIsLocal ? undefined : '**/accessibility.spec.ts',
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
  webServer: localAppUrl
    ? {
        command: 'node target-app/server.cjs',
        url: localAppUrl,
        reuseExistingServer: false,
        timeout: 15_000,
      }
    : undefined,
});
