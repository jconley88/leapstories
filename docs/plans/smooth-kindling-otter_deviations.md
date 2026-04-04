# Deviations: Duplicate Story Detection + Visual Annotations

Plan: `docs/plans/smooth-kindling-otter.md`

## Deviation 1: Dwell check kept as early return instead of boolean flag

**Plan said:** Restructure the dwell check from an early `return` to a `dwellMet` boolean, then wrap gap detection in `if (dwellMet) { ... }`.

**What was built:** Placed duplicate detection *before* the dwell check's early `return`, keeping the existing `return` pattern.

**Why:** The duplicate detection code only needs to run before the dwell check — once duplicates are marked, the early return is fine. This avoids adding an extra nesting level and keeps the code flatter and simpler. Same behavior, less indentation.

## Deviation 2: content.js had been cleaned up since planning

**Plan said:** Referenced logging calls (`log()`, `warn()`) throughout content.js and specific line numbers based on the verbose version.

**What was built:** The file had been simplified between planning and implementation (logging removed, early returns simplified). Edits were applied to the cleaned-up version.

**Why:** The file was modified externally (likely a linter or prior cleanup). The same logical changes were applied to the current version.

## Deviation 3: Gap story border removed

**Plan said:** Add a `.pagegap-gap` CSS class with a 3px teal left border to injected gap stories, plus a test (Test 10) verifying the marker.

**What was built:** Gap story border was removed after initial implementation. Gap stories are injected without any visual styling. Test 10 was removed, bringing the suite to 11 tests / 17 assertions.

**Why:** User decided gap stories don't need special CSS — the duplicate treatment was sufficient.

## Deviation 4: Duplicate opacity and title prefix changed

**Plan said:** Duplicate opacity of `0.55`.

**What was built:** Opacity reduced to `0.4`, and duplicate story titles are prefixed with "seen on previous page — ".

**Why:** User requested stronger dimming and an explicit text label for duplicates.
