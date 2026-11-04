import { summariseRuns, type Report, type Spec } from '../../src/reporting/flakiness';
import { expect, test } from '../../src/fixtures';

// The reports below are hand-written inputs that exercise the verdict rules.
// They are not results from any real run.
const result = (status: string): { status: string } => ({ status });
const spec = (title: string, ...statuses: string[]): Spec[] => [
  { title, tests: [{ results: statuses.map(result) }] },
];

test.describe('flakiness verdicts @unit', () => {
  test('all passes are stable, all failures are failing, a mix is flaky', () => {
    const report: Report = {
      suites: [
        {
          title: 'a.spec.ts',
          specs: [
            ...spec('stable', 'passed', 'passed', 'passed'),
            ...spec('broken', 'failed', 'timedOut'),
            ...spec('mixed', 'passed', 'failed', 'passed'),
          ],
        },
      ],
    };

    const verdicts = Object.fromEntries(summariseRuns(report).map((s) => [s.name, s.verdict]));

    expect(verdicts).toEqual({
      'a.spec.ts > stable': 'stable',
      'a.spec.ts > broken': 'failing',
      'a.spec.ts > mixed': 'flaky',
    });
  });

  test('a pass on retry counts as flaky', () => {
    const report: Report = {
      suites: [{ title: 'a.spec.ts', specs: spec('retry', 'failed', 'passed') }],
    };

    expect(summariseRuns(report)[0]?.verdict).toBe('flaky');
  });

  test('repeats reported as separate entries are added together', () => {
    const report: Report = {
      suites: [
        {
          title: 'a.spec.ts',
          specs: [...spec('same', 'passed'), ...spec('same', 'failed')],
        },
      ],
    };

    const [summary] = summariseRuns(report);

    expect(summary).toMatchObject({ runs: 2, passed: 1, failed: 1, verdict: 'flaky' });
  });

  test('skipped tests are left out and nested suites are named in full', () => {
    const report: Report = {
      suites: [
        {
          title: 'a.spec.ts',
          suites: [{ title: 'group', specs: spec('inner', 'passed') }],
          specs: spec('skipped', 'skipped'),
        },
      ],
    };

    expect(summariseRuns(report).map((s) => s.name)).toEqual(['a.spec.ts > group > inner']);
  });
});
