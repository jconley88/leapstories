# Changelog

## 1.1.0

- Add configurable gap story prefix — optionally label stories injected from the gap between pages (default: empty/no prefix)

## 1.0.0 — Initial Release

- Detect stories missed during Hacker News page navigation and inject them at the top of the current page
- Dim duplicate stories that appear on both the previous and current page, with configurable prefix text and opacity
- Configurable minimum dwell time before re-fetching the previous page
- Settings accessible via toolbar popup (on HN pages) and full options page
- Optional daily version check against GitHub releases, with icon change and banner when an update is available
- Firefox support via build script
- All data stored locally — no analytics, no tracking
