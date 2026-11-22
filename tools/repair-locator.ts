import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { env } from '../config/env';
import { suggestLocatorRepair } from '../src/ai/locator-repair';
import { createProposal } from '../src/ai/proposals';
import { createProvider } from '../src/ai/provider';

/**
 * Suggests a replacement for a locator that no longer works. Saves a pending proposal; changes no file.
 * Usage: npm run ai:repair -- --locator "getByTestId('login-button')" --snapshot path\to\page.html [--error "text"]
 * After review (npm run ai -- show|approve|reject), apply the change by hand in the page object.
 */

const DIR = resolve('ai', 'proposals');

function option(name: string): string | undefined {
  const args = process.argv.slice(2);
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] : undefined;
}

async function main(): Promise<void> {
  const locator = option('locator');
  const snapshotFile = option('snapshot');
  if (!locator || !snapshotFile) {
    throw new Error(
      'Usage: npm run ai:repair -- --locator "getByTestId(\'x\')" --snapshot path\\to\\page.html [--error "text"]',
    );
  }
  const provider = createProvider(env);
  if (provider.name !== 'offline') {
    console.log(`Sending the cleaned page snapshot and locator to ${provider.name}.`);
  }
  const result = await suggestLocatorRepair(provider, {
    locator,
    errorText: option('error') ?? '',
    snapshot: readFileSync(snapshotFile, 'utf8'),
  });

  if (result.status === 'none') {
    console.log(`No safe suggestion for ${locator}.\nReason: ${result.reasoning}`);
    return;
  }
  const proposal = createProposal(DIR, {
    kind: 'locator-repair',
    provider: provider.name,
    evidence: [snapshotFile, locator],
    payload: {
      failingLocator: result.failingLocator,
      suggestedLocator: result.suggestedLocator,
      strategy: result.strategy,
      reasoning: result.reasoning,
      confidence: result.confidence,
      note: 'Apply by hand in the page object after review. This proposal changes no file.',
    },
  });
  console.log(`${proposal.id}  (${result.confidence} confidence)`);
  console.log(
    `  - ${result.failingLocator}\n  + ${result.suggestedLocator}\n  ${result.reasoning}`,
  );
  console.log(`\nReview with: npm run ai -- show ${proposal.id}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
