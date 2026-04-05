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
