/**
 * Rule-based failure classification. It reads only the error text, so the same input always
 * gives the same category. The AI failure analysis (later) is compared against this baseline.
 * Rules are checked in order, so more specific causes come first.
 */

export type FailureCategory =
  | 'environment'
  | 'contract'
  | 'locator-ambiguous'
  | 'element-not-found'
  | 'assertion-mismatch'
  | 'timeout'
  | 'unknown';

export const FAILURE_CATEGORIES: readonly FailureCategory[] = [
  'environment',
  'contract',
  'locator-ambiguous',
  'element-not-found',
  'assertion-mismatch',
  'timeout',
  'unknown',
];

const RULES: readonly { category: FailureCategory; pattern: RegExp }[] = [
  {
    category: 'environment',
    pattern:
      /Executable doesn't exist|npx playwright install|ECONNREFUSED|ENOTFOUND|getaddrinfo|net::ERR_/i,
  },
  { category: 'contract', pattern: /does not match the schema|Could not authenticate/i },
  { category: 'locator-ambiguous', pattern: /strict mode violation/i },
  { category: 'element-not-found', pattern: /element\(s\) not found|waiting for (getBy|locator)/i },
  {
    category: 'assertion-mismatch',
    pattern:
      /expect\([^)]*\)\.(not\.)?to[A-Z]\w*|Expected( substring| string)?:|Received( string)?:/,
  },
  { category: 'timeout', pattern: /Timeout \d+ms exceeded|Test timeout of \d+ms/i },
];

// Playwright colours error text with ANSI escape codes. Remove them before matching.
const ANSI = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'g');

export function stripAnsi(text: string): string {
  return text.replace(ANSI, '');
}

export function classifyFailure(message: string): FailureCategory {
  const clean = stripAnsi(message);
  for (const rule of RULES) {
    if (rule.pattern.test(clean)) return rule.category;
  }
  return 'unknown';
}
