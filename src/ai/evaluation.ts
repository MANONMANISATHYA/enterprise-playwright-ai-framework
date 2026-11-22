import { z } from 'zod';
import { classifyFailure, type FailureCategory } from '../reporting/failures';
import { analyseFailure, ANALYSIS_CATEGORIES, prepareErrorText } from './failure-analysis';
import { suggestLocatorRepair } from './locator-repair';
import type { AiProvider } from './provider';
import { generateTestCases, type Requirement } from './test-generation';

/**
 * Measures how good the AI layer is on a labelled evaluation set. Labels are human decisions
 * kept in evaluation/*.json. The report says whether a human has reviewed them.
 */

export const failureDatasetSchema = z.object({
  labelledBy: z.string().min(1),
  reviewed: z.boolean(),
  cases: z
    .array(
      z.object({
        name: z.string().min(1),
        source: z.enum(['real run', 'typical Playwright message']),
        errorText: z.string().min(1),
        expected: z.enum(ANALYSIS_CATEGORIES),
      }),
    )
    .min(1),
});

export const repairDatasetSchema = z.object({
  labelledBy: z.string().min(1),
  reviewed: z.boolean(),
  cases: z
    .array(
      z.object({
        name: z.string().min(1),
        locator: z.string().min(1),
        snapshot: z.string().min(1),
        /** The correct replacement, or null when the right answer is "no safe suggestion". */
        expectedLocator: z.string().nullable(),
      }),
    )
    .min(1),
});

export type FailureDataset = z.infer<typeof failureDatasetSchema>;
export type RepairDataset = z.infer<typeof repairDatasetSchema>;

export interface EvaluationReport {
  generatedAt: string;
  provider: string;
  labelsReviewed: boolean;
  failureAnalysis: {
    total: number;
    /** Answers that passed validation. The rest were rejected. */
    answered: number;
    rejected: number;
    correct: number;
    /** How many the rule-based classifier alone gets right on the same cases. */
    baselineCorrect: number;
    wrong: { name: string; expected: string; got: string }[];
  };
  testGeneration: {
    requirements: number;
    accepted: number;
    rejected: number;
    criteria: number;
    covered: number;
  };
  locatorRepair: {
    total: number;
    answered: number;
    rejected: number;
    correct: number;
    wrong: string[];
  };
}

const normalise = (expression: string): string =>
  expression.replace(/\s+/g, '').replaceAll('"', "'");

export async function evaluateFailureAnalysis(
  provider: AiProvider,
  dataset: FailureDataset,
): Promise<EvaluationReport['failureAnalysis']> {
  const result: EvaluationReport['failureAnalysis'] = {
    total: dataset.cases.length,
    answered: 0,
    rejected: 0,
    correct: 0,
    baselineCorrect: 0,
    wrong: [],
  };
  for (const item of dataset.cases) {
    const baseline: FailureCategory = classifyFailure(item.errorText);
    if (baseline === item.expected) result.baselineCorrect += 1;
    try {
      const analysed = await analyseFailure(provider, {
        name: item.name,
        baseline,
        errorText: prepareErrorText(item.errorText),
      });
      result.answered += 1;
      if (analysed.analysis.category === item.expected) result.correct += 1;
      else
        result.wrong.push({
          name: item.name,
          expected: item.expected,
          got: analysed.analysis.category,
        });
    } catch {
      result.rejected += 1;
      result.wrong.push({ name: item.name, expected: item.expected, got: 'rejected answer' });
    }
  }
  return result;
}

export async function evaluateTestGeneration(
  provider: AiProvider,
  requirements: Requirement[],
): Promise<EvaluationReport['testGeneration']> {
  const result = {
    requirements: requirements.length,
    accepted: 0,
    rejected: 0,
    criteria: 0,
    covered: 0,
  };
  for (const requirement of requirements) {
    result.criteria += requirement.criteria.length;
    try {
      const generated = await generateTestCases(provider, requirement);
      result.accepted += 1;
      result.covered += requirement.criteria.length - generated.uncovered.length;
    } catch {
      result.rejected += 1;
    }
  }
  return result;
}

