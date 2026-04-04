const { chromium } = require("playwright");
const path = require("path");
const realFixtures = require("./fixtures");

const extensionPath = path.join(__dirname, "..");
let passed = 0;
let failed = 0;

// --- Deterministic story IDs for synthetic fixtures ---
const STORIES_PER_PAGE = 5;
const PAGE1_IDS = Array.from({ length: STORIES_PER_PAGE }, (_, i) => `${40001 + i}`); // 40001–40005
const PAGE2_IDS = Array.from({ length: STORIES_PER_PAGE }, (_, i) => `${40031 + i}`); // 40031–40035

function assert(condition, msg) {
  if (condition) {
    console.log(`  PASS: ${msg}`);
    passed++;
  } else {
    console.log(`  FAIL: ${msg}`);
    failed++;
  }
}

// --- Synthetic HN page generator ---
// Produces minimal HTML matching HN's DOM structure (per docs/HN_DOM_REFERENCE.md)
function buildHNPage(storyIds, startRank = 1) {
  const storyRows = storyIds
    .map((id, i) => {
      const rank = startRank + i;
      return (
        `<tr class="athing submission" id="${id}">` +
        `<td align="right" valign="top" class="title"><span class="rank">${rank}.</span></td>` +
        `<td valign="top" class="votelinks"><center><a id="up_${id}"><div class="votearrow" title="upvote"></div></a></center></td>` +
        `<td class="title"><span class="titleline"><a href="https://example.com/${id}">Story ${id}</a><span class="sitebit comhead"> (<span class="sitestr">example.com</span>)</span></span></td>` +
        `</tr>` +
        `<tr><td colspan="2"></td><td class="subtext"><span class="subline"><span class="score" id="score_${id}">100 points</span> by <a class="hnuser">testuser</a> <span class="age"><a href="item?id=${id}">1 hour ago</a></span> | <a href="item?id=${id}">10&nbsp;comments</a></span></td></tr>` +
        `<tr class="spacer" style="height:5px"></tr>`
      );
    })
    .join("");

  return (
    `<html lang="en" op="news"><head><title>Hacker News</title></head><body><center>` +
    `<table id="hnmain" border="0" cellpadding="0" cellspacing="0" width="85%" bgcolor="#f6f6ef">` +
    `<tr id="bigbox"><td>` +
    `<table border="0" cellpadding="0" cellspacing="0">` +
    storyRows +
    `<tr class="morespace" style="height:10px"></tr>` +
    `<tr><td colspan="2"></td><td class="title"><a href="?p=2" class="morelink" rel="next">More</a></td></tr>` +
    `</table>` +
    `</td></tr></table></center></body></html>`
  );
}

async function launchBrowser() {
  const context = await chromium.launchPersistentContext("", {
    headless: false,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
    ],
  });
  return context;
}

// Helper: read chrome.storage.session from the extension's background context
async function getStorageSession(context) {
  let bgPage = context.serviceWorkers()[0];
  if (!bgPage) {
    bgPage = await context
      .waitForEvent("serviceworker", { timeout: 5000 })
      .catch(() => null);
  }
  if (bgPage) {
    const result = await bgPage.evaluate(() =>
      new Promise((resolve) => chrome.storage.session.get(null, resolve))
    );
    return result;
  }
  return null;
}

// Helper: set chrome.storage.session from extension context
async function setStorageSession(context, data) {
  let bgPage = context.serviceWorkers()[0];
  if (!bgPage) {
    bgPage = await context
      .waitForEvent("serviceworker", { timeout: 5000 })
      .catch(() => null);
  }
  if (bgPage) {
    return bgPage.evaluate(
      (d) => new Promise((resolve) => chrome.storage.session.set(d, resolve)),
      data
    );
  }
}

async function clearStorageSession(context) {
  let bgPage = context.serviceWorkers()[0];
  if (!bgPage) {
    bgPage = await context
      .waitForEvent("serviceworker", { timeout: 5000 })
      .catch(() => null);
  }
  if (bgPage) {
    return bgPage.evaluate(
      () => new Promise((resolve) => chrome.storage.session.clear(resolve))
    );
  }
}

