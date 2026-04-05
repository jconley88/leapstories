async function saveSnapshot(pageNum, storyIds) {
  await chrome.storage.session.set({
    [`page_${pageNum}`]: { storyIds, timestamp: Date.now() },
  });
}

async function getSnapshot(pageNum) {
  const key = `page_${pageNum}`;
  const stored = await chrome.storage.session.get(key);
  return stored[key] || null;
}

async function getDwellConfig() {
  const dwellConfig = await chrome.storage.session.get("pagegap_dwell");
  return dwellConfig.pagegap_dwell ?? 60_000;
}
