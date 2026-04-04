# Implementation Deviations from V1 Plan

## 1. Background service worker added (not planned)

**Plan said:** "Single content script (`content.js`) — no background/service worker needed for v1."

**What changed:** Added `background.js` with a service worker registered in `manifest.json`.

**Why:** `chrome.storage.session` defaults to `TRUSTED_CONTEXTS` access level, meaning only service workers and extension pages can access it — not content scripts. The background service worker calls `chrome.storage.session.setAccessLevel()` to grant content script access. This was discovered during testing when storage reads from the content script returned undefined. The service worker also enabled test access to storage via Playwright's `context.serviceWorkers()` API.

## 2. Story table located via `parentElement`, not `#bigbox td > table`

**Plan said:** Use selector `#bigbox td > table` to find the story table.

**What changed:** Implementation finds the first `tr.athing.submission` and uses `firstStory.parentElement` to get the table body.

**Why:** Simpler and more robust — avoids depending on the `#bigbox` structure, and directly targets the container of the element we already located.

## 3. `parseStories` returns DOM nodes, not HTML strings

**Plan said:** Return `Array<{ id, rank, html }>` where `html` captures both rows as a string.

**What changed:** Returns `{ id, rank, athingRow, subtextRow, spacerRow }` with references to actual DOM elements (or parsed nodes from `DOMParser` output).

**Why:** Working with DOM nodes directly is cleaner for injection — `document.importNode()` handles cross-document node adoption, avoiding innerHTML parsing and the potential issues that come with serializing/deserializing HTML fragments.

## 4. Test storage access uses callback-style API, not promise-style

**Plan said:** Tests would use `page.evaluate()` in content script context, or extension pages.

**What changed:** Tests access storage via the service worker using callback-wrapped promises: `new Promise((resolve) => chrome.storage.session.get(null, resolve))`.

**Why:** Playwright's `serviceWorker.evaluate()` with the promise-returning `chrome.storage.session.get()` didn't resolve correctly. Wrapping in explicit callback-style promises fixed it. The service worker context (not content script context) was used since `page.evaluate()` runs in the page's main world where `chrome.storage` is unavailable.

## 5. Added `test/demo.js` (not in plan)

**Plan said:** Only `test/test.js` and existing `test/open.js`.

**What changed:** Added `test/demo.js` — launches browser, simulates gap by modifying stored snapshot, navigates to page 2 showing injected stories, and stays open for manual inspection.

**Why:** Needed a way to visually verify injection behavior without relying on real ranking shifts. Fills the gap between automated tests and the bare `open.js`.
