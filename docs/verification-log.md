# Verification log

| Date       | Check                   | Command                                      | Result                          |
| ---------- | ----------------------- | -------------------------------------------- | ------------------------------- |
| 2026-10-31 | Typecheck, lint, format | npm run check                                | clean                           |
| 2026-10-31 | UI suite                | npm test                                     | 6 passed                        |
| 2026-10-31 | Tag filter              | npx playwright test --grep @smoke            | 4 passed                        |
| 2026-10-31 | 1 vs 4 workers          | --workers=1 / --workers=4                    | 6 passed each                   |
| 2026-10-31 | Repeat run              | --repeat-each=5                              | 30 passed                       |
| 2026-10-31 | Guardrail proof         | git commit of bad test                       | rejected by hook                |
| 2026-10-31 | Raw locator blocked     | npm run lint (added page.locator in a spec)  | failed: no-restricted-syntax    |
| 2026-10-31 | Assertion sensitivity   | changed expected text to "xyz"               | 1 test failed with clear diff   |
| 2026-10-31 | Direct import blocked   | npm run lint (added @playwright/test import) | failed: no-restricted-imports   |
| 2026-10-31 | Locator isolation       | renamed username locator in LoginPage        | [add your result from the redo] |

Step 6 (API layer): npm run test:api → 16 passed; npm test → 34 passed; npm run defects → 15 of 15 caught (8 UI, 7 API). Commits d77e0b8, 94824b7.

Step 7 (data builders): npm run test:unit → 4 passed; npm test → 41 passed; npm run defects → 15 of 15 caught.

Step 8 (flakiness): npm run test:unit → 8 passed; npm run burn-in → 45 stable of 45; with flaky-login injected → 5 not stable (see docs/burn-in-flaky-proof.md). Commit b787790.

Step 9 (accessibility): first scan found 1 critical violation (select-name, product list); fixed with aria-label; test:a11y → 4 passed; defects → 16 of 16 caught.
