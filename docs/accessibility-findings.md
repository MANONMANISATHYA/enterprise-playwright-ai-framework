# Accessibility findings

Scanner: axe-core via @axe-core/playwright 4.14.0, WCAG 2.0/2.1 A and AA rules.
Scope: four pages of the self-hosted app (login, product list, cart, checkout form).

## First scan (2026-11-04)

- Login, cart and checkout form: no violations detected.
- Product list: 1 violation. Rule `select-name`, impact critical: the sort dropdown had no accessible name.

## Fix

Added `aria-label="Sort products"` to the sort dropdown. The scan then passed on all four pages.
The `a11y-select-unlabelled` defect removes the label and is caught by the product-list scan.

## Limits

Automated scans find only part of the real accessibility problems. Keyboard use, focus order,
colour contrast on dynamic states and screen-reader wording still need manual checks.
The scan does not run against the public SauceDemo site, which is not ours to fix.
