# Limitations

- The target apps are public third-party sites and can change or go down.
- Chromium only so far.
- Login runs through the UI for now (storageState comes in Step 7).
- Parallel-safety checks are weak evidence until tests create data.
- The `no-restricted-syntax` rule blocks `.locator()` in tests but not every raw-selector route.
