# Plan: Replace Live HN Requests with Synthetic Fixtures in Tests

## Context

The automated test suite (`test/test.js`) navigates to live `news.ycombinator.com` pages. This makes tests slow (network latency + 2-3s timeouts), flaky (story rankings shift, HN may be slow/down), and impossible to run offline or in restricted CI environments. The goal is to serve deterministic synthetic HTML instead, while still exercising the full extension pipeline (content script injection, DOM parsing, storage, fetch-based gap detection, DOM injection).

## Approach: Playwright `context.route()` Interception

Use `context.route('https://news.ycombinator.com/**', handler)` to intercept **all** requests to HN before they hit the network. The browser still navigates to HN URLs, so:
- Chrome matches `content_scripts.matches` and injects the content script normally
- `window.location` reflects the real HN URL, so content.js path/param parsing works
- The content script's `fetch()` for gap detection (same origin) is also intercepted

Using `context.route()` (context-level) rather than `page.route()` (page-level) to ensure content script fetch requests are caught regardless of execution context.

## Files to modify/create

- `test/test.js` — route interception, synthetic fixtures, simplified tests
- `test/fixtures/page1.html` — captured real HN page 1 HTML (committed, used by smoke test)
- `test/fixtures/page2.html` — captured real HN page 2 HTML (committed, used by smoke test)

## Implementation

### 1. Add `buildHNPage(storyIds, startRank)` helper

Generates minimal HTML matching HN's actual DOM structure (per `docs/HN_DOM_REFERENCE.md`):

```
<html lang="en" op="news">
<body><center>
  <table id="hnmain">
    <tr id="bigbox"><td>
      <table>
        <!-- per story: 3 rows -->
        <tr class="athing submission" id="{id}">
          <td class="title"><span class="rank">{rank}.</span></td>
          <td class="votelinks"></td>
          <td class="title"><span class="titleline"><a href="https://example.com/{id}">Story {id}</a></span></td>
        </tr>
        <tr>
          <td colspan="2"></td>
          <td class="subtext"><span class="subline"><span class="score" id="score_{id}">100 points</span></span></td>
        </tr>
        <tr class="spacer" style="height:5px"></tr>
        <!-- ×30 -->
      </table>
    </td></tr>
  </table>
</center></body></html>
```

### 2. Define deterministic story IDs

```javascript
const PAGE1_IDS = Array.from({ length: 30 }, (_, i) => `${40001 + i}`);  // 40001–40030
const PAGE2_IDS = Array.from({ length: 30 }, (_, i) => `${40031 + i}`);  // 40031–40060
```

### 3. Set up route interception

After `launchBrowser()`, before any navigation:

```javascript
await context.route('https://news.ycombinator.com/**', (route) => {
  const url = new URL(route.request().url());
  const path = url.pathname;
  const p = url.searchParams.get('p') || '1';

  if (path === '/news' || path === '/') {
    const ids = p === '2' ? PAGE2_IDS : PAGE1_IDS;
    const startRank = (parseInt(p) - 1) * 30 + 1;
    route.fulfill({ body: buildHNPage(ids, startRank), contentType: 'text/html' });
  } else if (path === '/newest') {
    // Minimal valid page — content script skips /newest anyway
    route.fulfill({ body: '<html><body></body></html>', contentType: 'text/html' });
  } else {
    route.fulfill({ body: '', status: 200 });
  }
});
```

### 4. Simplify tests using known IDs

Several tests currently navigate to a page just to "discover" its story IDs, then manipulate storage, then re-navigate. With deterministic IDs we can skip the discovery step:

| Test | Current approach | New approach |
|------|-----------------|--------------|
| **5 (gap detection)** | Visit p=1, read IDs from storage, trim 3, navigate p=2 | Directly set storage with `PAGE1_IDS.slice(3)`, navigate p=2 |
| **8 (dwell skip)** | Visit p=1, read IDs, trim 3, set high dwell, navigate p=2 | Directly set storage with trimmed IDs + high dwell, navigate p=2 |
| **9 (duplicate detection)** | Visit p=2 to learn IDs, construct fake page_1 with overlap, revisit p=2 | Directly set fake page_1 with `PAGE2_IDS.slice(0,3)` overlap, navigate p=2 |
| **10 (dups w/o dwell)** | Visit p=2 to learn IDs, set up overlap + high dwell, revisit p=2 | Directly construct storage, navigate p=2 |

Tests 1–4, 6, 7, 11 keep the same structure — they just serve fixtures instead of live pages.

### 5. Replace `waitForTimeout` with targeted waits

Replace `waitForTimeout(2000-3000)` with more precise waits:

- After navigation: `await page.waitForSelector('tr.athing.submission')` — confirms content script has run and stories are parsed
- After gap injection (test 5): `await page.waitForFunction(() => document.querySelectorAll('tr.athing.submission').length > 30, { timeout: 5000 })` — waits for injection to complete
- After duplicate marking: `await page.waitForSelector('.pagegap-duplicate', { timeout: 5000 })`

Fallback: if `waitForSelector` is unreliable for extension-injected state, use short `waitForTimeout(500)` — still much less than the current 2-3s.

### 6. Strengthen assertions with known IDs

With deterministic fixtures, we can assert on exact IDs rather than just counts:

- Test 1: Verify `storage.page_1.storyIds` equals `PAGE1_IDS`
- Test 5: Verify the injected gap story IDs are exactly `PAGE1_IDS.slice(0, 3)`
- Test 9: Verify the duplicate-marked IDs are exactly the overlap IDs

### 7. Captured real-page smoke test

Add a final test (test 12) that uses saved copies of real HN pages as fixtures instead of synthetic HTML. This validates that the extension's selectors work against actual HN markup, not just our minimal synthetic version.

**Setup:**
- Capture real HN page 1 and page 2 HTML via `curl` and save as `test/fixtures/page1.html` and `test/fixtures/page2.html`
- Scrub any sensitive content if needed (these are public pages, so likely fine as-is)
- Extract the story IDs from each fixture and store as constants (e.g., `REAL_PAGE1_IDS`, `REAL_PAGE2_IDS`)

**Route override for this test only:**
- Temporarily swap the route handler (via `context.unroute()` + `context.route()`) to serve the captured fixtures instead of synthetic HTML
- Or: use a flag/variable in the existing route handler to switch between synthetic and captured fixtures

**Test 12 assertions (basic sanity):**
- Navigate to page 1 → 30 stories parsed, `page_1` snapshot stored with correct IDs
- Navigate to page 2 → 30 stories parsed, `page_2` snapshot stored
- No crashes or console errors

This test doesn't need to cover gap/duplicate scenarios — those are well covered by the synthetic tests. Its sole purpose is catching selector breakage against real markup.

## What doesn't change

- `test/demo.js` and `test/open.js` — manual/visual tools, should keep using live HN
- Extension code (`content.js`, `background.js`, `manifest.json`) — no changes needed
- Test structure (11 tests, assertion helper, storage helpers) — same framework

## Verification

1. Run `node test/test.js` — all 11 tests should pass
2. Confirm no network requests reach HN (route handler covers everything)
3. Tests should run noticeably faster (no network latency, shorter waits)
4. Optionally: disconnect network and confirm tests still pass

## Risk: content script fetch interception

If `context.route()` doesn't intercept the content script's `fetch()` call (used for gap detection on page 2+), tests 4, 5, and 8 would fail. Mitigation: if this happens, add a configurable base URL in `content.js` (readable from `chrome.storage.session`) that defaults to `window.location.origin` but can be overridden to point at a local server in tests. This would be a small, targeted change.
