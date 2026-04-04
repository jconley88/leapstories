# Plan: Add gap story IDs to page snapshot

## Context

Gap stories are detected and injected into the DOM, but their IDs are never added to the current page's storage snapshot. This means when the user navigates to page N+1, those gap stories aren't in the page N snapshot — so the same stories could resurface as "gaps" again, or fail to be detected as duplicates. The fix ensures the snapshot reflects everything the user has been shown on a page.

## Changes

### 1. `content.js` — Update snapshot after gap injection

After the gap story injection loop (line ~98), append gap story IDs to the `storyIds` array and re-write the current page's snapshot:

```js
// After the injection for-loop
const gapIds = gapStories.map(s => s.id);
storyIds.push(...gapIds);
await chrome.storage.session.set({
  [`page_${pageNum}`]: { storyIds, timestamp: Date.now() },
});
```

This reuses the existing `storyIds` array (defined on line 26) which is still in scope. The timestamp is refreshed to reflect the updated snapshot.

### 2. `test/test.js` — Add test for snapshot update

Add a new test (Test 14) that verifies gap story IDs are included in the page snapshot after injection:

1. Set up a page 1 snapshot with a gap (trimmed IDs, old timestamp, dwell=0)
2. Navigate to page 2 — triggers gap injection
3. Wait for injection to complete
4. Read `page_2` from storage
5. Assert that the gap story IDs are present in `page_2.storyIds`

This follows the existing test patterns: `clearStorageSession` → `setStorageSession` → navigate → `waitForFunction` → `getStorageSession` → assert.

### 3. `docs/HOW_IT_WORKS.md` — Document the behavior

Add a brief note after the injection step (step 11) explaining that gap story IDs are appended to the current page's snapshot so downstream pages treat them as "seen."

## Files modified

- `content.js` — ~4 lines added after line 98
- `test/test.js` — ~25-30 lines for new test
- `docs/HOW_IT_WORKS.md` — 1-2 lines added to step 11

## Verification

1. Run `node test/test.js` — all existing tests pass, new test passes
2. Manual check: load extension, visit page 1, wait 60s+, visit page 2 (gap stories injected), then inspect `chrome.storage.session` to confirm `page_2.storyIds` includes gap IDs
