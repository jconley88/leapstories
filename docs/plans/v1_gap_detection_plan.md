# PageGap V1 Implementation Plan

## Context

When browsing HN, stories shift rank between page views. Clicking "More" to go from page 1 to page 2 can cause stories to silently rise into page 1's range, disappearing from page 2. PageGap detects these "gap" stories by comparing a stored snapshot of the previous page against a fresh re-fetch, then injects the missed stories into the current page.

## Current State

- Manifest V3 extension skeleton exists (`manifest.json`, `content.js` with just a console.log)
- Playwright installed for testing
- Content script already targets `news.ycombinator.com/*`

## Architecture

Single content script (`content.js`) — no background/service worker needed for v1. All logic runs in the content script context.

## Implementation Steps

### 1. Add `storage` permission to `manifest.json`

- Add `"storage"` to the `permissions` array (needed for `chrome.storage.session`)

### 2. Parse the current HN page

Write a function to extract story data from the DOM:

- HN story rows use `<tr class="athing submission">` with an `id` attribute (the story ID)
- The rank number is in a `<span class="rank">` inside a `<td class="title">`
- Each story has two table rows: the main `athing` row and a `subtext` row below it
- Detect current page number from URL `?p=N` param (default to 1)

Return: `Array<{ id: string, rank: number, html: string }>` where `html` captures both the story row and its subtext row for later injection.

### 3. Store snapshot in `chrome.storage.session`

- Key: `"page_<N>"` (e.g., `"page_1"`)
- Value: `{ storyIds: string[], timestamp: number }`
- Only store the IDs (not HTML) — we just need them for diffing
- Overwrite on each visit to a page (always keep the latest snapshot)

### 4. Fetch and diff previous page

When on page N > 1:

1. Retrieve stored snapshot for page N-1 from `chrome.storage.session`
2. If no snapshot exists, skip (user didn't visit previous page this session)
3. `fetch()` the previous page URL (`https://news.ycombinator.com/news?p=<N-1>`)
4. Parse the response HTML (using `DOMParser`) to extract story data
5. Diff: find stories in the fresh fetch that are **not** in the stored snapshot — these are the gap stories that rose into page N-1 after the user left it

### 5. Inject gap stories into current page

- Parse the gap story HTML from the fetched page (both `athing` row + `subtext` row)
- Find the story table (`#bigbox td > table` — unnamed table inside bigbox)
- Insert gap story rows **at the top** of the story list, before the first existing story
- Use the rank numbers from the fresh fetch as-is — do not renumber existing stories

### 6. Handle edge cases

- **Page 1**: No previous page to diff — just store snapshot, done
- **Non-news pages**: Only run on `/news` and bare `/` paths. Skip `/newest`, `/front`, `/ask`, `/show`, `/item`, `/user`, etc.
- **Fetch failures**: Silently skip — no error UI for v1
- **No gap stories**: Common case, do nothing

## Files to Modify

| File | Change |
|------|--------|
| `manifest.json` | Add `"storage"` permission |
| `content.js` | Full implementation (parse, store, fetch, diff, inject) |

## HN DOM Structure (verified from live fetch)

- All HTML is on a **single line** (no newlines between elements)
- Stories live in an unnamed `<table>` inside `<tr id="bigbox"><td>`
- Story class is `"athing submission"` (not just `"athing"`)
- "More" link: `<a href='?p=2' class='morelink' rel='next'>More</a>`
- After last story spacer: `<tr class="morespace" style="height:10px">` then `<tr>...<a class='morelink'>More</a>`

```html
<!-- Story row -->
<tr class="athing submission" id="47637757">
  <td align="right" valign="top" class="title"><span class="rank">1.</span></td>
  <td valign="top" class="votelinks"><center><a id='up_47637757' href='vote?...'><div class='votearrow' title='upvote'></div></a></center></td>
  <td class="title"><span class="titleline"><a href="https://...">Story Title</a><span class="sitebit comhead"> (<a href="from?site=..."><span class="sitestr">arxiv.org</span></a>)</span></span></td>
</tr>
<!-- Subtext row -->
<tr>
  <td colspan="2"></td>
  <td class="subtext"><span class="subline"><span class="score" id="score_47637757">320 points</span> by <a href="user?id=..." class="hnuser">username</a> <span class="age" ...><a href="item?id=47637757">6 hours ago</a></span> ... | <a href="item?id=47637757">95&nbsp;comments</a></span></td>
</tr>
<!-- Spacer row -->
<tr class="spacer" style="height:5px"></tr>
```

Each story = 3 rows (athing + subtext + spacer). When injecting, copy all 3.

### DOM selectors to use
- Story rows: `tr.athing.submission` (querySelectorAll)
- Story ID: `tr.athing.submission` `.id` attribute
- Rank: `.rank` span inside the story row
- Story table: `#bigbox td > table` (the unnamed table)
- First story: first `tr.athing.submission` in that table

## Automated Testing Plan

Existing infrastructure: Playwright with extension loading (`test/test.js`, `test/open.js`). Tests launch Chrome with the extension loaded via `--load-extension`.

### Test structure

Expand `test/test.js` into a proper test suite. Each test uses Playwright to launch Chrome with the extension, navigate HN, and assert behavior. Since we're testing against live HN, tests verify real behavior rather than mocking.

### Test cases

#### 1. Snapshot storage on page 1
- Navigate to `news.ycombinator.com`
- Wait for content script to run
- Read `chrome.storage.session` via `page.evaluate()` with extension service worker
- Assert: `page_1` key exists with an array of 30 story IDs

#### 2. Snapshot storage on page 2
- Navigate to `?p=2`
- Assert: `page_2` key stored with 30 story IDs

#### 3. No injection on page 1
- Navigate to page 1
- Count `tr.athing.submission` rows
- Assert: exactly 30 (no injection happened)

#### 4. Gap detection and injection (simulated)
This is the key test. We can't reliably trigger real gap stories, so simulate:
- Navigate to page 1 — snapshot stored
- Use `page.evaluate()` to modify the stored snapshot: remove 3 story IDs from the `page_1` snapshot
- Navigate to page 2 — extension fetches fresh page 1, diffs, finds the 3 "missing" IDs
- Assert: page 2 now has > 30 `tr.athing.submission` rows (30 original + injected gap stories)
- Assert: the injected stories appear before the first original page 2 story in the DOM

#### 5. No injection when no gap exists
- Navigate to page 1 (snapshot stored)
- Immediately navigate to page 2 (no time for ranking to shift)
- Assert: page 2 has exactly 30 stories (no injection — fresh fetch matches snapshot)

#### 6. Skip non-news pages
- Navigate to `news.ycombinator.com/item?id=1` or `/newest`
- Assert: no snapshot stored, no injection attempted

#### 7. Graceful handling of missing snapshot
- Navigate directly to `?p=2` without visiting page 1 first
- Assert: page loads normally with 30 stories, no errors in console

### Accessing extension storage from tests

`chrome.storage.session` is only accessible from the extension context. To read/write it in tests:
- Use `chrome.runtime.getURL('')` to get the extension's origin
- Open a page at the extension origin and evaluate `chrome.storage.session.get()`/`.set()`
- Or inject a helper into the content script that exposes storage via `window.postMessage`

The simplest approach: after navigating to an HN page, use `page.evaluate()` in the content script context (which has access to `chrome.storage.session`) to read/modify storage.

### Running tests

```bash
node test/test.js
```

Exit 0 on all pass, exit 1 on any failure. Print PASS/FAIL for each test case.
