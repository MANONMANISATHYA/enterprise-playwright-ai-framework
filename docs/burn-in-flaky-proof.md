# Burn-in proof: flaky-login defect

Run on 2026-11-04 with `set DEFECT=flaky-login&& npm run burn-in` (5 repeats, self-hosted app).
Tests judged: 45. Stable: 40. Not stable: 5.

| Test                                                                                  | Runs | Passed | Failed | Verdict |
| ------------------------------------------------------------------------------------- | ---- | ------ | ------ | ------- |
| ui\cart.spec.ts > cart @regression > added product appears in the cart                | 5    | 0      | 5      | failing |
| ui\checkout.spec.ts > checkout @regression > missing first name is rejected           | 5    | 4      | 1      | flaky   |
| ui\checkout.spec.ts > checkout @regression > missing last name is rejected            | 5    | 3      | 2      | flaky   |
| ui\inventory.spec.ts > inventory @regression > sorting Z to A reverses the name order | 5    | 4      | 1      | flaky   |
| ui\login.spec.ts > login @smoke > standard user reaches the product list              | 5    | 3      | 2      | flaky   |

The defect fails every third successful login, so which tests are hit depends on run order.
`cart` showing "failing" (0 of 5) is an ordering effect, not a deterministic failure.
