import { test as base, expect, type PlaywrightWorkerArgs } from '@playwright/test';
import { env } from '../../config/env';
import { scanPage, type A11yViolation } from '../a11y/scan';
import { ApiClient } from '../api/ApiClient';
import { CartPage } from '../pages/CartPage';
import { CheckoutPage } from '../pages/CheckoutPage';
import { InventoryPage } from '../pages/InventoryPage';
import { LoginPage } from '../pages/LoginPage';

type Fixtures = {
  loginPage: LoginPage;
  inventoryPage: InventoryPage;
  cartPage: CartPage;
  checkoutPage: CheckoutPage;
  /** Runs an accessibility scan of the current page and returns the violations. */
  a11y: () => Promise<A11yViolation[]>;
  /** API client with no token. */
  api: ApiClient;
  /** API client logged in as the standard user. */
  authApi: ApiClient;
  /** API client logged in as a second, unrelated user. */
  otherApi: ApiClient;
};

type Playwright = PlaywrightWorkerArgs['playwright'];

/** Creates an API client, optionally logged in, and always cleans up after the test. */
async function withApiClient(
  playwright: Playwright,
  user: string | undefined,
  use: (client: ApiClient) => Promise<void>,
): Promise<void> {
  const context = await playwright.request.newContext({ baseURL: env.API_BASE_URL });
  const client = new ApiClient(context);
  try {
    if (user) await client.authenticate(user, env.DEMO_PASSWORD);
    await use(client);
  } finally {
    await client.cleanup();
    await context.dispose();
  }
}

export const test = base.extend<Fixtures>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
  inventoryPage: async ({ page }, use) => {
    // Logs in through the UI for now. A later step replaces this with storageState.
    const login = new LoginPage(page);
    await login.goto();
    await login.login(env.STANDARD_USER, env.DEMO_PASSWORD);
    await use(new InventoryPage(page));
  },
  cartPage: async ({ page }, use) => {
    await use(new CartPage(page));
  },
  checkoutPage: async ({ page }, use) => {
    await use(new CheckoutPage(page));
  },
  a11y: async ({ page }, use) => {
    await use(() => scanPage(page));
  },
  api: async ({ playwright }, use) => {
    await withApiClient(playwright, undefined, use);
  },
  authApi: async ({ playwright }, use) => {
    await withApiClient(playwright, env.STANDARD_USER, use);
  },
  otherApi: async ({ playwright }, use) => {
    await withApiClient(playwright, env.SECOND_USER, use);
  },
});

export { expect };
