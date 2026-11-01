import type { ZodType } from 'zod';

/**
 * Parses a response body against a schema and returns the typed result.
 * On a mismatch it throws an error that lists every offending field, so a schema
 * drift shows up as a readable test failure instead of "expected true, got false".
 */
export function parseResponse<T>(schema: ZodType<T>, body: unknown): T {
  const result = schema.safeParse(body);
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n');
    throw new Error(`Response does not match the schema:\n${details}`);
  }
  return result.data;
}
