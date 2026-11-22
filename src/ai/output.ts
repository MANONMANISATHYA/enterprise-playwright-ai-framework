import type { ZodType } from 'zod';

/** Safety helpers for the AI layer: validate everything that comes back, hide secrets on the way out. */

export class AiOutputError extends Error {}

function stripFences(raw: string): string {
  const text = raw.trim();
  if (!text.startsWith('```')) return text;
  const lines = text.split('\n');
  lines.shift();
  if (lines.at(-1)?.trim() === '```') lines.pop();
  return lines.join('\n').trim();
}

/** Parses provider text as JSON and checks it against the schema. Throws instead of returning bad data. */
export function parseAiJson<T>(raw: string, schema: ZodType<T>): T {
  let value: unknown;
  try {
    value = JSON.parse(stripFences(raw));
  } catch {
    throw new AiOutputError('The provider did not return valid JSON.');
  }
  const result = schema.safeParse(value);
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new AiOutputError(`The provider output does not match the schema:\n${details}`);
  }
  return result.data;
}

/** Masks secret-looking text. Run it over any evidence before it is sent to a provider. */
export function redact(text: string): string {
  return text
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, 'Bearer [REDACTED]')
    .replace(/\bsk-[A-Za-z0-9_-]{16,}/g, '[REDACTED]')
    .replace(/\b(api[-_ ]?key|token|password|secret)(\s*[:=]\s*)\S+/gi, '$1$2[REDACTED]');
}
