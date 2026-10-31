import type { Locator, Page } from '@playwright/test';
import { Header } from '../components/Header';

export class InventoryPage {
  readonly header: Header;
  readonly title: Locator;
  readonly items: Locator;

  constructor(private readonly page: Page) {
    this.header = new Header(page);
    this.title = page.getByTestId('title');
    this.items = page.getByTestId('inventory-item');
  }

  async addToCart(productSlug: string): Promise<void> {
    await this.page.getByTestId(`add-to-cart-${productSlug}`).click();
  }
}
