## Initial Setup

Initialize Claude Code project configuration.

This will be a browser extension for news.ycombinator.com that keeps track of stories you've already seen. It captures the "space between" pages. When clicking from page 1 to page 2, it does a normal load of page 2 but also reloads page 1, compares it to what you originally saw, and extracts any new stories that rose up from page 2 (or later) during the time you were reading page 1. These stories would otherwise be skipped entirely.

Create a minimal, barebones hello world extension (manifest.json and content.js) to get us started for our initial commit.

Create a README with brief instructions on setup, install, and verification.

Write a Playwright test script that launches Chromium with the extension loaded and verifies the console output.

We'll connect to a running browser via CDP later if needed. For now, rely on test scripts. Also make a simpler script that just opens the browser with the extension for manual testing. Keep test.js for automated use.

Run the test script (test.js) to verify it works.

Move PROMPT_HISTORY.md into a docs/ directory. Move the two test scripts (open.js and test.js) into a test/ directory.

Update CLAUDE.md with instructions to keep the prompt history files up to date.

Create a .gitignore with node_modules/ and other reasonable ignores for a browser extension.

## Prompt History Tracking

Set up an automated process to remind Claude to update the history files after each response. Implemented as a Stop hook in .claude/settings.json.

Restructure prompt history files: the raw file now includes inline context clarifications, and a new edited file has grammar and typo fixes for readability. Rename ANNOTATED accordingly and update CLAUDE.md.

Renamed PROMPT_HISTORY to PROMPT_HISTORY_ORIG and PROMPT_HISTORY_EDITED to PROMPT_HISTORY. Added PROMPT_HISTORY_ORIG to .gitignore. Updated all references.

Split into two commits: initial project setup, then prompt history tracking separately.

## v1 Implementation

Update prompt history instructions to redact personal information and security-sensitive details. Update the Stop hook with the same redaction instructions.

Fix the broken Stop hook — `additionalContext` isn't supported on Stop events. Switch to a `UserPromptSubmit` hook instead.

Brainstorm the v1 implementation plan. Decided on: track only previous page, inline inject gap stories at top of list with no visual distinction, use actual rank numbers from fresh fetch, re-fetch when next page loads, HTML fetch+parse over API, only target `/news` and `/` for v1.

Create a detailed implementation plan with verified DOM structure and automated testing strategy.

Generate a reference document detailing research on the HN DOM structure, selectors, pagination, URL patterns, and API considerations. Save to `docs/HN_DOM_REFERENCE.md`.

Copy the current implementation plan to `docs/plans/v1_gap_detection_plan.md`.

Approved and implemented the v1 gap detection plan (`docs/plans/v1_gap_detection_plan.md`). Added `storage` permission to manifest.json, created `background.js` service worker (sets session storage access level for content scripts), wrote full `content.js` (parse stories from DOM, store snapshot, fetch+diff previous page, inject gap stories), expanded `test/test.js` to 7 test cases with 12 assertions (all passing), and created `test/demo.js` for visual inspection of injected stories.

Broadened the prompt history system to track any user directive that causes meaningful state changes (file edits, commits, branch ops, etc.), not just typed prompts. Updated CLAUDE.md instructions and the UserPromptSubmit hook message.

Document implementation deviations from the original plan in `docs/plans/v1_gap_detection_deviations.md`. Five deviations identified: background service worker added for storage access, table located via parentElement instead of selector, DOM nodes used instead of HTML strings, test storage access via callback-style API, and demo.js added for visual testing.

Move implementation plan and deviations files into `docs/plans/` and rename to include "v1_gap_detection" prefix.

## Plan Automation

Add a PostToolUse hook on ExitPlanMode that reminds Claude to copy the plan file to `docs/plans/` and to create a deviations doc upon implementation completion. Added corresponding instructions to CLAUDE.md.

