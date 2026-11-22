import { resolve } from 'node:path';
import { env } from '../config/env';
import { listProposals, readProposal, reviewProposal } from '../src/ai/proposals';

/**
 * Review queue for AI proposals.
 * Usage: npm run ai -- list
 *        npm run ai -- show <id>
 *        npm run ai -- approve <id> [note]
 *        npm run ai -- reject <id> [note]
 * Approving only records your decision in the proposal file. Nothing is executed or applied.
 */

const DIR = resolve('ai', 'proposals');

function main(): void {
  const [command, id, ...noteWords] = process.argv.slice(2);
  const note = noteWords.join(' ') || undefined;

  if (command === 'list') {
    const proposals = listProposals(DIR);
    console.log(`AI provider: ${env.AI_PROVIDER}. Proposals: ${String(proposals.length)}.`);
    for (const p of proposals)
      console.log(`${p.status.padEnd(9)} ${p.id}  (${p.kind}, ${p.provider})`);
    return;
  }
  if ((command === 'show' || command === 'approve' || command === 'reject') && id) {
    const proposal =
      command === 'show'
        ? readProposal(DIR, id)
        : reviewProposal(DIR, id, command === 'approve' ? 'approved' : 'rejected', note);
    console.log(JSON.stringify(proposal, null, 2));
    return;
  }
  console.error('Usage: npm run ai -- list | show <id> | approve <id> [note] | reject <id> [note]');
  process.exit(2);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
