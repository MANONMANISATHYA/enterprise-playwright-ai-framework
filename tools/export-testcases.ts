import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { listProposals } from '../src/ai/proposals';
import { renderApprovedTestCases } from '../src/ai/test-generation';

/**
 * Writes docs/approved-test-cases.md from the test-case proposals a person approved.
 * Pending and rejected proposals are left out.
 * Usage: npm run testcases:export
 */

const proposals = listProposals(resolve('ai', 'proposals'));
const approved = proposals.filter((p) => p.kind === 'test-case' && p.status === 'approved');

if (approved.length === 0) {
  console.log('No approved test-case proposals. Approve some first: npm run ai -- approve <id>');
  process.exitCode = 1;
} else {
  writeFileSync(resolve('docs', 'approved-test-cases.md'), renderApprovedTestCases(proposals));
  console.log(
    `Wrote docs/approved-test-cases.md from ${String(approved.length)} approved proposals.`,
  );
}
