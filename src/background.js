// Allow content scripts to access session storage (Chrome-only API)
if (chrome.storage.session && chrome.storage.session.setAccessLevel) {
  chrome.storage.session.setAccessLevel({
    accessLevel: "TRUSTED_AND_UNTRUSTED_CONTEXTS",
  });
}

// Content script signals that this tab is on HN — swap to the settings popup
chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg.type === "leapstories_active" && sender.tab) {
    chrome.action.setPopup({
      tabId: sender.tab.id,
      popup: "src/popup.html",
    });
  }
});
