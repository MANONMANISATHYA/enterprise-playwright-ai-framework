How AI quality is measured
`npm run ai:eval` runs the configured provider on:
Task Data Measure
Failure analysis `evaluation/failure-analysis.json` (14 error texts with a human label) share of answers whose category equals the label, next to the rule-based classifier on the same cases
Test generation `requirements/checkout-and-login.md` (13 criteria) share of criteria that have at least one test case; rejected requirements are counted
Locator repair `evaluation/locator-repair.json` (4 cases) share of cases where the suggestion equals the expected locator, or correctly says "none"
Rejected provider answers count as wrong, never as skipped.
Labels
Every dataset records who labelled it and whether a person has reviewed it (`"reviewed": false`).
Until you set it to `true`, the report and the metrics line say labels NOT yet reviewed by a person.
Four failure cases are copied from real runs of this project; the rest are typical Playwright messages
written from knowledge of the tool. The `source` field says which is which.
What the numbers mean
With the offline provider, failure-analysis accuracy equals the baseline by construction.
A gap the evaluation found: the rules do not recognise `ETIMEDOUT`, so that case is classified as `unknown`.
14 cases is a smoke test, not a benchmark. Do not quote the percentage as a model quality score.
To measure an AI model, set `AI_PROVIDER=anthropic` with a key and model in `.env`, run `npm run ai:eval`, and compare with the offline row.
