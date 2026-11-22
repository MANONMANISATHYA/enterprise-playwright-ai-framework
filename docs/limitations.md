Limitations
The target apps are public third-party sites and can change or go down.
Chromium only so far.
Login runs through the UI in every test. A shared stored session was rejected on purpose (see ADR-003).
Parallel-safety checks are weak evidence until tests create data.
The `no-restricted-syntax` rule blocks `.locator()` in tests but not every raw-selector route.
The self-hosted app mirrors the SauceDemo test-ID contract with synthetic data. Defect-detection results describe the seeded defect set only, not general bug-finding ability.
The defects were written by the same person who wrote the tests, so the result is a coverage check, not an independent measurement.
npm audit reports moderate findings in dev dependencies; not yet triaged.
The "locator isolation" row in the verification log has no recorded result. The check was not re-run.
API tests import src/api/schemas and src/api/validate directly. This is deliberate: contracts are data, not behaviour. All actions still go through fixtures.
TypeScript is held below 7: Dependabot PR #4 tried to upgrade to 7.0.2, but typescript-eslint 8.72.2 requires TypeScript below 6.1 and npm refused the install. CI caught it before merge. Dependabot is told to skip TypeScript major updates until typescript-eslint supports 7.
AI layer
The offline AI handlers are rules and templates, not a language model. Their answers show that the pipeline works (extract, mask, validate, save, review), not that an AI model is good.
The hosted provider (`AI_PROVIDER=anthropic`) is covered by unit tests with a fake network call. It has never been called live from this repository, and there are no quality numbers for a hosted model.
The evaluation sets are small: 14 failure texts (4 copied from real runs, 10 typical Playwright messages), 4 locator cases with invented page snapshots, and 13 acceptance criteria. The labels were written by the AI assistant that helped build the project and must be reviewed by a person; each report says whether they have been. The percentages are a smoke test, not a benchmark.
The rule-based classifier does not recognise `ETIMEDOUT` (a connection timeout), so such failures are classified as `unknown`. The evaluation found this. It is not fixed, so that the evaluation set is not tuned to its own score.
Test generation checks that every criterion has a case and that cases point to real criteria. It does not judge whether the cases are good. The offline cases restate the criterion.
Locator-repair grounding proves the suggested test id or text exists in the supplied snapshot, not that it is the right element. A page can contain misleading text. Review is mandatory and nothing is applied automatically.
Failure analysis reads error text only. It does not read traces, screenshots or the page.
Proposals from real runs are committed in `ai/proposals/` as evidence. Pending ones were not reviewed.
CI does not run the AI evaluation. `npm run ai:eval` is run by hand.
