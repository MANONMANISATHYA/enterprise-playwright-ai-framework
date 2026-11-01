import { z } from 'zod';

/**
 * Contracts for the target app's REST API.
 * strictObject rejects unknown keys, so an unexpected extra field (for example a
 * leaked password) fails the test the same way a missing field does.
 */

export const tokenSchema = z.strictObject({
  token: z.string().min(10),
  expiresIn: z.number().int().positive(),
});

/**
 * Lenient on purpose: used by setup code that only needs the token. It ignores
 * extra fields, so a contract problem fails the auth test (which uses the strict
 * tokenSchema) instead of breaking every test that logs in.
 */
export const tokenOnlySchema = z.object({
  token: z.string().min(10),
});

export const productSchema = z.strictObject({
  id: z.number().int().positive(),
  name: z.string().min(1),
  price: z.number().positive(),
});

export const productListSchema = z.strictObject({
  products: z.array(productSchema).min(1),
});

export const orderItemSchema = z.strictObject({
  productId: z.number().int().positive(),
  quantity: z.number().int().positive(),
});

export const orderSchema = z.strictObject({
  id: z.number().int().positive(),
  status: z.literal('created'),
  items: z.array(orderItemSchema).min(1),
  total: z.number().positive(),
});

export const errorSchema = z.strictObject({
  error: z.string().min(1),
  message: z.string().optional(),
});

export type Token = z.infer<typeof tokenSchema>;
export type Product = z.infer<typeof productSchema>;
export type Order = z.infer<typeof orderSchema>;
export type OrderItem = z.infer<typeof orderItemSchema>;