Create `docs/FUTURE_WORK.md` with items deferred from v1: duplicate detection (stories that dropped down), multi-page tracking, and support for other listing pages.

Create `docs/HOW_IT_WORKS.md` documenting the extension's architecture, lifecycle, storage schema, DOM interaction, and limitations. Update `README.md` with the problem description, how it works, testing commands, and current scope.

## Dwell Time

Planned and approved a 60-second minimum dwell time before re-fetching the previous page (`docs/plans/zippy-petting-lobster.md`).

Implementing plan `zippy-petting-lobster.md`: Added dwell time check to `content.js` — if the previous page was viewed less than 60 seconds ago, skip the re-fetch. Added Test 8 to verify the dwell time check blocks re-fetches for recent pages.

Follow-up to plan `zippy-petting-lobster.md`: Made the dwell time configurable via `pagegap_dwell` in session storage (defaults to 60,000ms). Tests set it to 0 to bypass the check, and Test 8 explicitly sets it to 60,000 to verify blocking. Allows adjusting the threshold during manual testing from the DevTools console.

Updated deviations doc (`docs/plans/zippy-petting-lobster_deviations.md`) with three deviations from the original plan: configurable dwell threshold, no backdated timestamps in tests, and `pagegap_dwell` restoration after `clearStorageSession`. Updated `HOW_IT_WORKS.md` with dwell time check in lifecycle and `pagegap_dwell` in storage schema. Updated `README.md` test count to 8 tests/13 assertions.

## Plan References

Retroactively added plan filename references to prompt history entries (both v1 plan and dwell time plan were missing them). Added instruction to CLAUDE.md Prompt History section and UserPromptSubmit hook to reference plan filenames when work is part of an approved plan.

Committed dwell time implementation (content.js, tests, plan docs, HOW_IT_WORKS, README, prompt history). Then committed CLAUDE.md and hook instruction updates for plan references separately.

## Duplicate Detection

Brainstormed approaches for the next FUTURE_WORK item: duplicate detection (stories that fall from page N-1 to page N, seen twice). Discussed four options: hide entirely, dim/mark, collapse with expand, hide+backfill. Decided on Option B (dim/mark) for visual annotation.

Planned and approved duplicate detection and visual annotation system (`docs/plans/smooth-kindling-otter.md`). Created `pagegap.css` with two CSS classes: `.pagegap-gap` (teal left border for injected gap stories) and `.pagegap-duplicate` (reduced opacity for already-seen stories). Updated `manifest.json` to register the CSS file. Modified `content.js` to detect duplicates by comparing current page story IDs against previous page snapshot, and to add CSS classes to both duplicate and gap stories. Added 4 new tests (tests 9-12, 6 new assertions) covering duplicate detection, gap markers, duplicates without dwell, and no false duplicates on page 1. Updated `test/demo.js` to demonstrate both treatments. Updated HOW_IT_WORKS.md, FUTURE_WORK.md, and README.md.

Increased duplicate dimming (opacity 0.55 to 0.4) and prepended "seen on previous page — " to duplicate story titles in `content.js`.

Removed gap story teal border — gap stories no longer get special CSS styling. Removed `.pagegap-gap` CSS rule and class assignments from `content.js`. Dropped Test 10 (gap marker test), renumbered tests 11-12 to 10-11. Updated demo.js, HOW_IT_WORKS.md, and README.md test count (11 tests, 17 assertions). Updated deviations doc with deviations 3-4.

## Test Fixtures

Planned and approved replacing live HN requests in tests with local fixtures (`docs/plans/agile-greeting-rain.md`). Tests should not connect to live news pages. Decided on hybrid approach: Playwright `context.route()` interception serving synthetic HTML fixtures for the main test suite (deterministic IDs, known assertions), plus a smoke test using captured real HN page fixtures to validate selectors against actual markup.

