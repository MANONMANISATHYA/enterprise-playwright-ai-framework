# Contributing

## Before every commit

`npm run check` must pass. A pre-commit hook runs lint-staged automatically.

## Test rules (enforced by lint)

- No `waitForTimeout`; use web-first assertions.
- No `force: true`; fix the locator or the app state instead.
- No `test.skip` or `test.only` committed.
- Every test needs at least one assertion.
- Prefer `getByRole`, `getByLabel` and `getByTestId`. Avoid CSS/XPath.

## Never

- Commit `.env` or any credentials.
- Edit a test only to make a failure pass. Find out whether it is an app, test or environment problem first.

## Decisions

Significant choices are recorded in `docs/adr/`.
