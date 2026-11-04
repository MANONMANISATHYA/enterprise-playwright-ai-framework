Flakiness policy
A flaky test passes and fails on the same code. It is treated as a defect in the
test suite, not as noise.
How we find flakes
`npm run burn-in` runs the whole suite 5 times (or `npm run burn-in -- 10` for 10)
against the self-hosted app and lists every test whose runs disagree.
Run it before merging a change that adds or edits tests, and on a schedule in CI later.
Results are written to `docs/burn-in-results.md`. Only real runs are recorded.
Rules
A test that fails once in a burn-in is investigated the same day. Retrying until it passes is not a fix.
Look at the trace and screenshot first (`npx playwright show-trace <trace.zip>`) before changing any code.
If the cause is not fixed within a day, tag the test `@quarantine`. Quarantined tests are skipped by
`npm test` and `npm run burn-in`, and run alone with `npm run test:quarantine`.
A quarantine tag needs a comment above the test with an owner, a date and a reason.
Nothing stays quarantined for more than 14 days: fix it or delete it.
A test is never quarantined to make a failing run green when the product is actually broken.
Retries exist only in CI (2). They are a safety net and every retried pass is reported as flaky.
Proof that detection works
The target app has a `flaky-login` defect that fails every third successful login. Running
`DEFECT=flaky-login` burn-in must report the login-dependent tests as flaky; see `docs/burn-in-results.md`.
