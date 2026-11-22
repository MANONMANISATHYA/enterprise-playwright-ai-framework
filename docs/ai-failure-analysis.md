AI failure analysis
`npm run analyse` reads the failed tests in `reports/results.json` (or a report path you pass), asks the
AI provider to analyse each one and saves every answer as a pending proposal in `ai/proposals/`.
Nothing is applied, edited or re-run. A person reviews each proposal with `npm run ai -- list|show|approve|reject`.
What goes to the provider
Only the error text of a failed test and its name. Colour codes are removed, secrets are masked
(`redact`, plus the exact values of `DEMO_PASSWORD` and `ANTHROPIC_API_KEY`), the text is shortened to
1500 characters, and the prompt markers are stripped so error text cannot close the data block.
With `AI_PROVIDER=offline` (the default) nothing leaves the machine.
With `AI_PROVIDER=anthropic` the tool prints how many failures are being sent before it sends them.
What comes back
One JSON object checked by a zod schema: `category` (same list as the rule-based classifier), `summary`,
`likelyCause`, `suggestedNextStep`, `confidence`. Anything that is not valid JSON, has an unknown
category or misses a field is rejected and skipped, never saved. Extra fields are dropped.
Baseline comparison
Each proposal records the rule-based category (`baselineCategory`) next to the AI category and whether
they agree (`agreesWithBaseline`). A difference is saved and shown as `DIFFERS`; it is never hidden.
What the offline provider proves, and what it does not
The offline provider applies the same rules as the baseline classifier and adds fixed advice text, so it
agrees with the baseline by construction. That shows the pipeline (extract, mask, validate, save, review)
works without a key. It says nothing about how good an AI model is. A measured quality number needs a
labelled evaluation set and a real provider run (a later step).
Limits
Analyses at most 10 failures per run, to keep hosted calls small.
Uses the error text only. It does not read traces, screenshots or the page.
The hosted provider path is covered by unit tests with a fake network call, not by a live call.
