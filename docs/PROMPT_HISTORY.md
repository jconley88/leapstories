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

---