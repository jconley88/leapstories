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

async function handleDuplicates(storyIds, prevSnapshot) {
  markDuplicates(findDuplicateIds(storyIds, prevSnapshot.storyIds));
}

async function isDwellMet(prevSnapshot) {
  const dwellMs = await getDwellConfig();
  const elapsed = Date.now() - prevSnapshot.timestamp;
  return elapsed >= dwellMs;
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

(async function pagegap() {
  const path = window.location.pathname;
  if (path !== "/" && path !== "/news") return;

  const pageNum = getPageNumber();
  const storyIds = await handleSaveSnapshot(pageNum);

  if (pageNum <= 1) { return }
  const prevSnapshot = await getSnapshot(pageNum - 1);
  if (!prevSnapshot) { return }
  await handleDuplicates(storyIds, prevSnapshot);
  if (!await isDwellMet(prevSnapshot)) { return }
  await handleGaps(pageNum, storyIds, prevSnapshot);
})();
