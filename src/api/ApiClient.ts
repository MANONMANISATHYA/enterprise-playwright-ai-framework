import type { APIRequestContext } from '@playwright/test';
import { orderSchema, tokenOnlySchema, type OrderItem } from './schemas';

export interface ApiResponse {
  status: number;
  body: unknown;
}

export interface OrderRequest {
  items: OrderItem[];
}

type Method = 'GET' | 'POST' | 'DELETE';

/**
 * Typed wrapper around the target app's REST API.
 * Methods return the raw status and body, so tests can assert on error cases too.
 * Orders the client creates are tracked and removed by cleanup().
 */
export class ApiClient {
  private token: string | undefined;
  private readonly createdOrderIds: number[] = [];

  constructor(private readonly request: APIRequestContext) {}

  async login(username: string, password: string): Promise<ApiResponse> {
    return this.send('POST', '/api/auth/token', { username, password });
  }

  /** Logs in and keeps the token for later calls. Throws if the login fails. */
  async authenticate(username: string, password: string): Promise<void> {
    const response = await this.login(username, password);
    const parsed = tokenOnlySchema.safeParse(response.body);
    if (response.status !== 200 || !parsed.success) {
      throw new Error(`Could not authenticate "${username}" (status ${String(response.status)})`);
    }
    this.token = parsed.data.token;
  }

  async listProducts(): Promise<ApiResponse> {
    return this.send('GET', '/api/products');
  }

  async getProduct(id: number): Promise<ApiResponse> {
    return this.send('GET', `/api/products/${String(id)}`);
  }

  async createOrder(order: OrderRequest): Promise<ApiResponse> {
    const response = await this.send('POST', '/api/orders', order);
    const created = orderSchema.safeParse(response.body);
    if (created.success) this.createdOrderIds.push(created.data.id);
    return response;
  }

  async getOrder(id: number): Promise<ApiResponse> {
    return this.send('GET', `/api/orders/${String(id)}`);
  }

  async deleteOrder(id: number): Promise<ApiResponse> {
    return this.send('DELETE', `/api/orders/${String(id)}`);
  }

  /** Deletes every order this client created. Safe to call more than once. */
  async cleanup(): Promise<void> {
    for (const id of this.createdOrderIds.splice(0)) {
      await this.deleteOrder(id).catch(() => undefined);
    }
  }

  private async send(method: Method, path: string, data?: unknown): Promise<ApiResponse> {
    const response = await this.request.fetch(path, {
      method,
      data,
      headers: this.token ? { Authorization: `Bearer ${this.token}` } : {},
    });
    const text = await response.text();
    return { status: response.status(), body: parseBody(text) };
  }
}

function parseBody(text: string): unknown {
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}
