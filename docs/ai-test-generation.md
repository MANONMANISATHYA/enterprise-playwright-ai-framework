AI requirement-to-test generation
`npm run testcases:generate -- requirements\checkout-and-login.md` reads a requirements file, asks the
AI provider for test cases per requirement and saves each answer as a pending proposal. A person
reviews it (`npm run ai -- show|approve|reject`). `npm run testcases:export` then writes
`docs/approved-test-cases.md` from approved proposals only.
The output is data and a document, never code. Nothing writes, edits or runs a test.
Requirements format
Lines like `REQ-001: Title`, each followed by lines like `AC1: criterion text`. Markdown markers (`## ` and `- `) are allowed but not needed. The criteria are the source of truth.
Checks on every answer (before anything is saved)
The answer must be one JSON object that passes the zod schema (type, area, priority, tags from the
project's own tag list, non-empty steps and expected results).
Every test case must point to criteria that exist in that requirement. An invented criterion id rejects the answer.
Titles must be unique.
Steps and expected results that look like code (`await page.…`, `expect(…)`, `=>` and similar) reject the answer.
Criteria that no test case covers are listed in the proposal (`uncovered`) and printed. They are not hidden.
Rejected answers are skipped with the reason printed. They are never saved.
What goes to the provider
Only the requirement id, title and criteria text, with secrets masked and prompt markers removed.
The offline provider (default) sends nothing anywhere.
What the offline provider proves, and what it does not
It turns each criterion into one test case skeleton using keyword rules (negative, boundary, api or ui).
It covers every criterion by construction. The cases are thin: steps and expected results restate the
criterion. That shows the pipeline (parse, mask, validate, trace, review, export) works without a key.
It does not show good test design. Design quality needs a hosted provider, and every result still needs a person.
Limits
One proposal per requirement; the person approves or rejects the whole set.
The hosted path is covered by unit tests with a fake provider, not a live call.
Approved cases are a document to automate by hand. There is no code generation by design.
