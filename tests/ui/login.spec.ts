import { env } from '../../config/env';
import { expect, test } from '../../src/fixtures';

test.describe('login @smoke', () => {
  test('standard user reaches the product list', async ({ loginPage, page }) => {
    await loginPage.goto();
    await loginPage.login(env.STANDARD_USER, env.DEMO_PASSWORD);

    await expect(page).toHaveURL(/inventory\.html/);
  });

  test('wrong password shows an error', async ({ loginPage, page }) => {
    await loginPage.goto();
    await loginPage.login(env.STANDARD_USER, 'wrong_password');

    await expect(loginPage.errorMessage).toContainText('do not match any user');
    await expect(page).not.toHaveURL(/inventory\.html/);
  });

  test('locked-out user is rejected', async ({ loginPage }) => {
    await loginPage.goto();
    await loginPage.login(env.LOCKED_USER, env.DEMO_PASSWORD);

    await expect(loginPage.errorMessage).toContainText('locked out');
  });

  test('empty username is rejected', async ({ loginPage }) => {
    await loginPage.goto();
    await loginPage.login('', env.DEMO_PASSWORD);

    await expect(loginPage.errorMessage).toContainText('Username is required');
  });
});
