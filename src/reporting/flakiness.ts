/**
 * Turns a Playwright JSON report from a repeated run into one verdict per test.
 * stable  = every run passed
 * flaky   = some runs passed and some failed (includes pass-on-retry)
 * failing = every run failed
 */

export interface RunResult {
  status: string;
}

export interface TestEntry {
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
  suites: Suite[];
}

export type Verdict = 'stable' | 'flaky' | 'failing';

export interface TestSummary {
  name: string;
  runs: number;
  passed: number;
  failed: number;
  verdict: Verdict;
}

const FAILED_STATUSES = new Set(['failed', 'timedOut', 'interrupted']);

export function summariseRuns(report: Report): TestSummary[] {
  // Repeats may be reported as separate entries with the same name, so add them up by name.
  const totals = new Map<string, { passed: number; failed: number }>();

  const walk = (suites: Suite[], parents: string[]): void => {
    for (const suite of suites) {
      const path = [...parents, suite.title];
      for (const spec of suite.specs ?? []) {
        const name = [...path, spec.title].join(' > ');
        const tally = totals.get(name) ?? { passed: 0, failed: 0 };
        for (const test of spec.tests ?? []) {
          for (const result of test.results ?? []) {
            if (result.status === 'passed') tally.passed += 1;
            else if (FAILED_STATUSES.has(result.status)) tally.failed += 1;
          }
        }
        totals.set(name, tally);
      }
      walk(suite.suites ?? [], path);
    }
  };
  walk(report.suites, []);

  const summaries: TestSummary[] = [];
  for (const [name, { passed, failed }] of totals) {
    const runs = passed + failed;
    if (runs === 0) continue; // skipped tests have nothing to judge
    const verdict: Verdict = failed === 0 ? 'stable' : passed === 0 ? 'failing' : 'flaky';
    summaries.push({ name, runs, passed, failed, verdict });
  }
  return summaries;
}
