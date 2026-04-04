# How PageGap Works

## Overview

PageGap is a Manifest V3 Chrome extension with two files that run on `news.ycombinator.com`:

- **`background.js`** — Service worker that sets `chrome.storage.session` access level so content scripts can use it
- **`content.js`** — Content script that does all the work: parse, store, fetch, diff, inject

## Lifecycle

### Every page load (on `/` or `/news`)

1. Parse all 30 story rows from the DOM (`tr.athing.submission`)
2. Extract each story's ID (from the `id` attribute) and rank number
3. Store the list of story IDs in `chrome.storage.session` under key `page_<N>`

### On page N > 1 (additionally)

4. Look up the stored snapshot for page N-1
5. If no snapshot exists (user didn't visit page N-1 this session), stop
6. Fetch page N-1's HTML from the server (`fetch()` + `DOMParser`)
7. Parse stories from the fresh fetch
8. Diff: find stories in the fresh fetch that are **not** in the stored snapshot
9. These are "gap stories" — they rose into page N-1 after the user left it
10. Inject gap stories at the top of the current page's DOM, before the first existing story

### On page 1

Only steps 1-3 run. No previous page to diff against.

### On non-target pages

Content script exits immediately. No parsing, no storage, no fetching.

## Storage

Uses `chrome.storage.session` — in-memory, extension-scoped, clears on browser close. Never written to disk, never sent to any server.

### Schema

```
Key:   "page_1", "page_2", "page_3", ...
Value: {
  storyIds: string[],   // array of 30 HN story IDs
  timestamp: number      // Date.now() when snapshot was taken
}
```

### Behavior

- One key per page number, holding the latest snapshot
- Keys accumulate across pages (page_1, page_2, etc. can coexist)
- Each key is overwritten on every visit to that page number
- All data clears when the browser closes

### Access level

`chrome.storage.session` defaults to service-worker-only access. The background service worker calls `setAccessLevel({ accessLevel: "TRUSTED_AND_UNTRUSTED_CONTEXTS" })` to grant content script access. Without this, content scripts cannot read or write session storage.

## DOM interaction

### Reading stories

Stories are parsed using `tr.athing.submission` selector. Each story consists of 3 consecutive table rows:

1. **athing row** — contains rank, vote arrow, title link
2. **subtext row** — contains points, author, age, comment link
3. **spacer row** — 5px empty row for visual spacing

Related rows are found by DOM traversal: `row.nextElementSibling` for subtext, then `.nextElementSibling` again for spacer.

### Injecting stories

Gap stories are injected using `document.importNode()` to adopt nodes from the fetched document into the live DOM. All 3 rows (athing + subtext + spacer) are inserted before the first existing story, preserving their original rank numbers from the fresh fetch. No renumbering occurs — existing stories keep their numbers.

## What it doesn't do (v1)

- Detect stories that dropped down (duplicates)
- Track across more than one page back
- Run on `/newest`, `/front`, `/ask`, `/show`
- Distinguish injected stories visually

See `docs/FUTURE_WORK.md` for planned additions.
