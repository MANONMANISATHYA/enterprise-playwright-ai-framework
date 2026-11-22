import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { env } from '../config/env';
import { analyseFailure, extractFailures } from '../src/ai/failure-analysis';
import { createProposal } from '../src/ai/proposals';
import { createProvider } from '../src/ai/provider';
import type { Report } from '../src/reporting/metrics';

/**
 * Reads the failures in a Playwright JSON report, asks the AI provider to analyse each one and saves
 * every answer as a pending proposal in ai/proposals. Nothing is changed or re-run.
 * Usage: npm run analyse            (reports/results.json)
 *        npm run analyse -- path\to\report.json
 * Then review with: npm run ai -- list
 */

const MAX_FAILURES = 10;
const DIR = resolve('ai', 'proposals');

async function main(): Promise<void> {
  const reportPath = process.argv[2] ?? 'reports/results.json';
  if (!existsSync(reportPath)) {
    throw new Error(`No report at ${reportPath}. Run npm test first.`);
  }
  const report = JSON.parse(readFileSync(reportPath, 'utf8')) as Report;
  if (!Array.isArray(report.suites))
    throw new Error(`${reportPath} is not a Playwright JSON report.`);

  const secrets = [env.DEMO_PASSWORD, env.ANTHROPIC_API_KEY].filter((s): s is string => Boolean(s));
  const failures = extractFailures(report, secrets);
  if (failures.length === 0) {
    console.log('No failed tests in the report. Nothing to analyse.');
    return;
  }

  const provider = createProvider(env);
  const batch = failures.slice(0, MAX_FAILURES);
  console.log(`AI provider: ${provider.name}. Failures in report: ${String(failures.length)}.`);
  if (provider.name !== 'offline') {
    console.log(
      `Sending the masked error text of ${String(batch.length)} failures to ${provider.name}.`,
    );
  }
  if (failures.length > batch.length) {
    console.log(`Analysing the first ${String(batch.length)} only.`);
  }

  let saved = 0;
  let agreed = 0;
  let errors = 0;
  for (const evidence of batch) {
    try {
      const result = await analyseFailure(provider, evidence);
      const proposal = createProposal(DIR, {
        kind: 'failure-analysis',
        provider: provider.name,
        evidence: [reportPath, evidence.name],
        payload: {
          test: result.name,
          baselineCategory: result.baseline,
          analysis: result.analysis,
          agreesWithBaseline: result.agreesWithBaseline,
          errorExcerpt: result.errorExcerpt,
        },
      });
      saved += 1;
      if (result.agreesWithBaseline) agreed += 1;
      const verdict = result.agreesWithBaseline ? 'agrees' : 'DIFFERS';
      console.log(
        `${proposal.id}  baseline=${result.baseline}  ai=${result.analysis.category}  ${verdict}\n    ${result.name}`,
      );
    } catch (error) {
      errors += 1;
      console.log(
        `Skipped "${evidence.name}": ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  console.log(
    `\nSaved ${String(saved)} proposals (agree with baseline: ${String(agreed)}, differ: ${String(saved - agreed)}), skipped ${String(errors)}.`,
  );
  console.log('Review them with: npm run ai -- list');
  if (saved === 0) process.exitCode = 1;
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
