const STORY_ROW_SELECTOR = "tr.athing.submission";
const TITLE_LINK_SELECTOR = ".titleline > a";
const DUPLICATE_CLASS = "leapstories-duplicate";

function getPageNumber() {
  return parseInt(new URLSearchParams(window.location.search).get("p") || "1", 10);
}

function parseStoryIds(doc) {
  const rows = doc.querySelectorAll(STORY_ROW_SELECTOR);
  return Array.from(rows, (row) => row.id);
}

function getStoriesFromDoc(storyIds, doc) {
  return storyIds.map((id) => {
    const row = doc.getElementById(id);
    if (!row) return null;
    const subtextRow = row.nextElementSibling;
    const spacerRow = subtextRow ? subtextRow.nextElementSibling : null;
    return { id, athingRow: row, subtextRow, spacerRow };
  }).filter(Boolean);
}

async function fetchPage(pageNum) {
  const resp = await fetch(`${window.location.origin}/news?p=${pageNum}`);
  const html = await resp.text();
  return new DOMParser().parseFromString(html, "text/html");
}

function markDuplicates(duplicateIds, settings) {
  for (const id of duplicateIds) {
    const athingRow = document.getElementById(id);
    if (!athingRow) continue;
    athingRow.classList.add(DUPLICATE_CLASS);
    athingRow.style.opacity = settings.duplicateOpacity;
    const subtextRow = athingRow.nextElementSibling;
    if (subtextRow) {
      subtextRow.classList.add(DUPLICATE_CLASS);
      subtextRow.style.opacity = settings.duplicateOpacity;
    }
    const titleLink = athingRow.querySelector(TITLE_LINK_SELECTOR);
    if (titleLink) titleLink.textContent = settings.duplicatePrefix + titleLink.textContent;
  }
}

function injectGapStories(gapStories, settings) {
  if (gapStories.length === 0) return;
  const referenceRow = document.querySelector(STORY_ROW_SELECTOR);
  if (!referenceRow) return;
  const table = referenceRow.parentElement;
  for (const gap of gapStories) {
    const athingClone = document.importNode(gap.athingRow, true);
    const subtextClone = gap.subtextRow
      ? document.importNode(gap.subtextRow, true)
      : null;
    const spacerClone = gap.spacerRow
      ? document.importNode(gap.spacerRow, true)
      : null;
    if (settings.gapPrefix) {
      const titleLink = athingClone.querySelector(TITLE_LINK_SELECTOR);
      if (titleLink) titleLink.textContent = settings.gapPrefix + titleLink.textContent;
    }
    table.insertBefore(athingClone, referenceRow);
    if (subtextClone) table.insertBefore(subtextClone, referenceRow);
    if (spacerClone) table.insertBefore(spacerClone, referenceRow);
  }
}
