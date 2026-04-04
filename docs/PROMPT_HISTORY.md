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

Set up an automated process to remind Claude to update the history files after each response. Implemented as a Stop hook in .claude/settings.json.

Restructure prompt history files: the raw file now includes inline context clarifications, and a new edited file has grammar and typo fixes for readability. Rename ANNOTATED accordingly and update CLAUDE.md.

Renamed PROMPT_HISTORY to PROMPT_HISTORY_ORIG and PROMPT_HISTORY_EDITED to PROMPT_HISTORY. Added PROMPT_HISTORY_ORIG to .gitignore. Updated all references.

Split into two commits: initial project setup, then prompt history tracking separately.

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

Add a PostToolUse hook on ExitPlanMode that reminds Claude to copy the plan file to `docs/plans/` and to create a deviations doc upon implementation completion. Added corresponding instructions to CLAUDE.md.

Create `docs/FUTURE_WORK.md` with items deferred from v1: duplicate detection (stories that dropped down), multi-page tracking, and support for other listing pages.

Create `docs/HOW_IT_WORKS.md` documenting the extension's architecture, lifecycle, storage schema, DOM interaction, and limitations. Update `README.md` with the problem description, how it works, testing commands, and current scope.

Planned and approved a 60-second minimum dwell time before re-fetching the previous page (`docs/plans/zippy-petting-lobster.md`).

Implementing plan `zippy-petting-lobster.md`: Added dwell time check to `content.js` — if the previous page was viewed less than 60 seconds ago, skip the re-fetch. Added Test 8 to verify the dwell time check blocks re-fetches for recent pages.

Follow-up to plan `zippy-petting-lobster.md`: Made the dwell time configurable via `pagegap_dwell` in session storage (defaults to 60,000ms). Tests set it to 0 to bypass the check, and Test 8 explicitly sets it to 60,000 to verify blocking. Allows adjusting the threshold during manual testing from the DevTools console.

Updated deviations doc (`docs/plans/zippy-petting-lobster_deviations.md`) with three deviations from the original plan: configurable dwell threshold, no backdated timestamps in tests, and `pagegap_dwell` restoration after `clearStorageSession`. Updated `HOW_IT_WORKS.md` with dwell time check in lifecycle and `pagegap_dwell` in storage schema. Updated `README.md` test count to 8 tests/13 assertions.

Retroactively added plan filename references to prompt history entries (both v1 plan and dwell time plan were missing them). Added instruction to CLAUDE.md Prompt History section and UserPromptSubmit hook to reference plan filenames when work is part of an approved plan.