Implementing plan `agile-greeting-rain.md`: Rewrote `test/test.js` — added `buildHNPage()` helper generating minimal HN-structured HTML, defined deterministic story IDs (`PAGE1_IDS`, `PAGE2_IDS`), set up `context.route()` to intercept all HN requests. Simplified tests 5, 8, 9, 10 to use known IDs directly instead of discovering them via navigation. Replaced `waitForTimeout(2000-3000)` with `waitForSelector` + brief 500ms waits. Strengthened assertions to check exact IDs. Added Test 12 (smoke test) serving captured real HN pages from `test/fixtures/`. Created `test/fixtures/page1.html` and `test/fixtures/page2.html`. All 12 tests (24 assertions) pass with zero live network requests.

Formatted the captured HTML fixture files (`test/fixtures/page1.html`, `page2.html`) with Prettier for readability via `npx prettier --write`.

Reduced synthetic fixtures from 30 to 5 stories per page. Added `STORIES_PER_PAGE` constant used across all synthetic test assertions and fixture generation. Fake page 1 filler arrays now computed from the constant. Real fixture smoke test (test 12) unchanged at 30 stories. All 24 assertions pass.

Extracted real fixture data to `test/fixtures/index.js` — exports `page1HTML`, `page2HTML`, `page1IDs`, and `page2IDs`. Removed `fs` import and inline ID arrays from `test/test.js`, replaced with `require("./fixtures")`.

Added per-test timing output to test runner. Diagnosed test 5 taking 30 seconds — `page.waitForFunction()` had swapped argument order (`options` and `arg` reversed). Playwright's signature is `(fn, arg, options)` but we passed `(fn, {timeout: 5000}, STORIES_PER_PAGE)`. The timeout was ignored (defaulting to 30s) and the page function's argument was a truthy object instead of the story count. Fixed argument order. Test 5 now completes in ~33ms.

## Demo Fixes

Fixed `test/demo.js` not showing gap stories. The modified page 1 snapshot was using `Date.now()` as the timestamp, so the dwell time check in `content.js` saw it as "just viewed" and skipped the gap detection fetch. Changed to `Date.now() - 120_000` to exceed the 60-second dwell threshold.

Reduced `test/demo.js` wait times from 2000/2000/3000ms to 1000/1000/1500ms to speed up the demo flow.

## Race Condition Fix

Identified and fixed a race condition where a gap story could appear twice — once injected at the top and once natively in the current page list. Planned and implemented in `docs/plans/quiet-booping-diffie.md`. Added `currentStoryIds` set to `content.js` and updated the `gapStories` filter to exclude stories already present on the current page.

Ran tests (all 24 passed) and added Test 13 to cover the race condition fix: a story present on both the fresh previous page and the current page should not be injected as a gap. Added `page2IdsOverride` to the route handler for fine-grained fixture control. 26 tests, 26 assertions pass.

Updated deviations doc, HOW_IT_WORKS.md, and README.md to reflect the race condition fix and new Test 13. Deviations doc notes the addition of Test 13 and `page2IdsOverride` as the only deviation from the plan. README test count updated to 13 tests / 26 assertions. HOW_IT_WORKS updated lifecycle step 9 and testing section.

Committed race condition fix, test, plan docs, and supporting doc updates.

## Prompt History Sections

Added commit-based section headers to PROMPT_HISTORY.md (`docs/plans/sparkling-prancing-russell.md`).

Added a PreToolUse hook on Bash that appends a `---` divider to PROMPT_HISTORY.md and stages it whenever a `git commit` is about to run, so each commit automatically seals the history entries that preceded it.

Updated the UserPromptSubmit hook and CLAUDE.md to instruct: when making a commit, if PROMPT_HISTORY.md ends with a `---` divider, replace it with a `## [commit subject]` header, then append a new `---` at the end.

Fixed two grammar nits in CLAUDE.md prompt history instructions: "may have not been" → "may not have been" and "If it does" → "If so".

