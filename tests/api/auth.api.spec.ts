import { env } from '../../config/env';
import { errorSchema, tokenSchema } from '../../src/api/schemas';
import { parseResponse } from '../../src/api/validate';
import { expect, test } from '../../src/fixtures';

test.describe('auth API @api', () => {
  test('valid credentials return a token', async ({ api }) => {
    const response = await api.login(env.STANDARD_USER, env.DEMO_PASSWORD);

    expect(response.status).toBe(200);
    expect(parseResponse(tokenSchema, response.body).expiresIn).toBeGreaterThan(0);
  });

  test('wrong password is rejected with 401', async ({ api }) => {
    const response = await api.login(env.STANDARD_USER, 'wrong_password');

    expect(response.status).toBe(401);
    expect(parseResponse(errorSchema, response.body).error).toBe('invalid_credentials');
  });

  test('locked-out user is rejected with 403', async ({ api }) => {
    const response = await api.login(env.LOCKED_USER, env.DEMO_PASSWORD);

    expect(response.status).toBe(403);
    expect(parseResponse(errorSchema, response.body).error).toBe('locked_out');
  });

  test('missing password is rejected with 400', async ({ api }) => {
    const response = await api.login(env.STANDARD_USER, '');

    expect(response.status).toBe(400);
    expect(parseResponse(errorSchema, response.body).error).toBe('validation_error');
  });
});
