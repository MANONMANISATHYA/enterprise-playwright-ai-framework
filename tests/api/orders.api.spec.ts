import { errorSchema, orderSchema } from '../../src/api/schemas';
import { parseResponse } from '../../src/api/validate';
import { expect, test } from '../../src/fixtures';

// Product 1 costs 29.99, so two of them total 59.98.
const TWO_OF_PRODUCT_1 = { items: [{ productId: 1, quantity: 2 }] };

test.describe('orders API @api', () => {
  test('creating an order returns 201 and the order with the right total', async ({ authApi }) => {
    const response = await authApi.createOrder(TWO_OF_PRODUCT_1);

    expect(response.status).toBe(201);
    const order = parseResponse(orderSchema, response.body);
    expect(order.total).toBeCloseTo(59.98, 2);
  });

  test('a created order can be fetched', async ({ authApi }) => {
    const created = parseResponse(orderSchema, (await authApi.createOrder(TWO_OF_PRODUCT_1)).body);

    const response = await authApi.getOrder(created.id);

    expect(response.status).toBe(200);
    expect(parseResponse(orderSchema, response.body).id).toBe(created.id);
  });

  test('deleting an order removes it', async ({ authApi }) => {
    const created = parseResponse(orderSchema, (await authApi.createOrder(TWO_OF_PRODUCT_1)).body);

    expect((await authApi.deleteOrder(created.id)).status).toBe(204);
    expect((await authApi.getOrder(created.id)).status).toBe(404);
    expect((await authApi.deleteOrder(created.id)).status).toBe(404);
  });

  test('an order with no items is rejected with 400', async ({ authApi }) => {
    const response = await authApi.createOrder({ items: [] });

    expect(response.status).toBe(400);
    expect(parseResponse(errorSchema, response.body).error).toBe('validation_error');
  });

  test('a zero quantity is rejected with 400', async ({ authApi }) => {
    const response = await authApi.createOrder({ items: [{ productId: 1, quantity: 0 }] });

    expect(response.status).toBe(400);
  });

  test('an unknown product is rejected with 400', async ({ authApi }) => {
    const response = await authApi.createOrder({ items: [{ productId: 9999, quantity: 1 }] });

    expect(response.status).toBe(400);
  });

  test('creating an order without a token is rejected with 401', async ({ api }) => {
    const response = await api.createOrder(TWO_OF_PRODUCT_1);

    expect(response.status).toBe(401);
  });

  test('another user cannot read my order', async ({ authApi, otherApi }) => {
    const created = parseResponse(orderSchema, (await authApi.createOrder(TWO_OF_PRODUCT_1)).body);

    const response = await otherApi.getOrder(created.id);

    expect(response.status).toBe(404);
  });
});