Removed PreToolUse auto-seal hook. Moved `---` divider and `## header` management back to manual instructions in CLAUDE.md and the UserPromptSubmit hook.

## Add gap story IDs to page snapshot

Reviewed project and `docs/HOW_IT_WORKS.md`. Discussed whether gap stories should be tracked after injection — should they be added to the current page's snapshot, tracked separately, or ignored? Decided gap story IDs should be appended to the current page's snapshot so downstream pages treat them as "seen."

Planned and approved `docs/plans/squishy-chasing-kettle.md`. Implemented: after gap injection in `content.js`, gap story IDs are appended to `storyIds` and the page snapshot is re-written to session storage. Added Test 14 (4 assertions) verifying gap IDs appear in the updated snapshot. Updated `docs/HOW_IT_WORKS.md` with new step 12. All 30 assertions pass.

## Refactor content.js into separate modules

Discussed refactoring `content.js` to isolate responsibilities. Identified five concerns: parsing, storage, duplicate detection, gap detection, and orchestration.

Planned and approved `docs/plans/mutable-crunching-frog.md`. Split `content.js` (106 lines) into five files: `parse.js` (pure DOM parsing), `storage.js` (chrome.storage.session wrapper), `duplicates.js` (detection and marking), `gaps.js` (fetch, detection, injection), and `content.js` (slim orchestrator, ~40 lines). Updated `manifest.json` to list all files in execution order. No build step needed — MV3 content scripts share scope when listed in the manifest array. All 14 tests (30 assertions) pass unchanged.

Created `src/` directory and moved all extension source files (`background.js`, `content.js`, `parse.js`, `storage.js`, `duplicates.js`, `gaps.js`, `pagegap.css`) into it. Updated `manifest.json` paths with `src/` prefix. All 14 tests (30 assertions) pass.

Replaced scattered mid-flow early returns in `content.js` orchestrator with forward-looking conditional blocks for gap detection. Fetch error uses `.catch(() => null)` instead of try/catch-return. Moved `pageNum > 1` and `prevSnapshot` checks from early returns to nested conditionals — page 1 is normal execution, not a precondition failure. Only the path guard (wrong page) remains as an early return.

Split duplicate and gap logic into separate `handleDuplicates()` and `handleGaps()` functions in `content.js`, each with independent flows. The orchestrator calls both sequentially under `if (pageNum > 1)`. Each handler owns its own precondition checks.

Extracted snapshot creation into `handleSnapshot()` function returning `{ pageNum, currentStories, storyIds }`. Moved `pageNum <= 1` back to an early return at the orchestrator level (user edit). Lifted `!prevSnapshot` guard from both `handleDuplicates` and `handleGaps` into the orchestrator as an early return. Renamed `handleSnapshot` to `handleSaveSnapshot` (user edit). Moved `getPageNumber()` call to the orchestrator, passing `pageNum` into `handleSaveSnapshot`. Refactored `duplicates.js` to work with IDs instead of story objects: renamed `findDuplicates` to `findDuplicateIds` (filters ID arrays), `markDuplicates` now takes duplicate IDs and looks up DOM rows via `document.getElementById`. `handleDuplicates` now receives `storyIds` instead of `currentStories`.

Added `getStoriesFromDOM(storyIds)` to `parse.js` for looking up story rows by ID. Removed `currentStories` from the orchestrator — `handleGaps` now takes `storyIds` directly and builds its Set from the ID array. `handleSaveSnapshot` returns just the ID array.

Moved `gapStories.length` and `firstStory` checks into `injectGapStories` in `gaps.js` — it now finds its own reference row and handles empty input. Snapshot update (`storyIds.push` + `saveSnapshot`) moved outside the conditional block in `handleGaps`.

Restructured modules by capability instead of feature. Moved `fetchFreshPreviousPage` into `parse.js` (DOM reads + fetch). Moved `findDuplicateIds` and `findGapStories` into `content.js` (data logic + orchestration). Created `render.js` for DOM writes (`markDuplicates`, `injectGapStories`). Deleted `gaps.js` and `duplicates.js`. Updated `manifest.json`.

