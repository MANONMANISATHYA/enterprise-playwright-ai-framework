ADR-003: Test data builders; no shared login session or API seeding for UI tests
Status: accepted
Context
Step 7 was planned to add data factories, API-based setup for UI tests, and a
per-worker `storageState` login. Looking at the target app changed two of those.
The app keeps the cart, shipping details and login state in a server-side
session. A saved `storageState` would point every test in a worker at the
same session, so carts would leak between tests and the logout test would end
the session for the tests after it.
The UI target can also be the public SauceDemo site. It has no API for
seeding a cart, so API setup would only work against the local app.
Decision
Add dependency-free data builders (`src/data/factories.ts`). Each call
returns valid data, with unique values where uniqueness matters, and accepts
overrides so a test names only the field it is about.
Keep the per-test UI login (the `inventoryPage` fixture). It costs about a
second per test and keeps every test isolated.
Do not share a login session across tests and do not add an API
seeding endpoint yet.
Consequences
UI tests stay isolated and run unchanged on both targets.
The UI suite is slower than it could be. Revisit if run time becomes a
problem: the fix would be a session per test created through an API login
endpoint that sets the cookie, not a shared one.
Builders are covered by fast `@unit` tests that need no browser or server.
