importScripts("config.js");

// Allow content scripts to access session storage (Chrome-only API)
if (chrome.storage.session && chrome.storage.session.setAccessLevel) {
  chrome.storage.session.setAccessLevel({
    accessLevel: "TRUSTED_AND_UNTRUSTED_CONTEXTS",
  });
}

// Clear stale version check data on install/update so the icon resets
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.remove("leapstories_version_check");
});

// Content script signals that this tab is on HN — swap to the settings popup
chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg.type === "leapstories_active" && sender.tab) {
    chrome.action.setPopup({
      tabId: sender.tab.id,
      popup: "src/popup.html",
    });
  }

  if (msg.type === "leapstories_check_version") {
    checkForUpdate();
  }

  if (msg.type === "leapstories_reset_icon") {
    chrome.action.setIcon({
      path: {
        128: "/icons/icon128.png",
        48: "/icons/icon48.png",
        16: "/icons/icon16.png",
      },
    });
  }
});

async function checkForUpdate() {
  const stored = await chrome.storage.local.get("leapstories_settings");
  if ((stored.leapstories_settings || {}).checkForUpdates === false) return;

  const data = await chrome.storage.local.get("leapstories_version_check");
  const info = data.leapstories_version_check || {};
  const today = new Date().toISOString().slice(0, 10);

  if (info.lastCheckDate === today) return;

  let latestVersion = null;
  try {
    const res = await fetch(
      CONFIG.githubApiReleasesUrl
    );
    if (res.ok) {
      const release = await res.json();
      latestVersion = release.tag_name.replace(/^v/, "");
    }
  } catch (_) {
    // network error — still update lastCheckDate
  }

  await chrome.storage.local.set({
    leapstories_version_check: {
      lastCheckDate: today,
      latestVersion: latestVersion || info.latestVersion || null,
    },
  });

  if (latestVersion) {
    const current = chrome.runtime.getManifest().version;
    const r = latestVersion.split(".").map(Number);
    const l = current.split(".").map(Number);
    let updateAvailable = false;
    for (let i = 0; i < Math.max(r.length, l.length); i++) {
      if ((r[i] || 0) > (l[i] || 0)) { updateAvailable = true; break; }
      if ((r[i] || 0) < (l[i] || 0)) break;
    }

    if (updateAvailable) {
      chrome.action.setIcon({
        path: {
          128: "/icons/icon_update128.png",
          48: "/icons/icon_update48.png",
          32: "/icons/icon_update32.png",
          16: "/icons/icon_update16.png",
        },
      });
    }
  }
}
