# Plan: GitHub Version Check

## Context

LeapStories has no update mechanism. Since it's a manually-loaded unpacked extension (not on the Chrome Web Store), users have no way to know when a new version is available on GitHub. The check must only run when HN is actively loaded — never perpetually in the background — and at most once per calendar day.

## Approach

Piggyback on the existing content-script-to-background message flow. When content.js loads on an HN page, it sends a message to background.js. Background.js gates on a stored date, fetches the GitHub releases API if needed, stores the result, and sets a badge icon. The popup shows a banner linking to the release.

**No new permissions required.** MV3 service workers can fetch any URL, `chrome.action.setBadge*` needs no extra permission, and storage is already granted.

**No new files.** All changes fit into existing files.

## File Changes

### 1. `src/settings.js` — Add `isNewerVersion()` utility

Add a semver comparison function at the bottom. This file is already loaded by both popup and content scripts.

```js
function isNewerVersion(remote, local) {
  const r = remote.split(".").map(Number);
  const l = local.split(".").map(Number);
  for (let i = 0; i < Math.max(r.length, l.length); i++) {
    if ((r[i] || 0) > (l[i] || 0)) return true;
    if ((r[i] || 0) < (l[i] || 0)) return false;
  }
  return false;
}
```

### 2. `src/background.js` — Add version check handler

Add a handler for `leapstories_check_version` message:

1. Read `leapstories_version_check` from `chrome.storage.local` (`{ lastCheckDate, latestVersion }`)
2. If `lastCheckDate === today` (YYYY-MM-DD), return early
3. Fetch `https://api.github.com/repos/jconley88/leapstories/releases/latest`
   - If 404 (no releases yet), skip silently — don't update lastCheckDate so it retries next load
   - If network error, also skip silently
4. Parse `tag_name`, strip leading `v`
5. Store `{ lastCheckDate: today, latestVersion }` in `chrome.storage.local`
6. Compare against `chrome.runtime.getManifest().version`
7. If newer: `chrome.action.setBadgeText({ text: "1" })` with HN-orange background color

### 3. `src/content.js` — Trigger the check

After the existing `leapstories_active` message (line 38), add:

```js
chrome.runtime.sendMessage({ type: "leapstories_check_version" });
```

Fire-and-forget. This ensures the check only happens when HN is loaded.

### 4. `src/popup.html` — Add hidden update banner

After the `</form>`, add a hidden div with update text and a link to the releases page.

### 5. `src/options.js` — Show banner when update available

At the end of the file, read `leapstories_version_check` from storage, compare versions using `isNewerVersion()`, and if an update is available, populate and show the banner.

## Edge Cases

- **No releases on GitHub yet**: `/releases/latest` returns 404 → catch and skip, don't mark as checked so it retries next page load
- **Rate limiting**: 60 req/hour unauthenticated, once-per-day is well within this
- **Multiple tabs**: Minor race where two tabs both read "not checked today" before either writes. Harmless — two fetches, same result stored
- **Badge persistence**: Badge persists across service worker restarts. Clears naturally when user updates and version matches

## Verification

1. Load the unpacked extension in Chrome
2. Navigate to `news.ycombinator.com`
3. Open DevTools → Application → Storage → chrome.storage.local — confirm `leapstories_version_check` key appears with today's date
4. Reload HN — confirm no second fetch occurs (check Network tab in background service worker DevTools)
5. To test the "update available" path: temporarily edit manifest.json version to `0.0.1`, reload extension, clear `leapstories_version_check` from storage, navigate to HN — badge should appear and popup should show banner
