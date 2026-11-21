import { classifyFailure } from '../../src/reporting/failures';
import { computeMetrics, type Report } from '../../src/reporting/metrics';
import { expect, test } from '../../src/fixtures';

// The error texts below are copied from real failures seen while building this project.
const BROWSER_MISSING =
  "browserType.launch: Executable doesn't exist at C:\\Users\\x\\ms-playwright\\chromium_headless_shell-1254\\chrome-headless-shell.exe";
const ELEMENT_NOT_FOUND =
  'Error: expect(locator).toContainText(expected) failed\n\nLocator: getByTestId(\'error\')\nExpected substring: "Last Name is required"\nTimeout: 5000ms\nError: element(s) not found';
const SCHEMA_DIFF =
  'Error: expect(received).toEqual(expected) // deep equality\n\n- Expected  -  1\n+ Received  + 10';
const SCHEMA_MISMATCH = 'Response does not match the schema:\n  - price: Required';

test.describe('failure classification @unit', () => {
  test('real error texts map to the expected categories', () => {
    expect(classifyFailure(BROWSER_MISSING)).toBe('environment');
    expect(classifyFailure(ELEMENT_NOT_FOUND)).toBe('element-not-found');
    expect(classifyFailure(SCHEMA_DIFF)).toBe('assertion-mismatch');
    expect(classifyFailure(SCHEMA_MISMATCH)).toBe('contract');
  });

  test('a timeout without a more specific cause is a timeout', () => {
    expect(classifyFailure('Test timeout of 30000ms exceeded.')).toBe('timeout');
  });

  test('colour codes are ignored and unmatched text is unknown', () => {
    const coloured = `${String.fromCharCode(27)}[31mstrict mode violation${String.fromCharCode(27)}[39m: getByRole resolved to 2 elements`;

    expect(classifyFailure(coloured)).toBe('locator-ambiguous');
    expect(classifyFailure('something unexpected')).toBe('unknown');
  });
});

// Hand-written report: it exercises the counting rules and is not a real run.
const report: Report = {
  stats: { startTime: '2026-01-01T00:00:00.000Z', duration: 9000 },
  suites: [
    {
      title: 'a.spec.ts',
      specs: [
        {
          title: 'fast',
          tests: [{ status: 'expected', results: [{ status: 'passed', duration: 100 }] }],
        },
        {
          title: 'slow',
          tests: [{ status: 'expected', results: [{ status: 'passed', duration: 5000 }] }],
        },
        {
          title: 'flaky',
          tests: [
            {
              status: 'flaky',
              results: [
                { status: 'failed', duration: 50, error: { message: 'x' } },
                { status: 'passed', duration: 60 },
              ],
            },
          ],
        },
        {
          title: 'broken',
          tests: [
            {
              status: 'unexpected',
              results: [{ status: 'failed', duration: 70, error: { message: ELEMENT_NOT_FOUND } }],
            },
          ],
        },
        { title: 'skipped', tests: [{ status: 'skipped', results: [{ status: 'skipped' }] }] },
      ],
    },
  ],
};

test.describe('run metrics @unit', () => {
  test('counts outcomes and uses the reported duration', () => {
    const metrics = computeMetrics(report);

    expect(metrics).toMatchObject({
      total: 5,
      passed: 2,
      failed: 1,
      flaky: 1,
      skipped: 1,
      durationMs: 9000,
    });
  });

  test('lists the slowest tests first and leaves skipped ones out', () => {
    const names = computeMetrics(report, 2).slowest.map((s) => s.name);

    expect(names).toEqual(['a.spec.ts > slow', 'a.spec.ts > fast']);
  });

  test('records the category and first line of each failure', () => {
    const metrics = computeMetrics(report);

    expect(metrics.failureCategories['element-not-found']).toBe(1);
    expect(metrics.failures[0]).toMatchObject({
      name: 'a.spec.ts > broken',
      category: 'element-not-found',
    });
  });
});
