AI locator repair
`npm run ai:repair -- --locator "getByTestId('login-button')" --snapshot path\to\page.html --error "text"`
asks the AI provider for ONE replacement for a locator that no longer finds its element, and saves it as
a pending proposal (`kind: locator-repair`). The proposal shows the old and the new locator.
Nothing is written to a page object or a test. After `npm run ai -- show|approve|reject`, a person
applies the change by hand and re-runs the tests.
Checks on every answer
The answer must be JSON with a suggested locator, a strategy, a reason and a confidence, or `null` with a reason ("no safe suggestion").
The suggestion must be one plain `getByTestId`, `getByLabel`, `getByText`, `getByPlaceholder` or `getByRole(role, { name })` call with string arguments. CSS, XPath, chains, template strings and code are refused.
The strategy must match the locator.
The test id, label, text or name must appear in the snapshot you supplied. An invented one is refused.
The suggestion must differ from the failing locator.
What goes to the provider
The failing locator, the cleaned error text and the cleaned HTML snapshot (scripts, comments and input
values removed, secrets masked, shortened to 8000 characters). The offline provider sends nothing anywhere.
What the offline provider proves, and what it does not
It looks for the test id in the snapshot that shares the most words with the failing one (for example
`login-button` to `sign-in-button`). It only knows test ids and it is a word-overlap guess, not an AI.
It answers "none" when nothing is close or when the old id still exists.
Limits
Grounding proves the target exists on the page. It does not prove it is the right element. Review is mandatory.
Text inside the snapshot that looks like an instruction is treated as data, but a malicious page can still put a misleading test id in front of the model. That is why a person approves.
The sample page `evaluation/samples/login-page-renamed.html` is invented, not captured from a failure.
