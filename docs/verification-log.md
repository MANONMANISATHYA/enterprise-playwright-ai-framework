Verification log
Date Check Command Result
2026-10-31 Typecheck, lint, format npm run check clean
2026-10-31 UI suite npm test 6 passed
2026-10-31 Tag filter npx playwright test --grep @smoke 4 passed
2026-10-31 1 vs 4 workers --workers=1 / --workers=4 6 passed each
2026-10-31 Repeat run --repeat-each=5 30 passed
2026-10-31 Guardrail proof git commit of bad test rejected by hook
2026-10-31 Raw locator blocked npm run lint (added page.locator in a spec) failed: no-restricted-syntax
2026-10-31 Assertion sensitivity changed expected text to "xyz" 1 test failed with clear diff
2026-10-31 Direct import blocked npm run lint (added @playwright/test import) failed: no-restricted-imports
2026-10-31 Locator isolation renamed username locator in LoginPage result not recorded; check not re-run (see docs/limitations.md)
Later steps
Step 6 (API layer): `npm run test:api` -> 16 passed; `npm test` -> 34 passed; `npm run defects` -> 15 of 15 caught (8 UI, 7 API). Commits d77e0b8, 94824b7.
Step 7 (data builders): `npm run test:unit` -> 4 passed; `npm test` -> 41 passed; `npm run defects` -> 15 of 15 caught.
Step 8 (flakiness): `npm run test:unit` -> 8 passed; `npm run burn-in` -> 45 stable of 45; with `flaky-login` injected -> 5 not stable (see `docs/burn-in-flaky-proof.md`). Commit b787790.
Step 9 (accessibility): first scan found 1 critical violation (`select-name`, product list); fixed with an aria-label; `npm run test:a11y` -> 4 passed; `npm run defects` -> 16 of 16 caught.
Post-upgrade (2026-11-18): `npm test` -> 45 passed; `npm run test:a11y` -> 4 passed; `npm run defects` -> 16 of 16 caught; CI green on main.
Step 10 (metrics, 2026-11-21): `npm test` -> 51 passed; `npm run metrics` wrote `docs/metrics-latest.md` and a run history. Commit 053e948.
Step 12 (AI foundation, 2026-11-22): `npm run test:unit` -> 26 passed; `npm test` -> 63 passed; `npm run ai -- list` -> "AI provider: offline. Proposals: 0." Commit 3aba127; CI #27 green.
Step 13 (AI failure analysis, 2026-11-22): `npm run test:unit` -> 34 passed. With `DEFECT=api-missing-field`, `npm test` -> 5 failed, 66 passed; `npm run analyse` -> 5 proposals, all agreeing with the rule-based baseline (by construction for the offline provider); 1 approved and 1 rejected by hand; defect cleared, `npm test` -> 71 passed. Commit 3449a15; CI #28 green.
Step 14 (AI test generation, 2026-11-22): `npm run test:unit` -> 47 passed; `npm run testcases:generate` -> 3 proposals, 13 test cases for 13 criteria, none uncovered; 1 approved and exported, 1 rejected and left out of the export; `npm test` -> 84 passed. An earlier run failed 4 tests because the requirements file had lost its markdown markers; the parser now accepts the file with or without them. Commit 5d8b430; CI #30 green.
Step 15 (AI locator repair and evaluation, 2026-11-22): `npm run test:unit` -> 63 passed; `npm run ai:repair` on the invented sample page -> `getByTestId('login-button')` replaced by `getByTestId('sign-in-button')` (low confidence); `npm run ai:eval` (offline provider, labels not yet reviewed by a person) -> failure analysis 13/14 correct with the rule-based baseline also 13/14, test generation 13/13 criteria covered, locator repair 4/4; `npm test` -> 100 passed. The one miss is `ETIMEDOUT`, which the classifier does not recognise. Commit 4ffae7d; CI #31 green. A lint error in a new test title was found by `npm run check` and fixed in the next commit.
README and docs (2026-11-22): `npm run check` clean; `npm run test:unit` -> 63 passed. Commit aad19af; CI #32 green.
