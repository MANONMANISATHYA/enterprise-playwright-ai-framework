import { orderItemSchema } from '../../src/api/schemas';
import { buildOrderRequest, buildShippingInfo } from '../../src/data/factories';
import { expect, test } from '../../src/fixtures';

// No browser or server needed: these run in milliseconds.
test.describe('data factories @unit', () => {
  test('shipping info has every field filled', () => {
    const info = buildShippingInfo();

    expect(info.firstName).not.toBe('');
    expect(info.lastName).not.toBe('');
    expect(info.postalCode).not.toBe('');
  });

  test('two shipping infos never share a last name', () => {
    expect(buildShippingInfo().lastName).not.toBe(buildShippingInfo().lastName);
  });

  test('an override replaces only that field, even with an empty string', () => {
    const info = buildShippingInfo({ lastName: '' });

    expect(info.lastName).toBe('');
    expect(info.firstName).toBe('Test');
  });

  test('default order request is valid and overrides win', () => {
    const [item] = buildOrderRequest().items;
    expect(orderItemSchema.safeParse(item).success).toBe(true);

    const custom = buildOrderRequest({ items: [{ productId: 2, quantity: 5 }] });
    expect(custom.items).toEqual([{ productId: 2, quantity: 5 }]);
  });
});
