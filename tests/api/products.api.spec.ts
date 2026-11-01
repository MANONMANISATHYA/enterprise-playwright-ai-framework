import { errorSchema, productListSchema, productSchema } from '../../src/api/schemas';
import { parseResponse } from '../../src/api/validate';
import { expect, test } from '../../src/fixtures';

test.describe('products API @api', () => {
  test('authenticated user can list products', async ({ authApi }) => {
    const response = await authApi.listProducts();

    expect(response.status).toBe(200);
    const { products } = parseResponse(productListSchema, response.body);
    expect(products.length).toBeGreaterThan(0);
  });

  test('listing products without a token is rejected with 401', async ({ api }) => {
    const response = await api.listProducts();

    expect(response.status).toBe(401);
    expect(parseResponse(errorSchema, response.body).error).toBe('unauthorized');
  });

  test('product by id returns that product', async ({ authApi }) => {
    const response = await authApi.getProduct(1);

    expect(response.status).toBe(200);
    expect(parseResponse(productSchema, response.body).id).toBe(1);
  });

  test('unknown product id returns 404', async ({ authApi }) => {
    const response = await authApi.getProduct(9999);

    expect(response.status).toBe(404);
    expect(parseResponse(errorSchema, response.body).error).toBe('not_found');
  });
});
