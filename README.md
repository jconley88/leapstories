# PageGap

Browser extension that catches Hacker News stories missed between page navigations.

## The problem

When browsing HN, stories shift rank constantly. By the time you finish page 1 and click "More," some stories that were on page 2 may have risen into page 1's range. They disappear from page 2 entirely — you never see them.

## How it works

PageGap records which stories you saw on each page. When you navigate to the next page, it silently re-fetches the previous page, compares it against your original snapshot, and injects any stories that rose into the gap at the top of your current page. Stories that fell from the previous page and appear as duplicates are dimmed.

## Install

1. Open `chrome://extensions`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked** and select this project directory

## Verify

1. Go to https://news.ycombinator.com
2. Click "More" to go to page 2
3. If any stories shifted between your page 1 visit and now, they'll appear at the top of page 2

## Testing

```bash
# Automated test suite (12 tests, 24 assertions) — uses local fixtures, no live network
node test/test.js

# Visual demo — simulates gap stories and leaves browser open for inspection
node test/demo.js

# Manual testing — opens browser with extension loaded
node test/open.js
```

Requires [Playwright](https://playwright.dev/) (`npm install`). Tests use Playwright route interception to serve synthetic and captured HTML fixtures — no connection to live HN.

## Scope

Currently targets only the default top stories listing (`/` and `/news`). Does not run on `/newest`, `/front`, `/ask`, `/show`, or other pages.
