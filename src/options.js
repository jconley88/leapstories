const gapPrefixInput = document.getElementById("gap-prefix");
const prefixInput = document.getElementById("duplicate-prefix");
const opacityInput = document.getElementById("duplicate-opacity");
const dwellInput = document.getElementById("dwell-seconds");
const updatesInput = document.getElementById("check-for-updates");
const status = document.getElementById("status");

getSettings().then((settings) => {
  gapPrefixInput.value = settings.gapPrefix;
  prefixInput.value = settings.duplicatePrefix;
  opacityInput.value = settings.duplicateOpacity;
  dwellInput.value = settings.dwellSeconds;
  updatesInput.checked = settings.checkForUpdates;
  if (settings.checkForUpdates) showUpdateBanner();
});

document.getElementById("options-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const checkForUpdates = updatesInput.checked;
  await saveSettings({
    gapPrefix: gapPrefixInput.value,
    duplicatePrefix: prefixInput.value,
    duplicateOpacity: parseFloat(opacityInput.value),
    dwellSeconds: parseInt(dwellInput.value, 10),
    checkForUpdates,
  });
  if (!checkForUpdates) {
    document.getElementById("update-banner").style.display = "none";
    chrome.runtime.sendMessage({ type: "leapstories_reset_icon" });
  }
  status.textContent = "Saved.";
  setTimeout(() => { status.textContent = ""; }, 1500);
});

function showUpdateBanner() {
  chrome.storage.local.get("leapstories_version_check").then((data) => {
    const info = data.leapstories_version_check;
    if (!info || !info.latestVersion) return;
    const current = chrome.runtime.getManifest().version;
    if (isNewerVersion(info.latestVersion, current)) {
      document.getElementById("update-current").textContent = "v" + current;
      document.getElementById("update-latest").textContent = "v" + info.latestVersion;
      document.getElementById("update-link-github").href = CONFIG.githubReleasesUrl;
      const isFirefox = typeof browser !== "undefined";
      document.getElementById("update-link-store").href =
        isFirefox ? CONFIG.firefoxAddonsUrl : CONFIG.chromeStoreUrl;
      document.getElementById("update-banner").style.display = "block";
    }
  });
}
