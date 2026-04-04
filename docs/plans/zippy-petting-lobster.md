# Plan: 60-second minimum dwell time before re-fetching previous page

## Context

PageGap re-fetches the previous HN page every time a user navigates to page 2+. If the user clicks through pages quickly (e.g., opens page 2 within seconds of viewing page 1), the re-fetch is wasteful — there hasn't been enough time for stories to meaningfully shift. A 60-second minimum dwell time avoids unnecessary requests to HN.

## Approach

The snapshot already stores `timestamp: Date.now()` (content.js:28) but never reads it. Add a check after retrieving the previous snapshot: if fewer than 60 seconds have elapsed since the snapshot was created, skip the fetch.

## Changes

### `content.js` (single change)

After line 38 (`if (!prevSnapshot) return;`), add:

```js
// Skip re-fetch if previous page was viewed less than 60 seconds ago
const elapsed = Date.now() - prevSnapshot.timestamp;
if (elapsed < 60_000) return;
```

That's it. No other files need changes.

### `test/test.js`

**Fix existing Test 5** (line 128): The simulated snapshot uses `timestamp: Date.now()`, then immediately navigates to page 2. With the new 60s check, the fetch would be skipped and injection wouldn't happen. Fix by backdating the timestamp:

```js
// line 128: change Date.now() to Date.now() - 120_000
page_1: { storyIds: trimmedIds, timestamp: Date.now() - 120_000 },
```

**Add new test**: Verify that gap detection is skipped when the previous page snapshot is too recent (timestamp < 60s ago). Set up a gap scenario (like Test 5) but leave the timestamp recent — assert that no extra stories are injected.

## Verification

1. Load the extension, open HN page 1
2. Immediately click to page 2 (within 60s) — no gap stories should be injected, no extra fetch should fire (verify in DevTools Network tab)
3. Wait 60s on page 1, then navigate to page 2 — gap detection should work normally
4. Run `node test/test.js` — all existing + new tests pass
