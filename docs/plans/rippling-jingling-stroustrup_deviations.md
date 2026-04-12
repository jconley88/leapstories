# Deviations: GitHub Version Check

## Error handling — update lastCheckDate on failure

**Plan**: On fetch error or 404, skip silently and don't update lastCheckDate so it retries next load.
**Built**: Always updates lastCheckDate, even on error.
**Why**: User explicitly requested this — avoids repeated failed fetches throughout the day.

## Update indicator — icon swap instead of badge

**Plan**: Use `chrome.action.setBadgeText({ text: "!" })` with orange background.
**Built**: Swap entire icon set to `icon_updateNN.png` variants using `chrome.action.setIcon()`. Paths require leading `/`.
**Why**: User requested icon set switching instead of badge text. Specific icon filenames specified by user.

## Popup update section — shows versions

**Plan**: Simple banner with "New version available" and download link.
**Built**: Shows current version → latest version (e.g., "v0.1.0 → v0.2.0") with download link.
**Why**: User wanted versions displayed.

## No tag fallback

**Plan**: Fall back to tags endpoint if releases endpoint returns 404.
**Built**: Only checks releases endpoint, no tag fallback.
**Why**: User explicitly said no tag parsing. Releases-only approach is simpler and aligns with the new release procedure documented in CLAUDE.md.

## Release procedure docs

**Plan**: Not included in original plan.
**Built**: Added release procedure section to CLAUDE.md.
**Why**: User requested docs for the release procedure since the feature depends on GitHub releases existing.

## Version comparison in background.js

**Plan**: Use `isNewerVersion()` from settings.js.
**Built**: Inlined the comparison in background.js since settings.js isn't loaded in the service worker context.
**Why**: Service workers don't share the content script's JS files. The utility is still in settings.js for popup use.

## Config file for URLs

**Plan**: GitHub URL hardcoded in background.js, release page URL hardcoded in options.js.
**Built**: Created `src/config.js` with all URLs (GitHub releases, GitHub API, Chrome Web Store, Firefox Add-ons). Loaded via `importScripts` in background, `<script>` tag in popup/options.
**Why**: User requested URLs be centralized in a config file.

## "Check for updates" setting

**Plan**: No user-facing toggle for the version check.
**Built**: Added `checkForUpdates` boolean to settings (default: true) with checkbox in popup and options. When disabled, background skips the check and icon resets to default.
**Why**: User requested an always-visible option to disable update checking.

## onInstalled listener

**Plan**: Not in original plan.
**Built**: `chrome.runtime.onInstalled` clears `leapstories_version_check` from storage on install/update.
**Why**: Prevents stale update indicators after the user upgrades to a new version.

## Browser-specific store links

**Plan**: Single download link to GitHub releases.
**Built**: Two links — browser extension store (Chrome Web Store or Firefox Add-ons, auto-detected) and GitHub releases. Static link text in HTML, JS only sets hrefs.
**Why**: User wanted links to both the extension store and GitHub, with content in HTML rather than JS-generated.
