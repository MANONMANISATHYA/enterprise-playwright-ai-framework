# Limitations

- The target apps are public third-party sites and can change or go down.
- Chromium only so far.
- Login runs through the UI for now (storageState comes in Step 7).
- Parallel-safety checks are weak evidence until tests create data.
- The `no-restricted-syntax` rule blocks `.locator()` in tests but not every raw-selector route.

- The self-hosted app mirrors the SauceDemo test-ID contract with synthetic data. Defect-detection results describe the seeded defect set only, not general bug-finding ability.
- The defects were written by the same person who wrote the tests, so the result is a coverage check, not an independent measurement.
- npm audit reports moderate findings in dev dependencies; not yet triaged.

API tests import src/api/schemas and src/api/validate directly. This is deliberate: contracts are data, not behaviour. All actions still go through fixtures.
