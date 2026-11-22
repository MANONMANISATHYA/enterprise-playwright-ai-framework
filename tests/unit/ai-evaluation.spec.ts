import { readFileSync } from 'node:fs';
import {
  evaluateFailureAnalysis,
  evaluateLocatorRepair,
  evaluateTestGeneration,
  failureDatasetSchema,
  renderEvaluation,
  repairDatasetSchema,
  summariseEvaluation,
  type EvaluationReport,
} from '../../src/ai/evaluation';
import { createProvider, type AiProvider } from '../../src/ai/provider';
import { parseRequirements } from '../../src/ai/test-generation';
import { expect, test } from '../../src/fixtures';

const load = (file: string): unknown => JSON.parse(readFileSync(`evaluation/${file}`, 'utf8'));
const failures = failureDatasetSchema.parse(load('failure-analysis.json'));
const repairs = repairDatasetSchema.parse(load('locator-repair.json'));
const offline = createProvider({ AI_PROVIDER: 'offline' });

const alwaysTimeout: AiProvider = {
  name: 'fake',
  complete: () =>
    Promise.resolve(
      JSON.stringify({
        category: 'timeout',
        summary: 's',
        likelyCause: 'c',
        suggestedNextStep: 'n',
        confidence: 'low',
      }),
    ),
};
const garbage: AiProvider = { name: 'fake', complete: () => Promise.resolve('not json') };

test.describe('AI evaluation @unit', () => {
  test('the evaluation sets are valid and say who labelled them', () => {
    expect(failures.cases.length).toBeGreaterThanOrEqual(10);
    expect(repairs.cases.length).toBeGreaterThanOrEqual(3);
    expect(failures.labelledBy).toContain('human must review');
    expect(new Set(failures.cases.map((c) => c.name)).size).toBe(failures.cases.length);
  });

  test('a provider that always says timeout scores only the timeout cases', async () => {
    const result = await evaluateFailureAnalysis(alwaysTimeout, failures);
    const timeoutCases = failures.cases.filter((c) => c.expected === 'timeout').length;

    expect(result.answered).toBe(failures.cases.length);
    expect(result.correct).toBe(timeoutCases);
    expect(result.wrong).toHaveLength(failures.cases.length - timeoutCases);
  });

  test('rejected answers are counted and never scored as correct', async () => {
    const result = await evaluateFailureAnalysis(garbage, failures);

    expect(result.rejected).toBe(failures.cases.length);
    expect(result.correct).toBe(0);
  });

  test('the offline provider scores the same as the rule-based baseline', async () => {
    const result = await evaluateFailureAnalysis(offline, failures);

    expect(result.answered).toBe(failures.cases.length);
    expect(result.correct).toBe(result.baselineCorrect);
  });

  test('locator repair is scored against the expected locator, including "no suggestion"', async () => {
    const result = await evaluateLocatorRepair(offline, repairs);

    expect(result.total).toBe(repairs.cases.length);
    expect(result.correct + result.wrong.length).toBe(result.total);
    expect(result.rejected).toBe(0);
  });

  test('generation coverage is counted per criterion', async () => {
    const requirements = parseRequirements(
      readFileSync('requirements/checkout-and-login.md', 'utf8'),
    );

    const result = await evaluateTestGeneration(offline, requirements);

    expect(result).toEqual({
      requirements: 3,
      accepted: 3,
      rejected: 0,
      criteria: 13,
      covered: 13,
    });
  });

  test('the report always says whether the labels were reviewed', () => {
    const report: EvaluationReport = {
      generatedAt: '2026-01-01T00:00:00.000Z',
      provider: 'offline',
      labelsReviewed: false,
      failureAnalysis: {
        total: 10,
        answered: 10,
        rejected: 0,
        correct: 9,
        baselineCorrect: 9,
        wrong: [{ name: 'x', expected: 'a', got: 'b' }],
      },
      testGeneration: { requirements: 3, accepted: 3, rejected: 0, criteria: 13, covered: 13 },
      locatorRepair: { total: 4, answered: 4, rejected: 0, correct: 4, wrong: [] },
    };

    expect(summariseEvaluation(report)).toContain('labels NOT yet reviewed by a person');
    expect(summariseEvaluation(report)).toContain('9/10 correct (90.0%');
    expect(renderEvaluation(report)).toContain('NOT been reviewed');
    expect(summariseEvaluation({ ...report, labelsReviewed: true })).toContain(
      'labels reviewed by a person',
    );
  });
});
