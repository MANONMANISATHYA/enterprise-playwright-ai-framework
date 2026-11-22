import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';

/**
 * Everything the AI layer produces is saved here as a proposal: plain data in a JSON file, status
 * "pending". Nothing acts on a proposal until a person approves it, and even then it is only data.
 */

export const PROPOSAL_KINDS = ['failure-analysis', 'test-case', 'locator-repair'] as const;
export type ProposalKind = (typeof PROPOSAL_KINDS)[number];

const proposalSchema = z.strictObject({
  id: z.string().min(1),
  kind: z.enum(PROPOSAL_KINDS),
  status: z.enum(['pending', 'approved', 'rejected']),
  createdAt: z.string(),
  provider: z.string(),
  /** Where the input came from, for example a report file and test name. */
  evidence: z.array(z.string()),
  payload: z.record(z.string(), z.unknown()),
  review: z.strictObject({ at: z.string(), note: z.string().optional() }).optional(),
});

export type Proposal = z.infer<typeof proposalSchema>;

export interface NewProposal {
  kind: ProposalKind;
  provider: string;
  evidence: string[];
  payload: Record<string, unknown>;
}

const fileFor = (dir: string, id: string): string => join(dir, `${id}.json`);

export function createProposal(dir: string, input: NewProposal): Proposal {
  mkdirSync(dir, { recursive: true });
  const proposal: Proposal = {
    id: `${input.kind}-${randomUUID().slice(0, 8)}`,
    kind: input.kind,
    status: 'pending',
    createdAt: new Date().toISOString(),
    provider: input.provider,
    evidence: input.evidence,
    payload: input.payload,
  };
  writeFileSync(fileFor(dir, proposal.id), `${JSON.stringify(proposal, null, 2)}\n`);
  return proposal;
}

export function readProposal(dir: string, id: string): Proposal {
  const file = fileFor(dir, id);
  if (!existsSync(file)) throw new Error(`No proposal with id "${id}".`);
  const parsed = proposalSchema.safeParse(JSON.parse(readFileSync(file, 'utf8')));
  if (!parsed.success) throw new Error(`Proposal "${id}" is not a valid proposal file.`);
  return parsed.data;
}

export function listProposals(dir: string): Proposal[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => name.endsWith('.json'))
    .map((name) => readProposal(dir, name.slice(0, -'.json'.length)))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/** Records a person's decision. A proposal can be reviewed only once. */
export function reviewProposal(
  dir: string,
  id: string,
  decision: 'approved' | 'rejected',
  note?: string,
): Proposal {
  const current = readProposal(dir, id);
  if (current.status !== 'pending') {
    throw new Error(`Proposal "${id}" is already ${current.status} and cannot be reviewed again.`);
  }
  const reviewed: Proposal = {
    ...current,
    status: decision,
    review: { at: new Date().toISOString(), ...(note ? { note } : {}) },
  };
  writeFileSync(fileFor(dir, id), `${JSON.stringify(reviewed, null, 2)}\n`);
  return reviewed;
}

/** Any code that uses a proposal's content must call this first. */
export function assertApproved(proposal: Proposal): void {
  if (proposal.status !== 'approved') {
    throw new Error(`Proposal "${proposal.id}" is ${proposal.status}, not approved.`);
  }
}
