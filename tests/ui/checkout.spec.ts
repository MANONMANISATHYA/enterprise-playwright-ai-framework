import { buildShippingInfo } from '../../src/data/factories';
import { expect, test } from '../../src/fixtures';

test.describe('checkout @regression', () => {
  test('user completes an order', async ({ inventoryPage, cartPage, checkoutPage }) => {
    await inventoryPage.addToCart('sauce-labs-backpack');
    await inventoryPage.header.openCart();
    await cartPage.checkout();
    await checkoutPage.fillShipping(buildShippingInfo());
    await checkoutPage.finish();

    await expect(checkoutPage.confirmation).toHaveText('Thank you for your order!');
  });

  test('missing first name is rejected', async ({ inventoryPage, cartPage, checkoutPage }) => {
    await inventoryPage.addToCart('sauce-labs-backpack');
    await inventoryPage.header.openCart();
    await cartPage.checkout();
    await checkoutPage.fillShipping(buildShippingInfo({ firstName: '' }));

    await expect(checkoutPage.errorMessage).toContainText('First Name is required');
  });

  test('missing last name is rejected', async ({ inventoryPage, cartPage, checkoutPage }) => {
    await inventoryPage.addToCart('sauce-labs-backpack');
    await inventoryPage.header.openCart();
    await cartPage.checkout();
    await checkoutPage.fillShipping(buildShippingInfo({ lastName: '' }));

    await expect(checkoutPage.errorMessage).toContainText('Last Name is required');
  });
});
