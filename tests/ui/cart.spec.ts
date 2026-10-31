import { expect, test } from '../../src/fixtures';

test.describe('cart @regression', () => {
  test('added product appears in the cart', async ({ inventoryPage, cartPage }) => {
    await expect(inventoryPage.title).toHaveText('Products');

    await inventoryPage.addToCart('sauce-labs-backpack');
    await expect(inventoryPage.header.cartBadge).toHaveText('1');

    await inventoryPage.header.openCart();
    await expect(cartPage.itemNames).toHaveText(['Sauce Labs Backpack']);
  });
});
