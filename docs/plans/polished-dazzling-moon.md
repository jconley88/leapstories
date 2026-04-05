# Plan: Customizable Duplicate Prefix and Opacity

## Context

Two visual properties for duplicate story markup are currently hardcoded:
- Pre-title text: `"seen on previous page — "` (in `src/page.js:4`)
- CSS opacity: `0.4` (in `src/leapstories.css:5`)

Users should be able to customize both via an options page backed by `chrome.storage.local`.

---

## Changes

### 1. New: `src/settings.js`

Shared settings module (used by content scripts and options page).

```js
const SETTINGS_DEFAULTS = {
  duplicatePrefix: "seen on previous page \u2014 ",
  duplicateOpacity: 0.4,
};

async function getSettings() {
  const stored = await chrome.storage.local.get("leapstories_settings");
  return { ...SETTINGS_DEFAULTS, ...(stored.leapstories_settings || {}) };
}

async function saveSettings(settings) {
  await chrome.storage.local.set({ leapstories_settings: settings });
}
```

### 2. Modify: `src/page.js`

- Remove `DUPLICATE_PREFIX` constant (line 4)
- Update `markDuplicates(duplicateIds)` → `markDuplicates(duplicateIds, settings)`
  - Apply `settings.duplicatePrefix` instead of the constant
  - Apply `settings.duplicateOpacity` as `row.style.opacity` (both athingRow and subtextRow)
  - Remove `athingRow.classList.add(DUPLICATE_CLASS)` opacity is now inline, but keep the class for user CSS targeting

### 3. Modify: `src/content.js`

- Load settings once at the top of the `leapstories()` IIFE via `getSettings()`
- Pass `settings` to `handleDuplicates(storyIds, prevSnapshot, settings)`
- Update `handleDuplicates` signature to accept and forward `settings` to `markDuplicates`

### 4. Modify: `src/leapstories.css`

Remove the `opacity: 0.4` rule (now applied inline). Keep the `.leapstories-duplicate` selector as a comment/hook for users writing their own stylesheets:

```css
/* LeapStories visual annotations */

/* Duplicate stories: already seen on previous page */
/* .leapstories-duplicate — class added to duplicate story rows for custom CSS */
```

### 5. New: `src/options.html`

Simple options page with two fields:
- Text input for prefix (label: "Duplicate story prefix")
- Number input for opacity 0–1, step 0.05 (label: "Duplicate story opacity")
- Save button

Includes `<script src="settings.js"></script>` and `<script src="options.js"></script>`.

### 6. New: `src/options.js`

Loads current settings into the form on page load, saves on submit.

### 7. Modify: `manifest.json`

- Add `"src/settings.js"` to `content_scripts[].js` (before `page.js`)
- Add `options_ui: { "page": "src/options.html", "open_in_tab": true }`

---

## File Summary

| File | Action |
|------|--------|
| `src/settings.js` | Create |
| `src/options.html` | Create |
| `src/options.js` | Create |
| `src/page.js` | Modify (remove constant, update `markDuplicates` signature) |
| `src/content.js` | Modify (load settings, thread through to `markDuplicates`) |
| `src/leapstories.css` | Modify (remove opacity rule, leave class as hook) |
| `manifest.json` | Modify (add settings.js to content scripts, add options_ui) |

---

## Verification

1. Load unpacked extension, navigate to HN page 2 — duplicates should appear dimmed at default opacity (0.4) with default prefix
2. Open extension options (right-click icon → Options, or chrome://extensions), change prefix and opacity, save
3. Reload HN page 2 — duplicates reflect new values
4. Write a custom user stylesheet targeting `.leapstories-duplicate` and verify it applies correctly
