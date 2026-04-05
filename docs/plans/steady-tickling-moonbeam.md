# Rename PageGap → LeapStories

## Context

The project has been renamed from "PageGap" (placeholder) to "LeapStories". The name reflects the core concept: stories that leap between pages due to HN's dynamic ranking, analogous to leap year filling a gap the normal system misses. The directory `/pagegap` stays as-is to preserve Claude session memory.

## Scope

**Update:** functional code, tests, active documentation (README, CLAUDE.md, HOW_IT_WORKS.md, HN_DOM_REFERENCE.md)  
**Leave as-is:** PROMPT_HISTORY.md, plan files, session logs (historical records)

## Changes

### 1. `manifest.json`
- `"name": "PageGap"` → `"name": "LeapStories"`
- `"css": ["src/pagegap.css"]` → `"css": ["src/leapstories.css"]`

### 2. Rename file: `src/pagegap.css` → `src/leapstories.css`
- Update comment: `/* PageGap visual annotations */` → `/* LeapStories visual annotations */`
- CSS class: `tr.pagegap-duplicate` → `tr.leapstories-duplicate`

### 3. `src/page.js`
- `DUPLICATE_CLASS = "pagegap-duplicate"` → `DUPLICATE_CLASS = "leapstories-duplicate"`

### 4. `src/storage.js`
- `"pagegap_dwell"` → `"leapstories_dwell"` (both get and return references)

### 5. `src/content.js`
- `async function pagegap()` → `async function leapstories()`

### 6. `package.json`
- `"name": "pagegap"` → `"name": "leapstories"`

### 7. `package-lock.json`
- Both `"name": "pagegap"` entries → `"name": "leapstories"`

### 8. `test/test.js`
- All `pagegap-duplicate` CSS class selectors → `leapstories-duplicate`
- All `pagegap_dwell` storage keys → `leapstories_dwell`

### 9. `test/demo.js`
- `pagegap-duplicate` selector → `leapstories-duplicate`

### 10. `README.md`
- Title and all body references: `PageGap` → `LeapStories`

### 11. `CLAUDE.md`
- Title and all body references: `PageGap` → `LeapStories`

### 12. `docs/HOW_IT_WORKS.md`
- Title, body references, `pagegap_dwell` key mentions, `.pagegap-duplicate` class mentions → updated equivalents

### 13. `docs/HN_DOM_REFERENCE.md`
- `PageGap` references → `LeapStories`

## Order of Operations

1. Rename `src/pagegap.css` → `src/leapstories.css` (git mv to preserve history)
2. Update manifest.json CSS reference
3. Update all source files (page.js, storage.js, content.js)
4. Update package.json and package-lock.json
5. Update test files
6. Update docs

## Verification

- Reload unpacked extension in Chrome — name should show as "LeapStories"
- Run `node test/test.js` — all tests should pass with new class/key names
- Run `node test/open.js` — manual check that gap stories get the `leapstories-duplicate` class and are visually dimmed
