ADR-004: AI layer is optional, offline by default, and proposal-only
Status: accepted
Context
The framework should show AI-assisted quality work (failure analysis, test-case generation, locator repair
suggestions) without making the core suite depend on an AI provider, and without letting generated output
change tests or run on its own.
Decision
All AI code lives in `src/ai/` and `tools/ai.ts`. The core suite, fixtures, pages, API client and reporting
never import it. A unit test scans the code and fails if that changes.
A provider is an interface that returns text. The default provider is offline and deterministic. A hosted
provider is used only when `AI_PROVIDER=anthropic` and a key and model are set in `.env`.
Provider output is validated against a schema before use. Invalid output is rejected, not repaired silently.
Everything the AI layer produces is a proposal: a JSON file with status `pending`. A person approves or
rejects it with `npm run ai`. Approval only records the decision. Nothing is applied or executed automatically.
AI code may not use `eval`, `new Function`, `child_process` or dynamic `import()`. A unit test scans for them.
Evidence is passed through `redact()` before it is sent to a provider.
Consequences
With no key, the whole repository, including the AI layer, runs and is tested offline.
Results from a hosted provider are only as good as the evaluation set that measures them. Quality numbers
are recorded only from real runs.
Applying an approved proposal is a manual step by design.
