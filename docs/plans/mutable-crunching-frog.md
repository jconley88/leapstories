# Refactor content.js into Separate Modules

## Context

`content.js` is a 106-line single IIFE mixing parsing, storage, duplicate detection, gap detection, and DOM injection. Splitting it into focused modules makes each concern independently readable and testable, and makes the orchestration flow scannable.

MV3 content scripts don't support ES modules, and there's no bundler. The approach: list multiple files in the manifest's `content_scripts.js` array. They execute in order and share the same isolated-world scope. Helper files define top-level functions; the final `content.js` calls them.

## Files to Create

### 1. `parse.js` — Pure parsing (from lines 6, 9-22)

```js
function getPageNumber() {
  return parseInt(new URLSearchParams(window.location.search).get("p") || "1", 10);
}

function parseStories(doc) {
  const rows = doc.querySelectorAll("tr.athing.submission");
  const stories = [];
  for (const row of rows) {
    const id = row.id;
    const rankEl = row.querySelector(".rank");
    const rank = rankEl ? parseInt(rankEl.textContent, 10) : null;
    const subtextRow = row.nextElementSibling;
    const spacerRow = subtextRow ? subtextRow.nextElementSibling : null;
    stories.push({ id, rank, athingRow: row, subtextRow, spacerRow });
  }
  return stories;
}
```

### 2. `storage.js` — chrome.storage.session wrapper (from lines 25-29, 35-38, 53-54, 100-105)

```js
async function saveSnapshot(pageNum, storyIds) {
  await chrome.storage.session.set({
    [`page_${pageNum}`]: { storyIds, timestamp: Date.now() },
  });
}

async function getSnapshot(pageNum) {
  const key = `page_${pageNum}`;
  const stored = await chrome.storage.session.get(key);
  return stored[key] || null;
}

async function getDwellConfig() {
  const dwellConfig = await chrome.storage.session.get("pagegap_dwell");
  return dwellConfig.pagegap_dwell ?? 60_000;
}
```

### 3. `duplicates.js` — Duplicate detection and marking (from lines 40-50)

```js
function findDuplicates(currentStories, prevSnapshotIds) {
  return currentStories.filter((s) => prevSnapshotIds.has(s.id));
}

function markDuplicates(duplicateStories) {
  for (const dup of duplicateStories) {
    dup.athingRow.classList.add("pagegap-duplicate");
    if (dup.subtextRow) dup.subtextRow.classList.add("pagegap-duplicate");
    const titleLink = dup.athingRow.querySelector(".titleline > a");
    if (titleLink) titleLink.textContent = "seen on previous page \u2014 " + titleLink.textContent;
  }
}
```

### 4. `gaps.js` — Gap fetch, detection, and injection (from lines 58-98)

```js
async function fetchFreshPreviousPage(pageNum) {
  const resp = await fetch(`${window.location.origin}/news?p=${pageNum - 1}`);
  const html = await resp.text();
  return new DOMParser().parseFromString(html, "text/html");
}

function findGapStories(freshStories, prevSnapshotIds, currentStoryIds) {
  return freshStories.filter(
    (s) => !prevSnapshotIds.has(s.id) && !currentStoryIds.has(s.id)
  );
}

function injectGapStories(gapStories, referenceRow) {
  const table = referenceRow.parentElement;
  for (const gap of gapStories) {
    const athingClone = document.importNode(gap.athingRow, true);
    const subtextClone = gap.subtextRow
      ? document.importNode(gap.subtextRow, true)
      : null;
    const spacerClone = gap.spacerRow
      ? document.importNode(gap.spacerRow, true)
      : null;
    table.insertBefore(athingClone, referenceRow);
    if (subtextClone) table.insertBefore(subtextClone, referenceRow);
    if (spacerClone) table.insertBefore(spacerClone, referenceRow);
  }
}
```

## Files to Modify

### 5. `content.js` — Rewrite as slim orchestrator

```js
(async function pagegap() {
  const path = window.location.pathname;
  if (path !== "/" && path !== "/news") return;

  const pageNum = getPageNumber();
  const currentStories = parseStories(document);
  const storyIds = currentStories.map((s) => s.id);
  await saveSnapshot(pageNum, storyIds);

  if (pageNum <= 1) return;

  const prevSnapshot = await getSnapshot(pageNum - 1);
  if (!prevSnapshot) return;

  const prevSnapshotIds = new Set(prevSnapshot.storyIds);
  const currentStoryIds = new Set(currentStories.map((s) => s.id));

  const duplicates = findDuplicates(currentStories, prevSnapshotIds);
  markDuplicates(duplicates);

  const dwellMs = await getDwellConfig();
  const elapsed = Date.now() - prevSnapshot.timestamp;
  if (elapsed < dwellMs) return;

  let freshDoc;
  try {
    freshDoc = await fetchFreshPreviousPage(pageNum);
  } catch {
    return;
  }

  const freshStories = parseStories(freshDoc);
  const gapStories = findGapStories(freshStories, prevSnapshotIds, currentStoryIds);
  if (gapStories.length === 0) return;

  const firstStory = document.querySelector("tr.athing.submission");
  if (!firstStory) return;
  injectGapStories(gapStories, firstStory);

  storyIds.push(...gapStories.map((s) => s.id));
  await saveSnapshot(pageNum, storyIds);
})();
```

### 6. `manifest.json` — Add new files to content_scripts (order matters)

```json
"js": ["parse.js", "storage.js", "duplicates.js", "gaps.js", "content.js"]
```

## Implementation Sequence

1. Create `parse.js`, `storage.js`, `duplicates.js`, `gaps.js` (independent, parallel)
2. Rewrite `content.js` as orchestrator
3. Update `manifest.json` js array
4. Run `node test/test.js` — all 14 tests should pass with no modifications

## Verification

Run `node test/test.js`. The tests load the extension via manifest, intercept HN requests, and verify behavior through storage reads and DOM inspection. They don't import content.js directly, so the split is invisible to them. All 14 tests passing confirms behavioral equivalence.
