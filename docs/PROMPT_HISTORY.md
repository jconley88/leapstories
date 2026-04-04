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
