# Plan: Firefox Testing Support for LeapStories

## Context

The extension was built for Chrome (Manifest V3). The user wants to test it on Firefox. The compatibility gap is small — only two things need changing:

1. **Manifest**: Firefox MV3 uses `"background": { "scripts": [...] }` instead of `"service_worker"`
2. **`setAccessLevel()`**: Firefox doesn't support `chrome.storage.session.setAccessLevel()` (but doesn't need it — content scripts can access session storage by default)

Everything else (`chrome.storage.session`, `chrome.storage.local`, `chrome.runtime`, `chrome.action`) works in Firefox MV3 via the `chrome.*` compat shim.

## Approach

Use `web-ext` (Mozilla's official CLI) for launching Firefox, and a small Node script to generate a Firefox-compatible manifest into a `dist-firefox/` directory.

## Steps

### 1. Guard `setAccessLevel()` in `src/background.js`

Wrap the existing call in an existence check so it's a no-op on Firefox:

```js
if (chrome.storage.session.setAccessLevel) {
  chrome.storage.session.setAccessLevel({
    accessLevel: "TRUSTED_AND_UNTRUSTED_CONTEXTS",
  });
}
```

Chrome behavior unchanged. Firefox skips it (doesn't need it).

### 2. Create `scripts/build-firefox.js`

Node script (~25 lines) that:
- Reads `manifest.json`
- Replaces `background.service_worker` with `background.scripts` array
- Adds `browser_specific_settings.gecko` with an addon ID and `strict_min_version: "115.0"` (minimum for `storage.session` support)
- Copies `src/`, `icons/` into `dist-firefox/`
- Writes the modified manifest to `dist-firefox/manifest.json`

### 3. Add `dist-firefox/` to `.gitignore`

### 4. Add `web-ext` devDependency and npm scripts to `package.json`

```json
"scripts": {
  "build:firefox": "node scripts/build-firefox.js",
  "open:firefox": "npm run build:firefox && web-ext run --source-dir dist-firefox"
}
```

Add `"web-ext": "^8.4.0"` to devDependencies.

### 5. Install dependencies

Run `npm install`.

## Files Modified

- `src/background.js` — guard `setAccessLevel()`
- `package.json` — add web-ext dep and scripts
- `.gitignore` — add `dist-firefox/`

## Files Created

- `scripts/build-firefox.js` — Firefox manifest generator + file copier

## Verification

1. `npm run open:firefox` — Firefox launches with extension loaded
2. Navigate to `news.ycombinator.com` — content script activates, popup switches to active state
3. Browse page 1, then page 2 — gap detection runs, any missed stories are injected
4. Check extension options page loads and settings persist
5. `node test/open.js` still works for Chrome (no regression)
