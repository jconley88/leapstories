# Plan: Duplicate Story Detection + Visual Annotations

## Context

PageGap v1 detects stories that rise into the gap between pages (gap stories) and injects them silently. The inverse problem exists: stories that **fall** from page N-1 to page N cause the user to see them twice. This plan adds duplicate detection with visual marking, and also marks gap stories — creating a coherent annotation system where both types are visually distinguished.

## Approach

Detect duplicates by comparing current page story IDs against the previous page's snapshot (data already in storage). Mark duplicates with reduced opacity. Mark gap stories with a left border accent. Use a dedicated CSS file registered in the manifest.

## Files to Change

| File | Action | What |
|------|--------|------|
| `pagegap.css` | Create | CSS classes for `.pagegap-gap` and `.pagegap-duplicate` |
| `manifest.json` | Modify | Add `"css": ["pagegap.css"]` to content_scripts |
| `content.js` | Modify | Add duplicate detection, restructure dwell gate, add CSS classes |
| `test/test.js` | Modify | Add tests 9-12 |
| `test/demo.js` | Modify | Show both gap and duplicate treatments |
| `docs/HOW_IT_WORKS.md` | Modify | Document visual annotations, update "what it doesn't do" |
| `docs/FUTURE_WORK.md` | Modify | Remove duplicate detection item |
| `README.md` | Modify | Update test count and feature list |

## Implementation Steps

### 1. Create `pagegap.css`

Two CSS rules:

- `.pagegap-gap` — 3px solid left border in muted teal (`#5c9ead`). Gap stories are new to the user, so they stay fully opaque. The border signals "this was added for you."
- `.pagegap-duplicate` — `opacity: 0.55`. Dims the story to signal "you already saw this" while keeping it readable. No background tint (works better with dark mode extensions and HN's off-white background).

Applied to `athing` and `subtext` rows. Spacer rows are invisible, no class needed.

Fallback consideration: `border-left` on `<tr>` requires the table not to use `border-collapse: collapse`. HN's table uses the default (`separate`), so this should work. Verify visually during implementation; if it doesn't render, apply to `td:first-child` instead.

### 2. Register CSS in `manifest.json`

Add `"css": ["pagegap.css"]` to the content_scripts entry (line 14). Manifest V3 injects content script CSS automatically before the JS runs.

### 3. Modify `content.js`

Three changes:

#### a. Restructure dwell check (lines 83-91)

Currently the dwell check does an early `return`, which would also skip duplicate detection. Change it from a `return` to a boolean flag `dwellMet`. Wrap the gap detection block (fetch, diff, inject — lines 95-147) in `if (dwellMet) { ... }`.

#### b. Add duplicate detection (after line 93)

Insert after `const prevSnapshotIds = new Set(...)` and before the dwell check:

```
const duplicateStories = currentStories.filter(s => prevSnapshotIds.has(s.id));
for (const dup of duplicateStories) {
  dup.athingRow.classList.add("pagegap-duplicate");
  if (dup.subtextRow) dup.subtextRow.classList.add("pagegap-duplicate");
}
```

This runs on every page 2+ load regardless of dwell time — duplicates exist even with fast navigation.

#### c. Add `.pagegap-gap` class to injected gap stories (lines 133-147)

After `importNode` calls, add `classList.add("pagegap-gap")` to `athingClone` and `subtextClone`.

#### Revised flow

```
parse current page, save snapshot
if page <= 1: return
get prev snapshot (or bail)
mark duplicates on current page        <-- NEW
dwell check -> set dwellMet boolean     <-- CHANGED (was early return)
if (dwellMet) {                         <-- NEW gate
  fetch fresh prev page
  find gap stories
  inject gap stories with .pagegap-gap  <-- CHANGED (adds class)
}
```

Note: gap stories and duplicate stories are mutually exclusive by definition (gap = NOT in snapshot, duplicate = IN snapshot), so no story can get both classes.

### 4. Add tests to `test/test.js`

- **Test 9**: Duplicate detection — craft a `page_1` snapshot containing some page 2 story IDs, navigate to page 2, verify those stories have `.pagegap-duplicate` class
- **Test 10**: Gap story markers — simulate gap (trim IDs from snapshot), verify injected stories have `.pagegap-gap` class
- **Test 11**: Duplicates work even when dwell time is not met — set high dwell threshold + recent timestamp, verify duplicates still marked but no gap injection
- **Test 12**: No false duplicates on page 1 — verify page 1 never has `.pagegap-duplicate` elements

### 5. Update `test/demo.js`

After the existing gap simulation, also add overlap IDs to the `page_1` snapshot so some page 2 stories are marked as duplicates. Update console output to describe both treatments.

### 6. Update documentation

- `docs/HOW_IT_WORKS.md`: Add "Visual annotations" section. Remove "Detect stories that dropped down (duplicates)" and "Distinguish injected stories visually" from the "What it doesn't do" list.
- `docs/FUTURE_WORK.md`: Remove the "Duplicate detection" section.
- `README.md`: Update test count, add brief note about duplicate marking.

## Verification

1. `node test/test.js` — all 12 tests pass
2. `node test/demo.js` — visually confirm: gap stories have teal left border, duplicate stories are dimmed
3. Manual: load extension, browse HN page 1 -> page 2, verify no errors in console