Renamed `fetchFreshPreviousPage` → `fetchPage` (generic, caller passes page number). Renamed `findGapStories` → `findGapIds` (operates on and returns ID arrays). Updated `handleGaps` to work with IDs throughout.

Replaced `parseStories` with `parseStoryIds(doc)` (returns just IDs). Renamed `getStoriesFromDOM` → `getStoriesFromDoc(storyIds, doc)` (accepts any document). Gap injection uses `getStoriesFromDoc(gapIds, freshDoc)` to resolve story objects from the fetched document. Removed `parseStories` entirely.

Extracted `STORY_ROW_SELECTOR` constant in `parse.js`, used in `parseStoryIds`, `getStoriesFromDoc`, and `render.js`'s `injectGapStories`.

Extracted remaining magic strings in `render.js` into constants in `parse.js`: `TITLE_LINK_SELECTOR`, `DUPLICATE_CLASS`, `DUPLICATE_PREFIX`.

Attempted to fix `storyIds` mutation side effect in `handleGaps` (return gap IDs, let orchestrator push+save), but it caused browser crashes in tests. Reverted.

Extracted dwell time check from `handleGaps` into `isDwellMet(prevSnapshot)` function, called as a policy gate in the orchestrator alongside the other early returns.

Removed Set construction from `handleDuplicates` and `handleGaps`. `findDuplicateIds` and `findGapIds` now take plain arrays and use `.includes()`. Handlers pass `prevSnapshot.storyIds` and `storyIds` directly.

Consolidated `render.js` into `parse.js` — appended `markDuplicates` and `injectGapStories` to the end of `parse.js`. Deleted `render.js`, updated `manifest.json`. Renamed `parse.js` → `page.js` to reflect its broader scope (constants, DOM reads, fetch, DOM writes).

Restructured `test/test.js`: each test is now a standalone function with its own state setup. Runner clears storage before each test. Tests 3-4 navigate to page 1 themselves instead of relying on test 1. Extracted `getServiceWorker` helper, navigation helpers (`goToPage`, `goToPageAndWaitForInjection`), and DOM query helpers (`storyCount`, `storyIds`, `duplicateCount`, `duplicateIds`).

Updated deviations doc with 8 deviations from the original plan (capability-based modules, abstraction levels, ID-based functions, Set removal, constants, dwell extraction, test restructuring, fetchPage generalization). Updated `HOW_IT_WORKS.md` file listing and test description. Updated `README.md` test count. All 14 tests (30 assertions) pass.

## Rename project from PageGap to LeapStories

Brainstormed names based on the extension's mechanics (HN-specific, dynamic pagination, stories that leap between pages). Settled on LeapStories — stories that leap between pages, with a loose analogy to leap year filling a gap the normal system misses.

Renamed all internal references: extension name in manifest, CSS file (`pagegap.css` → `leapstories.css`), CSS class (`pagegap-duplicate` → `leapstories-duplicate`), storage key (`pagegap_dwell` → `leapstories_dwell`), IIFE function name, npm package name, and all active docs. Directory left as `/pagegap` to preserve Claude session memory. Historical docs (prompt history, plan files, session logs) left unchanged.

Plan: `docs/plans/steady-tickling-moonbeam.md`

## Add customizable duplicate prefix and opacity settings

Discussed making the pre-title text and CSS opacity for duplicate stories user-configurable. Decided to expose both via an options page backed by `chrome.storage.local`. CSS approach: keep the `.leapstories-duplicate` class on rows for user stylesheets, but move opacity to inline style so it can be driven by settings.

