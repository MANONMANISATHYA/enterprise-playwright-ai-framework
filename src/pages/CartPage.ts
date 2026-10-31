import type { Locator, Page } from '@playwright/test';

export class CartPage {
  readonly itemNames: Locator;
  private readonly checkoutButton: Locator;

  constructor(page: Page) {
    this.itemNames = page.getByTestId('inventory-item-name');
    this.checkoutButton = page.getByTestId('checkout');
  }

  async checkout(): Promise<void> {
    await this.checkoutButton.click();
  }
}
