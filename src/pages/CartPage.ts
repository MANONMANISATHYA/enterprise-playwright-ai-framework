import type { Locator, Page } from '@playwright/test';

export class CartPage {
  readonly itemNames: Locator;

  constructor(page: Page) {
    this.itemNames = page.getByTestId('inventory-item-name');
  }
}
