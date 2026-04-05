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

// --- Service worker helper ---
async function getServiceWorker(context) {
  let sw = context.serviceWorkers()[0];
  if (!sw) {
    sw = await context
      .waitForEvent("serviceworker", { timeout: 5000 })
      .catch(() => null);
  }
  return sw;
}

async function getStorageSession(context) {
  const sw = await getServiceWorker(context);
  if (!sw) return null;
  return sw.evaluate(() =>
    new Promise((resolve) => chrome.storage.session.get(null, resolve))
  );
}

async function setStorageSession(context, data) {
  const sw = await getServiceWorker(context);
  if (!sw) return;
  return sw.evaluate(
    (d) => new Promise((resolve) => chrome.storage.session.set(d, resolve)),
    data
  );
}

async function clearStorageSession(context) {
  const sw = await getServiceWorker(context);
  if (!sw) return;
  return sw.evaluate(
    () => new Promise((resolve) => chrome.storage.session.clear(resolve))
  );
}

// --- Route handler ---
let useRealFixtures = false;
let page2IdsOverride = null;

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

// --- Navigation helpers ---
async function goToPage(page, pageNum) {
  await page.goto(`https://news.ycombinator.com/news?p=${pageNum}`, { waitUntil: "load" });
  await page.waitForSelector("tr.athing.submission", { timeout: 5000 });
  await page.waitForTimeout(500);
}

async function goToPageAndWaitForInjection(page, pageNum) {
  await page.goto(`https://news.ycombinator.com/news?p=${pageNum}`, { waitUntil: "load" });
  await page.waitForSelector("tr.athing.submission", { timeout: 5000 });
  try {
    await page.waitForFunction(
      (n) => document.querySelectorAll("tr.athing.submission").length > n,
      STORIES_PER_PAGE,
      { timeout: 5000 }
    );
  } catch {}
}

async function storyCount(page) {
  return page.$$eval("tr.athing.submission", (rows) => rows.length);
}

async function storyIds(page) {
  return page.$$eval("tr.athing.submission", (rows) => rows.map((r) => r.id));
}

async function duplicateCount(page) {
  return page.$$eval("tr.athing.submission.leapstories-duplicate", (rows) => rows.length);
}

async function duplicateIds(page) {
  return page.$$eval("tr.athing.submission.leapstories-duplicate", (rows) => rows.map((r) => r.id));
}

// --- Test functions ---

async function testSnapshotStoragePage1(context, page) {
  await goToPage(page, 1);

  const storage = await getStorageSession(context);
  assert(storage && storage.page_1, "page_1 key exists in session storage");
  if (storage && storage.page_1) {
    assert(
      Array.isArray(storage.page_1.storyIds) &&
        storage.page_1.storyIds.length === STORIES_PER_PAGE,
      `page_1 has ${STORIES_PER_PAGE} story IDs (got ${storage.page_1.storyIds.length})`
    );
    assert(
      JSON.stringify(storage.page_1.storyIds) === JSON.stringify(PAGE1_IDS),
      "page_1 story IDs match expected fixture IDs"
    );
    assert(typeof storage.page_1.timestamp === "number", "page_1 has timestamp");
  }
}

async function testNoInjectionPage1(context, page) {
  await goToPage(page, 1);

  const count = await storyCount(page);
  assert(count === STORIES_PER_PAGE, `page 1 has exactly ${STORIES_PER_PAGE} stories (got ${count})`);
}

async function testSnapshotStoragePage2(context, page) {
  await goToPage(page, 1);
  await goToPage(page, 2);

  const storage = await getStorageSession(context);
  assert(storage && storage.page_2, "page_2 key exists in session storage");
  if (storage && storage.page_2) {
    assert(
      Array.isArray(storage.page_2.storyIds) &&
        storage.page_2.storyIds.length === STORIES_PER_PAGE,
      `page_2 has ${STORIES_PER_PAGE} story IDs (got ${storage.page_2.storyIds.length})`
    );
  }
}

async function testNoInjectionWhenNoGap(context, page) {
  await goToPage(page, 1);
  await goToPage(page, 2);

  const count = await storyCount(page);
  assert(count === STORIES_PER_PAGE, `page 2 has exactly ${STORIES_PER_PAGE} stories with no gap (got ${count})`);
}

