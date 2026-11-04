import { AxeBuilder } from '@axe-core/playwright';
import type { Page } from '@playwright/test';

/**
 * Automated accessibility scan of the page as it is right now (axe-core, WCAG 2.0/2.1 A and AA).
 * Automated tools find only part of the real problems, so a clean scan is not a full audit.
 */

export interface A11yViolation {
  rule: string;
  impact: string;
  help: string;
  targets: string[];
}

export async function scanPage(page: Page): Promise<A11yViolation[]> {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();

  return results.violations.map((violation) => ({
    rule: violation.id,
    impact: violation.impact ?? 'unknown',
    help: violation.help,
    targets: violation.nodes.map((node) => JSON.stringify(node.target)),
  }));
}
