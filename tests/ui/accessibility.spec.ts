import { expect, test } from '../../src/fixtures';

// Runs only against the self-hosted app (see testIgnore in playwright.config.ts).
// A failure lists every violation with its rule, impact and the elements involved.
test.describe('accessibility @a11y', () => {
  test('login page has no detectable violations', async ({ loginPage, a11y }) => {
    await loginPage.goto();

    expect(await a11y()).toEqual([]);
  });

  test('product list has no detectable violations', async ({ inventoryPage, a11y }) => {
    await expect(inventoryPage.title).toBeVisible();

    expect(await a11y()).toEqual([]);
  });

  test('cart has no detectable violations', async ({ inventoryPage, cartPage, a11y }) => {
    await inventoryPage.addToCart('sauce-labs-backpack');
    await inventoryPage.header.openCart();
    await expect(cartPage.itemNames).toHaveCount(1);

    expect(await a11y()).toEqual([]);
  });

  test('checkout form has no detectable violations', async ({
    inventoryPage,
    cartPage,
    checkoutPage,
    a11y,
  }) => {
    await inventoryPage.addToCart('sauce-labs-backpack');
    await inventoryPage.header.openCart();
    await cartPage.checkout();
    await expect(checkoutPage.firstName).toBeVisible();

    expect(await a11y()).toEqual([]);
  });
});
