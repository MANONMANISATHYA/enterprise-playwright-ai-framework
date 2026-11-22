import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { env } from '../config/env';
import {
  evaluateFailureAnalysis,
  evaluateLocatorRepair,
  evaluateTestGeneration,
  failureDatasetSchema,
  renderEvaluation,
  repairDatasetSchema,
  summariseEvaluation,
  type EvaluationReport,
} from '../src/ai/evaluation';
import { createProvider } from '../src/ai/provider';
import { parseRequirements } from '../src/ai/test-generation';

/**
 * Runs the AI layer against the labelled evaluation sets in evaluation/ and the sample requirements.
 * Writes reports/ai-evaluation.json (read by npm run metrics) and docs/ai-evaluation.md.
 * Usage: npm run ai:eval
 */

async function main(): Promise<void> {
  const failures = failureDatasetSchema.parse(
    JSON.parse(readFileSync(resolve('evaluation', 'failure-analysis.json'), 'utf8')),
  );
  const repairs = repairDatasetSchema.parse(
    JSON.parse(readFileSync(resolve('evaluation', 'locator-repair.json'), 'utf8')),
  );
  const requirements = parseRequirements(
    readFileSync(resolve('requirements', 'checkout-and-login.md'), 'utf8'),
  );

  const provider = createProvider(env);
  if (provider.name !== 'offline') {
    console.log(
      `Sending the evaluation examples (error texts, snapshots, requirements) to ${provider.name}.`,
    );
  }

  const report: EvaluationReport = {
    generatedAt: new Date().toISOString(),
    provider: provider.name,
    labelsReviewed: failures.reviewed && repairs.reviewed,
    failureAnalysis: await evaluateFailureAnalysis(provider, failures),
    testGeneration: await evaluateTestGeneration(provider, requirements),
    locatorRepair: await evaluateLocatorRepair(provider, repairs),
  };

  mkdirSync(resolve('reports'), { recursive: true });
  writeFileSync(resolve('reports', 'ai-evaluation.json'), `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(resolve('docs', 'ai-evaluation.md'), renderEvaluation(report));
  console.log(summariseEvaluation(report));
  for (const w of report.failureAnalysis.wrong) {
    console.log(`  failure analysis wrong: ${w.name} (expected ${w.expected}, got ${w.got})`);
  }
  for (const name of report.locatorRepair.wrong) console.log(`  locator repair wrong: ${name}`);
  console.log('Wrote docs/ai-evaluation.md and reports/ai-evaluation.json');
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
