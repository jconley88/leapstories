# PageGap

Browser extension for news.ycombinator.com that detects stories missed during pagination.

## What it does

When browsing HN, stories constantly shift position as they gain/lose rank. When you finish reading page 1 and click to page 2, some stories that were on page 2 may have risen to page 1 in the interim — meaning you never see them. PageGap catches these "gap" stories by:

1. Recording which stories were visible when you viewed a page
2. When navigating to the next page, silently re-fetching the previous page
3. Comparing the fresh fetch against what you originally saw
4. Surfacing any stories that rose into the previous page's range (and thus fell out of the current page)

## Tech

- Browser extension (Manifest V3)
- Target: Chrome (with Firefox compatibility as a secondary goal)
- No external dependencies beyond browser extension APIs
- Target domain: news.ycombinator.com

## Project structure

TBD — project is in initial setup.

## Development

- Load unpacked extension from the project directory in chrome://extensions
- Enable developer mode for testing
- `node test/open.js` — launch browser with extension for manual testing
- `node test/test.js` — automated verification of extension loading

## Prompt History

Maintain two files tracking any user directive that results in meaningful state changes (file edits, new files, commits, branch operations, etc.). This includes typed prompts, plan approvals, tool confirmations, and any other trigger that causes work to happen — not just direct text prompts.

- `docs/PROMPT_HISTORY.md` — cleaned up: fix grammar, typos, and readability. Keep it natural and concise, not overly polished.
- `docs/PROMPT_HISTORY_ORIG.md` — directives with minimal inline context clarifications (in parentheses) to fill in missing references. Preserve original wording where applicable. (Gitignored, not committed.)

Do not include discussion, questions, or directives that did not lead to state changes.
Redact or omit personal information (names, emails, paths containing usernames, API keys, etc.) and security-sensitive details.
When work is part of an approved plan, reference the plan filename (e.g., `docs/plans/zippy-petting-lobster.md`) in the prompt history entry. Indicate when a plan is approved/started and when subsequent entries are follow-ups to that plan.

## Plan Documentation

When a plan is approved (via ExitPlanMode), copy the plan file to `docs/plans/` using the default plan filename.

When implementation of an approved plan is complete, create a deviations document in `docs/plans/` alongside the plan file. Name it by replacing `_plan` or the plan suffix with `_deviations` in the filename. Document any differences between the plan and what was actually built, with explanations for why each deviation occurred. If there were no deviations, note that explicitly in a short file.
