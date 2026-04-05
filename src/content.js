function findDuplicateIds(storyIds, prevStoryIds) {
  return storyIds.filter((id) => prevStoryIds.includes(id));
}

function findGapIds(freshStoryIds, prevStoryIds, currentStoryIds) {
  return freshStoryIds.filter(
    (id) => !prevStoryIds.includes(id) && !currentStoryIds.includes(id)
  );
}

async function handleSaveSnapshot(pageNum) {
  const storyIds = parseStoryIds(document);
  await saveSnapshot(pageNum, storyIds);
  return storyIds;
}

async function handleDuplicates(storyIds, prevSnapshot, settings) {
  markDuplicates(findDuplicateIds(storyIds, prevSnapshot.storyIds), settings);
}

function isDwellMet(prevSnapshot, settings) {
  const elapsed = Date.now() - prevSnapshot.timestamp;
  return elapsed >= settings.dwellSeconds * 1000;
}

async function handleGaps(pageNum, storyIds, prevSnapshot) {
  const freshDoc = await fetchPage(pageNum - 1).catch(() => null);
  if (!freshDoc) return;

  const freshStoryIds = parseStoryIds(freshDoc);
  const gapIds = findGapIds(freshStoryIds, prevSnapshot.storyIds, storyIds);
  injectGapStories(getStoriesFromDoc(gapIds, freshDoc));
  storyIds.push(...gapIds);
  await saveSnapshot(pageNum, storyIds);
}

(async function leapstories() {
  chrome.runtime.sendMessage({ type: "leapstories_active" });

  const path = window.location.pathname;
  if (path !== "/" && path !== "/news") return;

  const pageNum = getPageNumber();
  const storyIds = await handleSaveSnapshot(pageNum);

  if (pageNum <= 1) { return }
  const prevSnapshot = await getSnapshot(pageNum - 1);
  if (!prevSnapshot) { return }
  const settings = await getSettings();
  await handleDuplicates(storyIds, prevSnapshot, settings);
  if (!isDwellMet(prevSnapshot, settings)) { return }
  await handleGaps(pageNum, storyIds, prevSnapshot);
})();
