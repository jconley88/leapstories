# Race Condition Fixes in content.js

## Context

PageGap detects "gap" stories — stories that rose into the previous page's rank range after the user left it. However, there's a race condition: a story can rise into the previous page's range AND simultaneously drop back down to the current page before the fresh fetch completes. In that case, the story gets injected as a gap story at the top of the page AND appears natively in the current page list, resulting in a duplicate display.

Additionally, a gap story might have further dropped to a page beyond the current one — but we have no visibility into that, so the only actionable case is the current page duplicate.

## Race Conditions Found

### Bug 1 (confirmed): Gap story already present on current page
**File:** `content.js:73`

`gapStories` filters stories that are in the fresh previous page but NOT in the original previous-page snapshot. However, it never checks whether those stories are already present on the current page. If a story rose into the previous page's range but dropped back to the current page before the fetch completes, it appears twice.

**No other race conditions were found:**
- Duplicate detection (lines 43–49) and gap detection are mutually exclusive by definition: duplicates are stories IN the previous snapshot, gaps are stories NOT in the previous snapshot.
- The dwell check correctly gates the fetch; duplicate marking running before the dwell check is intentional (duplicates don't require a fetch).

## Fix

Build a `Set` of current story IDs before the gap filter, then exclude any gap story whose ID already exists on the current page.

### Change to `content.js`

After line 40 (`const prevSnapshotIds = new Set(prevSnapshot.storyIds);`), add:

```js
const currentStoryIds = new Set(currentStories.map((s) => s.id));
```

Change line 73 from:
```js
const gapStories = freshStories.filter((s) => !prevSnapshotIds.has(s.id));
```
to:
```js
const gapStories = freshStories.filter(
  (s) => !prevSnapshotIds.has(s.id) && !currentStoryIds.has(s.id)
);
```

## Files to Modify

- `content.js` — two lines changed (add `currentStoryIds` set, update `gapStories` filter)

## Verification

1. Manually test with `node test/open.js` — load page 1, then page 2, verify no story appears twice.
2. Run `node test/test.js` to confirm automated extension-loading tests pass.
3. To simulate the race: temporarily add a story's ID to both `freshStories` and `currentStories` in a debug session and confirm it no longer gets injected as a gap story.