Planned and approved `docs/plans/polished-dazzling-moon.md`. Created `src/settings.js` (read/write settings with defaults), `src/options.html` and `src/options.js` (options page UI). Updated `src/page.js`: removed `DUPLICATE_PREFIX` constant, updated `markDuplicates` to accept a `settings` object, applies `settings.duplicatePrefix` to title and `settings.duplicateOpacity` as inline style. Updated `src/content.js`: loads settings once in the IIFE, threads them to `handleDuplicates`. Updated `src/leapstories.css`: removed hardcoded opacity rule, left class as a comment hook for custom stylesheets. Updated `manifest.json`: added `src/settings.js` to content scripts, added `options_ui`.

Updated `README.md` with an Options section (table of settings, class hook note). Updated `docs/HOW_IT_WORKS.md`: added `settings.js` and `options.html/js` to file listing, updated duplicate detection section, split storage schema into session vs. local with full schemas for both.

Removed `src/leapstories.css` (now empty of rules — opacity moved to inline style) and dropped its entry from `manifest.json`.

## Move dwell config to user settings

Moved dwell time from `chrome.storage.session` (`leapstories_dwell` key, reset on browser close) to the persistent `chrome.storage.local` settings. Added `dwellSeconds` to `SETTINGS_DEFAULTS` in `settings.js` (default 60). Removed `getDwellConfig()` from `storage.js`. Updated `isDwellMet` in `content.js` to read from settings (now synchronous, takes settings param). Added dwell time field to options page. Updated `README.md` options table and `HOW_IT_WORKS.md` storage schema and lifecycle description.

## Add extension icon and toolbar popup

Created an SVG icon (orange side-view frog with page lines across its body) and generated 16x16, 48x48, and 128x128 PNGs. Added `icons` and `action` fields to `manifest.json`.

Created `src/popup.html` (compact settings popup reusing `options.js` and `settings.js`) and `src/popup_disabled.html` (inactive message for non-HN pages). Content script sends a message to the background script on HN pages to swap the popup from disabled to settings. No additional permissions required.

## Add MIT license

Comprehensive review of the repo for public release readiness. Added MIT LICENSE file and updated `package.json` license field from ISC to MIT.

## Update README and add screenshots for publishing

Planned deployment and distribution strategy (`docs/plans/partitioned-baking-map.md`). Created `docs/PUBLISHING_GUIDE.md` with step-by-step instructions for GitHub, Chrome Web Store, and Firefox Add-ons publishing.

Restructured README for public release: added Chrome Web Store install section (pending approval), screenshot, privacy section, and reorganized into user-facing and development sections. Added annotated screenshots to `assets/`.

## Firefox testing support

Designed and built the extension for Chrome. Now want to test on Firefox. Planned and approved `docs/plans/mutable-wobbling-nebula.md`.

Implementing plan `mutable-wobbling-nebula.md`: Guarded `chrome.storage.session.setAccessLevel()` in `src/background.js` (Firefox doesn't support it, doesn't need it). Created `scripts/build-firefox.js` to generate a Firefox-compatible manifest (replaces `service_worker` with `scripts` array, adds `browser_specific_settings.gecko`). Added `web-ext` devDependency and `build:firefox`/`open:firefox` npm scripts. Added `dist-firefox/` to `.gitignore`. Lint passes with zero errors.

Follow-up to plan `mutable-wobbling-nebula.md`: Fixed two Firefox compatibility issues discovered during manual testing. First, the `setAccessLevel` guard crashed because `chrome.storage.session` itself is `undefined` in Firefox — extended the guard to check `chrome.storage.session &&` before accessing `.setAccessLevel`. Second, Firefox doesn't expose `chrome.storage.session` via the `chrome.*` compat shim at all (even though `browser.storage.session` exists in Firefox 115+, it was also undefined in practice). Updated `scripts/build-firefox.js` to patch the copied `storage.js`, replacing `chrome.storage.session` with `browser.storage.local`. Created `docs/plans/mutable-wobbling-nebula_deviations.md`.

## Add Firefox testing support

---
