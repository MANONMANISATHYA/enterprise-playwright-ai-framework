import { randomUUID } from 'node:crypto';
import type { OrderRequest } from '../api/ApiClient';

/**
 * Test-data builders. Each call returns fresh, valid data; pass overrides to
 * change only the field a test is about. Values that must be unique get a
 * random suffix, so parallel workers and repeated runs never collide.
 */

export interface ShippingInfo {
  firstName: string;
  lastName: string;
  postalCode: string;
}

const suffix = (): string => randomUUID().slice(0, 8);

export function buildShippingInfo(overrides: Partial<ShippingInfo> = {}): ShippingInfo {
  return {
    firstName: 'Test',
    lastName: `User-${suffix()}`,
    postalCode: '12345',
    ...overrides,
  };
}

/** One unit of product 1 unless told otherwise. */
export function buildOrderRequest(overrides: Partial<OrderRequest> = {}): OrderRequest {
  return { items: [{ productId: 1, quantity: 1 }], ...overrides };
}