// --- Route handler: serves synthetic fixtures by default ---
let useRealFixtures = false;
let page2IdsOverride = null; // when set, page 2 serves these IDs instead of PAGE2_IDS

function routeHandler(route) {
  const url = new URL(route.request().url());
  const p = url.pathname;
  const pageParam = url.searchParams.get("p") || "1";

  if (p === "/news" || p === "/") {
    if (useRealFixtures) {
      const html = pageParam === "2" ? realFixtures.page2HTML : realFixtures.page1HTML;
      route.fulfill({ body: html, contentType: "text/html" });
    } else {
      const ids = pageParam === "2" ? (page2IdsOverride ?? PAGE2_IDS) : PAGE1_IDS;
      const startRank = (parseInt(pageParam) - 1) * STORIES_PER_PAGE + 1;
      route.fulfill({ body: buildHNPage(ids, startRank), contentType: "text/html" });
    }
  } else if (p === "/newest") {
    route.fulfill({ body: "<html><body></body></html>", contentType: "text/html" });
  } else {
    route.fulfill({ body: "", status: 200 });
  }
}

let testStart;
function startTest(name) {
  if (testStart) {
    const elapsed = Date.now() - testStart;
    console.log(`  (${elapsed}ms)`);
  }
  console.log(`\n${name}`);
  testStart = Date.now();
}

