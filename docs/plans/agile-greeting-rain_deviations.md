# Deviations: Replace Live HN Requests with Synthetic Fixtures in Tests

Plan: `docs/plans/agile-greeting-rain.md`

## Deviation 1: Route handler uses a flag instead of unroute/re-route

**Plan:** Test 12 would use `context.unroute()` + `context.route()` to swap the route handler for the smoke test, or use a flag variable.

**Actual:** Used the flag approach (`useRealFixtures` boolean). Simpler, avoids potential race conditions with unrouting/re-routing mid-test.

## Deviation 2: `waitForTimeout(500)` kept alongside `waitForSelector`

**Plan:** Replace `waitForTimeout` entirely with `waitForSelector` / `waitForFunction`, with a fallback to short timeouts only if needed.

**Actual:** Used `waitForSelector` for DOM readiness, but kept a brief `waitForTimeout(500)` after it to allow the async `chrome.storage.session.set()` call in the content script to complete. The storage write happens after DOM parsing and has no selector to wait on.

## Deviation 3: Assertion count increased from 17 to 24

**Plan:** Mentioned strengthening assertions with known IDs but didn't specify the exact new count.

**Actual:** Added 7 new assertions beyond the original 17: exact ID matching for page 1 snapshot (test 1), exact gap story ID verification (test 5), and 5 assertions for the new smoke test (test 12).

## Deviation 4: No `context.unroute()` cleanup

**Plan:** Mentioned temporarily swapping the route handler for the smoke test.

**Actual:** Simply toggled `useRealFixtures = true` before test 12 and `useRealFixtures = false` after. Since test 12 is the last test, the reset is defensive but the unroute is unnecessary.

## Deviation 5: Synthetic fixtures reduced to 5 stories per page

**Plan:** Used 30 stories per page (matching real HN) for synthetic fixtures.

**Actual:** Reduced to 5 stories per page via a `STORIES_PER_PAGE` constant. 5 is sufficient for all test scenarios (3-story gap simulation, 3-story duplicate overlap) and makes the synthetic HTML much smaller. The smoke test (test 12) still validates against full 30-story real fixtures.

## Deviation 6: Real fixture data extracted to `test/fixtures/index.js`

**Plan:** All test code in `test/test.js`.

**Actual:** Real fixture HTML reads and story ID arrays moved to `test/fixtures/index.js`, co-located with the HTML files. Test.js imports via `require("./fixtures")`. Keeps fixture-specific data separate from test logic.

## Deviation 7: Per-test timing added to test output

**Plan:** No mention of timing output.

**Actual:** Added a `startTest()` helper that prints elapsed time for each test. Caught a bug where `page.waitForFunction()` had swapped arguments (`options` and `arg` reversed), causing test 5 to silently wait 30 seconds on Playwright's default timeout instead of the intended 5 seconds.
