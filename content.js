(async function pagegap() {
  // Only run on news listing pages (/ and /news)
  const path = window.location.pathname;
  if (path !== "/" && path !== "/news") return;

  const pageNum = parseInt(new URLSearchParams(window.location.search).get("p") || "1", 10);

  // Parse stories from a document (live DOM or fetched HTML)
  function parseStories(doc) {
    const rows = doc.querySelectorAll("tr.athing.submission");
    const stories = [];
    for (const row of rows) {
      const id = row.id;
      const rankEl = row.querySelector(".rank");
      const rank = rankEl ? parseInt(rankEl.textContent, 10) : null;
      // Each story is 3 rows: athing, subtext, spacer
      const subtextRow = row.nextElementSibling;
      const spacerRow = subtextRow ? subtextRow.nextElementSibling : null;
      stories.push({ id, rank, athingRow: row, subtextRow, spacerRow });
    }
    return stories;
  }

  // Store snapshot of current page
  const currentStories = parseStories(document);
  const storyIds = currentStories.map((s) => s.id);
  await chrome.storage.session.set({
    [`page_${pageNum}`]: { storyIds, timestamp: Date.now() },
  });

  // Only do gap detection on page 2+
  if (pageNum <= 1) return;

  // Check if we have a snapshot of the previous page
  const prevKey = `page_${pageNum - 1}`;
  const stored = await chrome.storage.session.get(prevKey);
  const prevSnapshot = stored[prevKey];
  if (!prevSnapshot) return;

  // Skip re-fetch if previous page was viewed too recently (default 60s, configurable via session storage)
  const dwellConfig = await chrome.storage.session.get("pagegap_dwell");
  const dwellMs = dwellConfig.pagegap_dwell ?? 60_000;
  const elapsed = Date.now() - prevSnapshot.timestamp;
  if (elapsed < dwellMs) return;

  const prevSnapshotIds = new Set(prevSnapshot.storyIds);

  // Fetch fresh copy of previous page
  let freshDoc;
  try {
    const resp = await fetch(
      `${window.location.origin}/news?p=${pageNum - 1}`
    );
    const html = await resp.text();
    freshDoc = new DOMParser().parseFromString(html, "text/html");
  } catch {
    return; // silently skip on fetch failure
  }

  const freshStories = parseStories(freshDoc);

  // Gap stories: in fresh previous page but NOT in the original snapshot
  // These rose into the previous page after we left it
  const gapStories = freshStories.filter((s) => !prevSnapshotIds.has(s.id));

  if (gapStories.length === 0) return;

  // Inject gap stories at the top of the current page's story list
  const firstStory = document.querySelector("tr.athing.submission");
  if (!firstStory) return;

  const table = firstStory.parentElement;

  for (const gap of gapStories) {
    // Import nodes from the parsed document into our live document
    const athingClone = document.importNode(gap.athingRow, true);
    const subtextClone = gap.subtextRow
      ? document.importNode(gap.subtextRow, true)
      : null;
    const spacerClone = gap.spacerRow
      ? document.importNode(gap.spacerRow, true)
      : null;

    // Insert before the first existing story (in order)
    table.insertBefore(athingClone, firstStory);
    if (subtextClone) table.insertBefore(subtextClone, firstStory);
    if (spacerClone) table.insertBefore(spacerClone, firstStory);
  }
})();
