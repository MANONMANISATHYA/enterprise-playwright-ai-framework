import { test, expect } from '@playwright/test';

test.describe('smoke', () => {
  test('login page renders its core elements', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveTitle('Swag Labs');
    await expect(page.getByTestId('username')).toBeVisible();
    await expect(page.getByTestId('password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Login' })).toBeEnabled();
  });
});