async function runTests() {
  const context = await launchBrowser();

  // Intercept all HN requests — serve local fixtures, no live network
  await context.route("https://news.ycombinator.com/**", routeHandler);

  try {
    // Disable dwell time check for tests (default 60s would block rapid navigation)
    await setStorageSession(context, { pagegap_dwell: 0 });

    // --- Test 1: Snapshot storage on page 1 ---
    startTest("Test 1: Snapshot storage on page 1");
    const page = context.pages()[0] || (await context.newPage());
    await page.goto("https://news.ycombinator.com/news?p=1", { waitUntil: "load" });
    await page.waitForSelector("tr.athing.submission", { timeout: 5000 });
    await page.waitForTimeout(500); // brief wait for storage write

    const storage1 = await getStorageSession(context);
    assert(storage1 && storage1.page_1, "page_1 key exists in session storage");
    if (storage1 && storage1.page_1) {
      assert(
        Array.isArray(storage1.page_1.storyIds) &&
          storage1.page_1.storyIds.length === STORIES_PER_PAGE,
        `page_1 has ${STORIES_PER_PAGE} story IDs (got ${storage1.page_1.storyIds.length})`
      );
      assert(
        JSON.stringify(storage1.page_1.storyIds) === JSON.stringify(PAGE1_IDS),
        "page_1 story IDs match expected fixture IDs"
      );
      assert(typeof storage1.page_1.timestamp === "number", "page_1 has timestamp");
    }

    // --- Test 2: No injection on page 1 ---
    startTest("Test 2: No injection on page 1");
    const storyCount1 = await page.$$eval("tr.athing.submission", (rows) => rows.length);
    assert(storyCount1 === STORIES_PER_PAGE, `page 1 has exactly ${STORIES_PER_PAGE} stories (got ${storyCount1})`);

    // --- Test 3: Snapshot storage on page 2 ---
    startTest("Test 3: Snapshot storage on page 2");
    await page.goto("https://news.ycombinator.com/news?p=2", { waitUntil: "load" });
    await page.waitForSelector("tr.athing.submission", { timeout: 5000 });
    await page.waitForTimeout(500);

    const storage2 = await getStorageSession(context);
    assert(storage2 && storage2.page_2, "page_2 key exists in session storage");
    if (storage2 && storage2.page_2) {
      assert(
        Array.isArray(storage2.page_2.storyIds) &&
          storage2.page_2.storyIds.length === STORIES_PER_PAGE,
        `page_2 has ${STORIES_PER_PAGE} story IDs (got ${storage2.page_2.storyIds.length})`
      );
    }

    // --- Test 4: No injection when no gap exists ---
    startTest("Test 4: No injection when snapshot matches fresh fetch");
    const storyCount2 = await page.$$eval("tr.athing.submission", (rows) => rows.length);
    assert(storyCount2 === STORIES_PER_PAGE, `page 2 has exactly ${STORIES_PER_PAGE} stories with no gap (got ${storyCount2})`);

    // --- Test 5: Gap detection and injection (simulated) ---
    startTest("Test 5: Gap detection and injection (simulated)");
    // Directly set storage with trimmed page 1 IDs — no need to visit page 1 first
    await clearStorageSession(context);
    const trimmedIds = PAGE1_IDS.slice(3); // Remove first 3 IDs to simulate gap
    await setStorageSession(context, {
      page_1: { storyIds: trimmedIds, timestamp: Date.now() - 120_000 },
      pagegap_dwell: 0,
    });

    await page.goto("https://news.ycombinator.com/news?p=2", { waitUntil: "load" });
    await page.waitForSelector("tr.athing.submission", { timeout: 5000 });
    // Wait for gap injection (content script fetches page 1, parses, injects)
    try {
      await page.waitForFunction(
        (n) => document.querySelectorAll("tr.athing.submission").length > n,
        STORIES_PER_PAGE,
        { timeout: 5000 }
      );
    } catch {
      // If timeout, we'll catch it in the assertion below
    }

    const storyCountWithGap = await page.$$eval("tr.athing.submission", (rows) => rows.length);
    assert(
      storyCountWithGap > STORIES_PER_PAGE,
      `page 2 has more than ${STORIES_PER_PAGE} stories after gap injection (got ${storyCountWithGap})`
    );

    // Check that the gap stories are exactly the first 3 page 1 IDs
    const allIds = await page.$$eval("tr.athing.submission", (rows) =>
      rows.map((r) => r.id)
    );
    const expectedGapIds = PAGE1_IDS.slice(0, 3);
    const injectedIds = allIds.slice(0, expectedGapIds.length);
    assert(
      JSON.stringify(injectedIds) === JSON.stringify(expectedGapIds),
      `injected gap stories are the expected IDs (${expectedGapIds.join(", ")})`
    );

    // --- Test 6: Skip non-news pages ---
    startTest("Test 6: Skip non-news pages");
    await clearStorageSession(context);
    await setStorageSession(context, { pagegap_dwell: 0 });
    await page.goto("https://news.ycombinator.com/newest", { waitUntil: "load" });
    await page.waitForTimeout(500);
    const storageNewest = await getStorageSession(context);
    const hasNewestKeys =
      storageNewest &&
      Object.keys(storageNewest).some((k) => k.startsWith("page_"));
    assert(!hasNewestKeys, "no snapshot stored on /newest");

    // --- Test 7: Graceful handling of missing snapshot ---
    startTest("Test 7: Graceful handling of missing snapshot");
    await clearStorageSession(context);
    await setStorageSession(context, { pagegap_dwell: 0 });
    await page.goto("https://news.ycombinator.com/news?p=2", { waitUntil: "load" });
    await page.waitForSelector("tr.athing.submission", { timeout: 5000 });
    await page.waitForTimeout(500);

    const storyCountNoSnapshot = await page.$$eval(
      "tr.athing.submission",
      (rows) => rows.length
    );
    assert(
      storyCountNoSnapshot === STORIES_PER_PAGE,
      `page 2 loads normally without prior snapshot (got ${storyCountNoSnapshot})`
    );

    const errors = [];
    page.on("pageerror", (err) => errors.push(err.message));
    assert(errors.length === 0, "no console errors");

    // --- Test 8: Skip re-fetch when previous page was viewed recently ---
    startTest("Test 8: Skip re-fetch when previous page viewed less than 60s ago");
    await clearStorageSession(context);
    // Simulate a gap by trimming IDs, but keep a recent timestamp + high dwell
    const trimmedIdsTest8 = PAGE1_IDS.slice(3);
    await setStorageSession(context, {
      page_1: { storyIds: trimmedIdsTest8, timestamp: Date.now() },
      pagegap_dwell: 60_000,
    });

    await page.goto("https://news.ycombinator.com/news?p=2", { waitUntil: "load" });
    await page.waitForSelector("tr.athing.submission", { timeout: 5000 });
    await page.waitForTimeout(500);

    const storyCountRecent = await page.$$eval(
      "tr.athing.submission",
      (rows) => rows.length
    );
    assert(
      storyCountRecent === STORIES_PER_PAGE,
      `page 2 has exactly ${STORIES_PER_PAGE} stories when previous page viewed recently (got ${storyCountRecent})`
    );

    // --- Test 9: Duplicate detection (simulated) ---
    startTest("Test 9: Duplicate detection (simulated)");
    await clearStorageSession(context);
    // Create a fake page_1 snapshot that includes 3 of page 2's story IDs
    const overlapIds = PAGE2_IDS.slice(0, 3);
    const fakePage1Ids = [...Array(STORIES_PER_PAGE - overlapIds.length).fill("fake_id"), ...overlapIds];
    await setStorageSession(context, {
      page_1: { storyIds: fakePage1Ids, timestamp: Date.now() - 120_000 },
      pagegap_dwell: 0,
    });

    await page.goto("https://news.ycombinator.com/news?p=2", { waitUntil: "load" });
    await page.waitForSelector(".pagegap-duplicate", { timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(500);

    const dupCount = await page.$$eval(
      "tr.athing.submission.pagegap-duplicate",
      (rows) => rows.length
    );
    assert(dupCount >= 3, `at least 3 stories marked as duplicate (got ${dupCount})`);

    const dupIds = await page.$$eval(
      "tr.athing.submission.pagegap-duplicate",
      (rows) => rows.map((r) => r.id)
    );
    const allOverlap = overlapIds.every((id) => dupIds.includes(id));
    assert(allOverlap, "correct stories are marked as duplicates");

    // --- Test 10: Duplicates detected even when dwell time not met ---
    startTest("Test 10: Duplicates detected even when dwell time not met");
    await clearStorageSession(context);
    // Create page_1 snapshot with overlap but RECENT timestamp + HIGH dwell
    const overlapIds10 = PAGE2_IDS.slice(0, 2);
    const fakePage1Ids10 = [...Array(STORIES_PER_PAGE - overlapIds10.length).fill("fake_id"), ...overlapIds10];
    await setStorageSession(context, {
      page_1: { storyIds: fakePage1Ids10, timestamp: Date.now() },
      pagegap_dwell: 60_000,
    });

    await page.goto("https://news.ycombinator.com/news?p=2", { waitUntil: "load" });
    await page.waitForSelector(".pagegap-duplicate", { timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(500);

    const dupCount10 = await page.$$eval(
      "tr.athing.submission.pagegap-duplicate",
      (rows) => rows.length
    );
    assert(dupCount10 >= 2, `duplicates marked even with dwell skip (got ${dupCount10})`);

    const totalStories10 = await page.$$eval(
      "tr.athing.submission",
      (rows) => rows.length
    );
    assert(totalStories10 === STORIES_PER_PAGE, `no gap injection when dwell not met (got ${totalStories10})`);

    // --- Test 11: No duplicate markers on page 1 ---
    startTest("Test 11: No duplicate markers on page 1");
    await clearStorageSession(context);
    await setStorageSession(context, { pagegap_dwell: 0 });
    await page.goto("https://news.ycombinator.com/news?p=1", { waitUntil: "load" });
    await page.waitForSelector("tr.athing.submission", { timeout: 5000 });
    await page.waitForTimeout(500);

    const dupCountPage1 = await page.$$eval(
      "tr.pagegap-duplicate",
      (rows) => rows.length
    );
    assert(dupCountPage1 === 0, "no duplicate markers on page 1");

    // --- Test 12: Smoke test with captured real HN pages ---
    startTest("Test 12: Smoke test with captured real HN pages");
    await clearStorageSession(context);
    useRealFixtures = true;
    await setStorageSession(context, { pagegap_dwell: 0 });

    await page.goto("https://news.ycombinator.com/news?p=1", { waitUntil: "load" });
    await page.waitForSelector("tr.athing.submission", { timeout: 5000 });
    await page.waitForTimeout(500);

    const realStorage1 = await getStorageSession(context);
    assert(
      realStorage1 && realStorage1.page_1,
      "real fixture: page_1 key exists in session storage"
    );
    if (realStorage1 && realStorage1.page_1) {
      assert(
        realStorage1.page_1.storyIds.length === 30,
        `real fixture: page_1 has 30 story IDs (got ${realStorage1.page_1.storyIds.length})`
      );
      assert(
        JSON.stringify(realStorage1.page_1.storyIds) === JSON.stringify(realFixtures.page1IDs),
        "real fixture: page_1 IDs match expected captured IDs"
      );
    }

    await page.goto("https://news.ycombinator.com/news?p=2", { waitUntil: "load" });
    await page.waitForSelector("tr.athing.submission", { timeout: 5000 });
    await page.waitForTimeout(500);

    const realStorage2 = await getStorageSession(context);
    assert(
      realStorage2 && realStorage2.page_2,
      "real fixture: page_2 key exists in session storage"
    );
    if (realStorage2 && realStorage2.page_2) {
      assert(
        realStorage2.page_2.storyIds.length === 30,
        `real fixture: page_2 has 30 story IDs (got ${realStorage2.page_2.storyIds.length})`
      );
    }

    useRealFixtures = false;

    // --- Test 13: Gap story already on current page is not injected ---
    startTest("Test 13: Gap story already on current page is not injected");
    await clearStorageSession(context);
    // PAGE1_IDS[0] and [1] are potential gap stories (absent from snapshot)
    const gapCandidates = PAGE1_IDS.slice(0, 2); // 40001, 40002
    const snapshotIds13 = PAGE1_IDS.slice(2);     // 40003–40005 (what was seen)
    // Page 2 includes gapCandidates[0] (simulates it dropping to current page)
    page2IdsOverride = [gapCandidates[0], ...PAGE2_IDS.slice(0, STORIES_PER_PAGE - 1)];
    await setStorageSession(context, {
      page_1: { storyIds: snapshotIds13, timestamp: Date.now() - 120_000 },
      pagegap_dwell: 0,
    });

    await page.goto("https://news.ycombinator.com/news?p=2", { waitUntil: "load" });
    await page.waitForSelector("tr.athing.submission", { timeout: 5000 });
    try {
      await page.waitForFunction(
        (n) => document.querySelectorAll("tr.athing.submission").length > n,
        STORIES_PER_PAGE,
        { timeout: 5000 }
      );
    } catch {
      // gap injection may not happen — that's the expected outcome for gapCandidates[0]
    }

    const allIds13 = await page.$$eval("tr.athing.submission", (rows) => rows.map((r) => r.id));
    // gapCandidates[1] (40002) should be injected — not on current page
    assert(
      allIds13.includes(gapCandidates[1]),
      `genuine gap story (${gapCandidates[1]}) is injected`
    );
    // gapCandidates[0] (40001) is already on page 2 — should appear exactly once
    const occurrences = allIds13.filter((id) => id === gapCandidates[0]).length;
    assert(
      occurrences === 1,
      `story already on current page (${gapCandidates[0]}) appears exactly once, not injected again (got ${occurrences})`
    );

    page2IdsOverride = null;
  } finally {
    await context.close();
  }

  // Print timing for last test
  if (testStart) {
    const elapsed = Date.now() - testStart;
    console.log(`  (${elapsed}ms)`);
  }

  // Summary
  console.log(`\n--- Results: ${passed} passed, ${failed} failed ---`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch((err) => {
  console.error("Test runner error:", err);
  process.exit(1);
});