export async function evaluateLocatorRepair(
  provider: AiProvider,
  dataset: RepairDataset,
): Promise<EvaluationReport['locatorRepair']> {
  const result: EvaluationReport['locatorRepair'] = {
    total: dataset.cases.length,
    answered: 0,
    rejected: 0,
    correct: 0,
    wrong: [],
  };
  for (const item of dataset.cases) {
    try {
      const answer = await suggestLocatorRepair(provider, {
        locator: item.locator,
        errorText: '',
        snapshot: item.snapshot,
      });
      result.answered += 1;
      const got = answer.status === 'suggested' ? answer.suggestedLocator : null;
      const right =
        item.expectedLocator === null || got === null
          ? item.expectedLocator === got
          : normalise(item.expectedLocator) === normalise(got);
      if (right) result.correct += 1;
      else result.wrong.push(item.name);
    } catch {
      result.rejected += 1;
      result.wrong.push(item.name);
    }
  }
  return result;
}

const percent = (part: number, whole: number): string =>
  whole === 0 ? 'n/a' : `${((part / whole) * 100).toFixed(1)}%`;

/** One line for the run metrics. It always says whether the labels were reviewed by a person. */
export function summariseEvaluation(report: EvaluationReport): string {
  const f = report.failureAnalysis;
  const t = report.testGeneration;
  const l = report.locatorRepair;
  const labels = report.labelsReviewed
    ? 'labels reviewed by a person'
    : 'labels NOT yet reviewed by a person';
  return (
    `provider ${report.provider}, ${labels}. ` +
    `Failure analysis ${String(f.correct)}/${String(f.total)} correct (${percent(f.correct, f.total)}; rule-based baseline ${String(f.baselineCorrect)}/${String(f.total)}). ` +
    `Test generation covered ${String(t.covered)}/${String(t.criteria)} criteria (${String(t.rejected)} rejected). ` +
    `Locator repair ${String(l.correct)}/${String(l.total)} correct (${String(l.rejected)} rejected).`
  );
}

export function renderEvaluation(report: EvaluationReport): string {
  const f = report.failureAnalysis;
  const t = report.testGeneration;
  const l = report.locatorRepair;
  const lines = [
    '# AI evaluation',
    '',
    `Generated by \`npm run ai:eval\` on ${report.generatedAt.slice(0, 10)} with provider **${report.provider}**.`,
    '',
    report.labelsReviewed
      ? 'The labels in `evaluation/*.json` have been reviewed by a person.'
      : '**The labels in `evaluation/*.json` have NOT been reviewed by a person yet.** Treat these numbers as provisional.',
    '',
    '| Task | Result | Notes |',
    '| --- | --- | --- |',
    `| Failure analysis | ${String(f.correct)}/${String(f.total)} correct (${percent(f.correct, f.total)}) | rule-based baseline: ${String(f.baselineCorrect)}/${String(f.total)}; rejected answers: ${String(f.rejected)} |`,
    `| Test generation | ${String(t.covered)}/${String(t.criteria)} criteria covered (${percent(t.covered, t.criteria)}) | requirements accepted: ${String(t.accepted)}/${String(t.requirements)}; rejected: ${String(t.rejected)} |`,
    `| Locator repair | ${String(l.correct)}/${String(l.total)} correct (${percent(l.correct, l.total)}) | rejected answers: ${String(l.rejected)} |`,
    '',
  ];
  if (f.wrong.length > 0) {
    lines.push(
      '## Failure analysis: cases it got wrong',
      '',
      '| Case | Expected | Got |',
      '| --- | --- | --- |',
    );
    for (const w of f.wrong) lines.push(`| ${w.name} | ${w.expected} | ${w.got} |`);
    lines.push('');
  }
  if (l.wrong.length > 0)
    lines.push('## Locator repair: cases it got wrong', '', ...l.wrong.map((n) => `- ${n}`), '');
  lines.push(
    '## How to read this',
    '',
    '- Accuracy is measured against human labels, not against the rule-based classifier.',
    '- The offline provider applies the same rules as the baseline, so its failure-analysis score equals the baseline score by construction. It shows what the rules can and cannot do, not how good an AI model is. A hosted provider run is needed for that.',
    '- Test-generation coverage is a structural measure (does every criterion have a case). It does not judge whether the cases are good.',
    '- The evaluation sets are small. Treat the percentages as a smoke test of the pipeline, not as a benchmark.',
    '',
  );
  return lines.join('\n');
}
