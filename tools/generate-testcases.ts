import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { env } from '../config/env';
import { createProposal } from '../src/ai/proposals';
import { createProvider } from '../src/ai/provider';
import { generateTestCases, parseRequirements } from '../src/ai/test-generation';

/**
 * Reads a requirements file, asks the AI provider for test cases per requirement and saves each
 * answer as a pending proposal. No test code is written and nothing is run.
 * Usage: npm run testcases:generate -- requirements\checkout-and-login.md
 * Then review with: npm run ai -- list, and export approved ones with: npm run testcases:export
 */

const DIR = resolve('ai', 'proposals');

async function main(): Promise<void> {
  const file = process.argv[2];
  if (!file) throw new Error('Usage: npm run testcases:generate -- <requirements file>');
  const requirements = parseRequirements(readFileSync(file, 'utf8'));
  const provider = createProvider(env);

  console.log(`AI provider: ${provider.name}. Requirements: ${String(requirements.length)}.`);
  if (provider.name !== 'offline') {
    console.log(
      `Sending the text of ${String(requirements.length)} requirements to ${provider.name}.`,
    );
  }

  let saved = 0;
  for (const requirement of requirements) {
    try {
      const result = await generateTestCases(provider, requirement);
      const proposal = createProposal(DIR, {
        kind: 'test-case',
        provider: provider.name,
        evidence: [file, requirement.id],
        payload: {
          requirementId: result.requirementId,
          title: result.title,
          uncovered: result.uncovered,
          testCases: result.testCases,
        },
      });
      saved += 1;
      const gaps = result.uncovered.length > 0 ? `  UNCOVERED: ${result.uncovered.join(', ')}` : '';
      console.log(
        `${proposal.id}  ${requirement.id}  ${String(result.testCases.length)} test cases for ${String(requirement.criteria.length)} criteria${gaps}`,
      );
    } catch (error) {
      console.log(
        `Skipped ${requirement.id}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
  console.log(
    `\nSaved ${String(saved)} of ${String(requirements.length)} proposals. Review with: npm run ai -- list`,
  );
  if (saved === 0) process.exitCode = 1;
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
