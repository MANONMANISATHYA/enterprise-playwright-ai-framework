import type { Locator, Page } from '@playwright/test';
import { Header } from '../components/Header';

export type SortOption = 'az' | 'za' | 'lohi' | 'hilo';

export class InventoryPage {
  readonly header: Header;
  readonly title: Locator;
  readonly items: Locator;
  readonly itemNames: Locator;

  constructor(private readonly page: Page) {
    this.header = new Header(page);
    this.title = page.getByTestId('title');
    this.items = page.getByTestId('inventory-item');
    this.itemNames = page.getByTestId('inventory-item-name');
  }

  async addToCart(productSlug: string): Promise<void> {
    await this.page.getByTestId(`add-to-cart-${productSlug}`).click();
  }

  async sortBy(option: SortOption): Promise<void> {
    await this.page.getByTestId('product-sort-container').selectOption(option);
  }
}