async function testGapDetectionAndInjection(context, page) {
  await setStorageSession(context, {
    page_1: { storyIds: PAGE1_IDS.slice(3), timestamp: Date.now() - 120_000 },
    leapstories_dwell: 0,
  });

  await goToPageAndWaitForInjection(page, 2);

  const count = await storyCount(page);
  assert(
    count > STORIES_PER_PAGE,
    `page 2 has more than ${STORIES_PER_PAGE} stories after gap injection (got ${count})`
  );

  const allIds = await storyIds(page);
  const expectedGapIds = PAGE1_IDS.slice(0, 3);
  const injectedIds = allIds.slice(0, expectedGapIds.length);
  assert(
    JSON.stringify(injectedIds) === JSON.stringify(expectedGapIds),
    `injected gap stories are the expected IDs (${expectedGapIds.join(", ")})`
  );
}

async function testSkipNonNewsPages(context, page) {
  await page.goto("https://news.ycombinator.com/newest", { waitUntil: "load" });
  await page.waitForTimeout(500);

  const storage = await getStorageSession(context);
  const hasPageKeys = storage && Object.keys(storage).some((k) => k.startsWith("page_"));
  assert(!hasPageKeys, "no snapshot stored on /newest");
}

async function testMissingSnapshot(context, page) {
  const errors = [];
  page.on("pageerror", (err) => errors.push(err.message));

  await goToPage(page, 2);

  const count = await storyCount(page);
  assert(
    count === STORIES_PER_PAGE,
    `page 2 loads normally without prior snapshot (got ${count})`
  );
  assert(errors.length === 0, "no console errors");
}

async function testDwellTimeSkip(context, page) {
  await setStorageSession(context, {
    page_1: { storyIds: PAGE1_IDS.slice(3), timestamp: Date.now() },
    leapstories_dwell: 60_000,
  });

  await goToPage(page, 2);

  const count = await storyCount(page);
  assert(
    count === STORIES_PER_PAGE,
    `page 2 has exactly ${STORIES_PER_PAGE} stories when previous page viewed recently (got ${count})`
  );
}

