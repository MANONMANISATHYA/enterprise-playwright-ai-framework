import { expect, test } from '../../src/fixtures';

test.describe('inventory @regression', () => {
  test('sorting Z to A reverses the name order', async ({ inventoryPage }) => {
    const names = await inventoryPage.itemNames.allTextContents();
    expect(names.length).toBeGreaterThan(1);

    await inventoryPage.sortBy('za');

    await expect(inventoryPage.itemNames).toHaveText([...names].sort().reverse());
  });
});
