const SETTINGS_DEFAULTS = {
  gapPrefix: "",
  duplicatePrefix: "seen on previous page \u2014 ",
  duplicateOpacity: 0.4,
  dwellSeconds: 60,
  checkForUpdates: true,
};

async function getSettings() {
  const stored = await chrome.storage.local.get("leapstories_settings");
  return { ...SETTINGS_DEFAULTS, ...(stored.leapstories_settings || {}) };
}

async function saveSettings(settings) {
  await chrome.storage.local.set({ leapstories_settings: settings });
}

function isNewerVersion(remote, local) {
  const r = remote.split(".").map(Number);
  const l = local.split(".").map(Number);
  for (let i = 0; i < Math.max(r.length, l.length); i++) {
    if ((r[i] || 0) > (l[i] || 0)) return true;
    if ((r[i] || 0) < (l[i] || 0)) return false;
  }
  return false;
}
