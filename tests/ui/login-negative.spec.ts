import { env } from '../../config/env';
import { expect, test } from '../../src/fixtures';

const REJECTED_LOGINS = [
  { name: 'unknown user', user: 'no_such_user', password: 'secret_sauce' },
  { name: 'injection-style input', user: "' OR '1'='1", password: 'x' },
  { name: 'very long username', user: 'a'.repeat(300), password: 'secret_sauce' },
];

test.describe('login negative @negative', () => {
  for (const { name, user, password } of REJECTED_LOGINS) {
    test(`${name} is rejected`, async ({ loginPage, page }) => {
      await loginPage.goto();
      await loginPage.login(user, password);

      await expect(loginPage.errorMessage).toContainText('do not match any user');
      await expect(page).not.toHaveURL(/inventory\.html/);
    });
  }

  test('missing password is rejected', async ({ loginPage }) => {
    await loginPage.goto();
    await loginPage.login(env.STANDARD_USER, '');

    await expect(loginPage.errorMessage).toContainText('Password is required');
  });
});
