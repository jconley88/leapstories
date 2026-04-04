# Deviations: 60-second minimum dwell time

## 1. Dwell threshold moved to session storage (`pagegap_dwell`)

**Plan:** Hard-coded `60_000` comparison in content.js.

**Actual:** The threshold is read from `chrome.storage.session` key `pagegap_dwell`, defaulting to `60_000` if not set. This was a post-plan follow-up request to allow adjusting the threshold during manual testing via DevTools.

## 2. Test 5 timestamp not backdated

**Plan:** Backdate Test 5's snapshot timestamp to `Date.now() - 120_000` to bypass the dwell check.

**Actual:** Tests set `pagegap_dwell: 0` at the start of the test run to disable the dwell check entirely. Test 5 uses `Date.now()` (no backdating needed). This is cleaner — tests opt out of the dwell check globally rather than faking timestamps per test.

## 3. Tests restore `pagegap_dwell` after `clearStorageSession`

**Plan:** Did not mention this.

**Actual:** After each `clearStorageSession()` call (Tests 6 and 7), `pagegap_dwell: 0` is re-set to keep subsequent tests from hitting the default 60s threshold.
