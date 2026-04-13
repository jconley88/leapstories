# Plan: Gap Story Prefix Option

## Context
Gap stories (stories that rose into the previous page after you left it) are injected at the top of the current page but have no visual label distinguishing them. The duplicate prefix option already labels stories you've seen before. This adds an analogous option for gap stories — defaulting to empty (no prefix), but configurable.

## Changes

### 1. `src/settings.js` — Add default setting
Add `gapPrefix: ""` to `SETTINGS_DEFAULTS` (line 1-6).

### 2. `src/page.js` — Apply prefix during injection
Modify `injectGapStories()` (line 46) to accept `settings` and, when `settings.gapPrefix` is non-empty, prepend it to each injected story's title link (same pattern as `markDuplicates` line 42).

### 3. `src/content.js` — Pass settings to gap injection
In `handleGaps()` (line 26), accept `settings` and pass it to `injectGapStories()`.
In the main IIFE (line 53), pass `settings` to `handleGaps()`.

### 4. `src/options.html` — Add UI field
Add a text input for "Gap story prefix" after the duplicate prefix field (after line 17).

### 5. `src/popup.html` — Add UI field
Same text input, after the duplicate prefix field (after line 18).

### 6. `src/options.js` — Wire up the new field
- Read `settings.gapPrefix` into the new input on load.
- Include `gapPrefix` in the saved settings object.

## Verification
1. Load the unpacked extension, visit HN page 1, wait 60s, navigate to page 2.
2. Gap stories should appear with no prefix (default empty).
3. Set a prefix (e.g. "gap — ") in popup/options, reload page 2 — gap stories should show the prefix.
4. Duplicate prefix should still work independently.