async function testDuplicateDetection(context, page) {
  const overlapIds = PAGE2_IDS.slice(0, 3);
  const fakePage1Ids = [...Array(STORIES_PER_PAGE - overlapIds.length).fill("fake_id"), ...overlapIds];
  await setStorageSession(context, {
    page_1: { storyIds: fakePage1Ids, timestamp: Date.now() - 120_000 },
    leapstories_dwell: 0,
  });

  await page.goto("https://news.ycombinator.com/news?p=2", { waitUntil: "load" });
  await page.waitForSelector(".leapstories-duplicate", { timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(500);

  const dupCount = await duplicateCount(page);
  assert(dupCount >= 3, `at least 3 stories marked as duplicate (got ${dupCount})`);

  const dupIds = await duplicateIds(page);
  const allOverlap = overlapIds.every((id) => dupIds.includes(id));
  assert(allOverlap, "correct stories are marked as duplicates");
}

async function testDuplicatesWithoutDwell(context, page) {
  const overlapIds = PAGE2_IDS.slice(0, 2);
  const fakePage1Ids = [...Array(STORIES_PER_PAGE - overlapIds.length).fill("fake_id"), ...overlapIds];
  await setStorageSession(context, {
    page_1: { storyIds: fakePage1Ids, timestamp: Date.now() },
    leapstories_dwell: 60_000,
  });

  await page.goto("https://news.ycombinator.com/news?p=2", { waitUntil: "load" });
  await page.waitForSelector(".leapstories-duplicate", { timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(500);

  const dupCnt = await duplicateCount(page);
  assert(dupCnt >= 2, `duplicates marked even with dwell skip (got ${dupCnt})`);

  const count = await storyCount(page);
  assert(count === STORIES_PER_PAGE, `no gap injection when dwell not met (got ${count})`);
}

async function testNoDuplicatesOnPage1(context, page) {
  await goToPage(page, 1);

  const dupCnt = await page.$$eval("tr.leapstories-duplicate", (rows) => rows.length);
  assert(dupCnt === 0, "no duplicate markers on page 1");
}

async function testRealFixturesSmokeTest(context, page) {
  useRealFixtures = true;

  await goToPage(page, 1);

  const storage1 = await getStorageSession(context);
  assert(storage1 && storage1.page_1, "real fixture: page_1 key exists in session storage");
  if (storage1 && storage1.page_1) {
    assert(
      storage1.page_1.storyIds.length === 30,
      `real fixture: page_1 has 30 story IDs (got ${storage1.page_1.storyIds.length})`
    );
    assert(
      JSON.stringify(storage1.page_1.storyIds) === JSON.stringify(realFixtures.page1IDs),
      "real fixture: page_1 IDs match expected captured IDs"
    );
  }

  await goToPage(page, 2);

  const storage2 = await getStorageSession(context);
  assert(storage2 && storage2.page_2, "real fixture: page_2 key exists in session storage");
  if (storage2 && storage2.page_2) {
    assert(
      storage2.page_2.storyIds.length === 30,
      `real fixture: page_2 has 30 story IDs (got ${storage2.page_2.storyIds.length})`
    );
  }

  useRealFixtures = false;
}

async function testGapStoryNotInjectedIfOnCurrentPage(context, page) {
  const gapCandidates = PAGE1_IDS.slice(0, 2);
  const snapshotIds = PAGE1_IDS.slice(2);
  page2IdsOverride = [gapCandidates[0], ...PAGE2_IDS.slice(0, STORIES_PER_PAGE - 1)];

  await setStorageSession(context, {
    page_1: { storyIds: snapshotIds, timestamp: Date.now() - 120_000 },
    leapstories_dwell: 0,
  });

  await goToPageAndWaitForInjection(page, 2);

  const allIds = await storyIds(page);
  assert(
    allIds.includes(gapCandidates[1]),
    `genuine gap story (${gapCandidates[1]}) is injected`
  );
  const occurrences = allIds.filter((id) => id === gapCandidates[0]).length;
  assert(
    occurrences === 1,
    `story already on current page (${gapCandidates[0]}) appears exactly once, not injected again (got ${occurrences})`
  );

  page2IdsOverride = null;
}

async function testGapIdsAddedToSnapshot(context, page) {
  await setStorageSession(context, {
    page_1: { storyIds: PAGE1_IDS.slice(3), timestamp: Date.now() - 120_000 },
    leapstories_dwell: 0,
  });

  await goToPageAndWaitForInjection(page, 2);
  await page.waitForTimeout(500);

  const storage = await getStorageSession(context);
  const snap = storage && storage.page_2;
  assert(snap, "page_2 snapshot exists after gap injection");
  if (snap) {
    const expectedGapIds = PAGE1_IDS.slice(0, 3);
    const hasGapIds = expectedGapIds.every((id) => snap.storyIds.includes(id));
    assert(hasGapIds, "page_2 snapshot includes injected gap story IDs");
    const hasOriginalIds = PAGE2_IDS.every((id) => snap.storyIds.includes(id));
    assert(hasOriginalIds, "page_2 snapshot still includes original story IDs");
    assert(
      snap.storyIds.length === STORIES_PER_PAGE + expectedGapIds.length,
      `page_2 snapshot has ${STORIES_PER_PAGE + expectedGapIds.length} total IDs (got ${snap.storyIds.length})`
    );
  }
}

// --- Test runner ---

const tests = [
  { name: "Test 1: Snapshot storage on page 1", fn: testSnapshotStoragePage1 },
  { name: "Test 2: No injection on page 1", fn: testNoInjectionPage1 },
  { name: "Test 3: Snapshot storage on page 2", fn: testSnapshotStoragePage2 },
  { name: "Test 4: No injection when snapshot matches fresh fetch", fn: testNoInjectionWhenNoGap },
  { name: "Test 5: Gap detection and injection (simulated)", fn: testGapDetectionAndInjection },
  { name: "Test 6: Skip non-news pages", fn: testSkipNonNewsPages },
  { name: "Test 7: Graceful handling of missing snapshot", fn: testMissingSnapshot },
  { name: "Test 8: Skip re-fetch when previous page viewed less than 60s ago", fn: testDwellTimeSkip },
  { name: "Test 9: Duplicate detection (simulated)", fn: testDuplicateDetection },
  { name: "Test 10: Duplicates detected even when dwell time not met", fn: testDuplicatesWithoutDwell },
  { name: "Test 11: No duplicate markers on page 1", fn: testNoDuplicatesOnPage1 },
  { name: "Test 12: Smoke test with captured real HN pages", fn: testRealFixturesSmokeTest },
  { name: "Test 13: Gap story already on current page is not injected", fn: testGapStoryNotInjectedIfOnCurrentPage },
  { name: "Test 14: Gap story IDs added to page snapshot after injection", fn: testGapIdsAddedToSnapshot },
];

async function runTests() {
  const context = await launchBrowser();
  await context.route("https://news.ycombinator.com/**", routeHandler);

  try {
    const page = context.pages()[0] || (await context.newPage());

    for (const test of tests) {
      const start = Date.now();
      console.log(`\n${test.name}`);
      await clearStorageSession(context);
      await setStorageSession(context, { leapstories_dwell: 0 });
      await test.fn(context, page);
      console.log(`  (${Date.now() - start}ms)`);
    }
  } finally {
    await context.close();
  }

  console.log(`\n--- Results: ${passed} passed, ${failed} failed ---`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch((err) => {
  console.error("Test runner error:", err);
  process.exit(1);
});
