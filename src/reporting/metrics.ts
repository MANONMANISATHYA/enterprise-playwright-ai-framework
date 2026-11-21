import { classifyFailure, FAILURE_CATEGORIES, stripAnsi, type FailureCategory } from './failures';

/** Turns one Playwright JSON report into run metrics: totals, duration, slowest tests, failure categories. */

export interface RunResult {
  status: string;
  duration?: number;
  error?: { message?: string };
  errors?: { message?: string }[];
}

export interface TestEntry {
  status?: string;
  results?: RunResult[];
}

export interface Spec {
  title: string;
  tests?: TestEntry[];
}

export interface Suite {
  title: string;
  specs?: Spec[];
  suites?: Suite[];
}

export interface Report {
  stats?: { startTime?: string; duration?: number };
  suites: Suite[];
}

export interface FailureRecord {
  name: string;
  category: FailureCategory;
  message: string;
}

export interface RunMetrics {
  startTime: string;
  total: number;
  passed: number;
  failed: number;
  flaky: number;
  skipped: number;
  durationMs: number;
  slowest: { name: string; durationMs: number }[];
  failureCategories: Record<FailureCategory, number>;
  failures: FailureRecord[];
}

type Outcome = 'passed' | 'failed' | 'flaky' | 'skipped';

function outcomeOf(test: TestEntry): Outcome {
  switch (test.status) {
    case 'expected':
      return 'passed';
    case 'unexpected':
      return 'failed';
    case 'flaky':
      return 'flaky';
    case 'skipped':
      return 'skipped';
  }
  const last = test.results?.at(-1)?.status;
  if (last === 'passed') return 'passed';
  if (last === 'skipped' || last === undefined) return 'skipped';
  return 'failed';
}

function failureMessage(test: TestEntry): string {
  const failing = [...(test.results ?? [])].reverse().find((r) => r.status !== 'passed');
  const raw = failing?.error?.message ?? failing?.errors?.[0]?.message ?? '';
  const first =
    stripAnsi(raw)
      .split('\n')
      .find((line) => line.trim() !== '') ?? '';
  return first.trim().slice(0, 200);
}

export function computeMetrics(report: Report, topN = 5): RunMetrics {
  const counts: Record<Outcome, number> = { passed: 0, failed: 0, flaky: 0, skipped: 0 };
  const categories = Object.fromEntries(FAILURE_CATEGORIES.map((c) => [c, 0])) as Record<
    FailureCategory,
    number
  >;
  const durations: { name: string; durationMs: number }[] = [];
  const failures: FailureRecord[] = [];

  const walk = (suites: Suite[], parents: string[]): void => {
    for (const suite of suites) {
      const path = [...parents, suite.title];
      for (const spec of suite.specs ?? []) {
        const name = [...path, spec.title].join(' > ');
        for (const test of spec.tests ?? []) {
          const outcome = outcomeOf(test);
          counts[outcome] += 1;
          if (outcome !== 'skipped') {
            durations.push({ name, durationMs: test.results?.at(-1)?.duration ?? 0 });
          }
          if (outcome === 'failed') {
            const fullText = [...(test.results ?? [])]
              .reverse()
              .map((r) => r.error?.message ?? r.errors?.[0]?.message ?? '')
              .find((m) => m !== '');
            const category = classifyFailure(fullText ?? '');
            categories[category] += 1;
            failures.push({ name, category, message: failureMessage(test) });
          }
        }
      }
      walk(suite.suites ?? [], path);
    }
  };
  walk(report.suites, []);

  return {
    startTime: report.stats?.startTime ?? new Date().toISOString(),
    total: counts.passed + counts.failed + counts.flaky + counts.skipped,
    ...counts,
    durationMs: report.stats?.duration ?? durations.reduce((sum, d) => sum + d.durationMs, 0),
    slowest: [...durations].sort((a, b) => b.durationMs - a.durationMs).slice(0, topN),
    failureCategories: categories,
    failures,
  };
}
