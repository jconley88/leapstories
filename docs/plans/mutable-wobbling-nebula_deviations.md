# Deviations: mutable-wobbling-nebula

## Deviation 1: `setAccessLevel` guard extended

**Plan:** `if (chrome.storage.session.setAccessLevel) { ... }`

**Actual:** `if (chrome.storage.session && chrome.storage.session.setAccessLevel) { ... }`

**Why:** `chrome.storage.session` itself is `undefined` in Firefox, so accessing `.setAccessLevel` on it threw a TypeError before the condition could evaluate to false.

## Deviation 2: `storage.js` patched to use `browser.storage.local` instead of `chrome.storage.session`

**Plan:** The plan assumed `chrome.storage.session` would work in Firefox via the `chrome.*` compat shim.

**Actual:** `chrome.storage.session` is not exposed by Firefox's compat shim. `browser.storage.session` (added in Firefox 115) was also undefined in testing. The build script patches the copied `storage.js` to use `browser.storage.local` instead.

**Why:** Firefox simply doesn't support `chrome.storage.session`. Using `local` is functionally equivalent — snapshots just persist across browser restarts rather than being cleared on close.
