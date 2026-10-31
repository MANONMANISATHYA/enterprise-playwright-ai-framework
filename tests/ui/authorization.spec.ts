import { expect, test } from '../../src/fixtures';

const PROTECTED_PATHS = ['/inventory.html', '/cart.html', '/checkout-step-one.html'];

test.describe('authorization @negative', () => {
  for (const path of PROTECTED_PATHS) {
    test(`anonymous user cannot open ${path}`, async ({ loginPage }) => {
      await loginPage.goto(path);

      await expect(loginPage.errorMessage).toContainText('when you are logged in');
    });
  }

  test('logging out ends access to protected pages', async ({ inventoryPage, loginPage }) => {
    await expect(inventoryPage.title).toHaveText('Products');

    await inventoryPage.header.logout();
    await loginPage.goto('/inventory.html');

    await expect(loginPage.errorMessage).toContainText('when you are logged in');
  });
});
