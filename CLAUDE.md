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
