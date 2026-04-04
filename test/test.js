const { chromium } = require("playwright");
const path = require("path");

const extensionPath = path.join(__dirname, "..");
let passed = 0;
let failed = 0;

function assert(condition, msg) {
  if (condition) {
    console.log(`  PASS: ${msg}`);
    passed++;
  } else {
    console.log(`  FAIL: ${msg}`);
    failed++;
  }
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
  // Get the extension's service worker / background page
  let bgPage = context.serviceWorkers()[0];
  if (!bgPage) {
    bgPage = await context.waitForEvent("serviceworker", { timeout: 5000 }).catch(() => null);
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
    bgPage = await context.waitForEvent("serviceworker", { timeout: 5000 }).catch(() => null);
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
    bgPage = await context.waitForEvent("serviceworker", { timeout: 5000 }).catch(() => null);
  }
  if (bgPage) {
    return bgPage.evaluate(
      () => new Promise((resolve) => chrome.storage.session.clear(resolve))
    );
  }
}

async function runTests() {
  const context = await launchBrowser();

  try {
    // Disable dwell time check for tests (default 60s would block rapid navigation)
    await setStorageSession(context, { pagegap_dwell: 0 });

    // --- Test 1: Snapshot storage on page 1 ---
    console.log("\nTest 1: Snapshot storage on page 1");
    const page = context.pages()[0] || (await context.newPage());
    await page.goto("https://news.ycombinator.com/news?p=1", { waitUntil: "load" });
    await page.waitForTimeout(2000);

    const storage1 = await getStorageSession(context);
    assert(storage1 && storage1.page_1, "page_1 key exists in session storage");
    if (storage1 && storage1.page_1) {
      assert(
        Array.isArray(storage1.page_1.storyIds) && storage1.page_1.storyIds.length === 30,
        `page_1 has 30 story IDs (got ${storage1.page_1.storyIds.length})`
      );
      assert(typeof storage1.page_1.timestamp === "number", "page_1 has timestamp");
    }

    // --- Test 2: No injection on page 1 ---
    console.log("\nTest 2: No injection on page 1");
    const storyCount1 = await page.$$eval("tr.athing.submission", (rows) => rows.length);
    assert(storyCount1 === 30, `page 1 has exactly 30 stories (got ${storyCount1})`);

    // --- Test 3: Snapshot storage on page 2 ---
    console.log("\nTest 3: Snapshot storage on page 2");
    await page.goto("https://news.ycombinator.com/news?p=2", { waitUntil: "load" });
    await page.waitForTimeout(2000);

    const storage2 = await getStorageSession(context);
    assert(storage2 && storage2.page_2, "page_2 key exists in session storage");
    if (storage2 && storage2.page_2) {
      assert(
        Array.isArray(storage2.page_2.storyIds) && storage2.page_2.storyIds.length === 30,
        `page_2 has 30 story IDs (got ${storage2.page_2.storyIds.length})`
      );
    }

    // --- Test 4: No injection when no gap exists ---
    console.log("\nTest 4: No injection when snapshot matches fresh fetch");
    // Page 1 snapshot was just stored, immediately went to page 2 — should be no gap
    const storyCount2 = await page.$$eval("tr.athing.submission", (rows) => rows.length);
    assert(storyCount2 === 30, `page 2 has exactly 30 stories with no gap (got ${storyCount2})`);

    // --- Test 5: Gap detection and injection (simulated) ---
    console.log("\nTest 5: Gap detection and injection (simulated)");
    // First visit page 1 to get a fresh snapshot
    await page.goto("https://news.ycombinator.com/news?p=1", { waitUntil: "load" });
    await page.waitForTimeout(2000);

    const freshStorage = await getStorageSession(context);
    const originalIds = freshStorage.page_1.storyIds;

    // Remove the first 3 IDs from the snapshot to simulate gap stories
    const trimmedIds = originalIds.slice(3);
    await setStorageSession(context, {
      page_1: { storyIds: trimmedIds, timestamp: Date.now() },
    });

    // Now navigate to page 2 — extension should detect 3 "gap" stories
    await page.goto("https://news.ycombinator.com/news?p=2", { waitUntil: "load" });
    await page.waitForTimeout(3000); // extra time for fetch + inject

    const storyCountWithGap = await page.$$eval("tr.athing.submission", (rows) => rows.length);
    assert(
      storyCountWithGap > 30,
      `page 2 has more than 30 stories after gap injection (got ${storyCountWithGap})`
    );

    // Check that injected stories appear before the original page 2 stories
    const allIds = await page.$$eval("tr.athing.submission", (rows) =>
      rows.map((r) => r.id)
    );
    const page2OriginalFirstId = freshStorage.page_2
      ? freshStorage.page_2.storyIds[0]
      : null;
    if (page2OriginalFirstId) {
      const idx = allIds.indexOf(page2OriginalFirstId);
      assert(idx > 0, `original first page 2 story is not at index 0 (at index ${idx}), gap stories are before it`);
    }

    // --- Test 6: Skip non-news pages ---
    console.log("\nTest 6: Skip non-news pages");
    await clearStorageSession(context);
    await setStorageSession(context, { pagegap_dwell: 0 });
    await page.goto("https://news.ycombinator.com/newest", { waitUntil: "load" });
    await page.waitForTimeout(2000);
    const storageNewest = await getStorageSession(context);
    const hasNewestKeys = storageNewest && Object.keys(storageNewest).some((k) => k.startsWith("page_"));
    assert(!hasNewestKeys, "no snapshot stored on /newest");

    // --- Test 7: Graceful handling of missing snapshot ---
    console.log("\nTest 7: Graceful handling of missing snapshot");
    await clearStorageSession(context);
    await setStorageSession(context, { pagegap_dwell: 0 });
    await page.goto("https://news.ycombinator.com/news?p=2", { waitUntil: "load" });
    await page.waitForTimeout(2000);

    const storyCountNoSnapshot = await page.$$eval("tr.athing.submission", (rows) => rows.length);
    assert(storyCountNoSnapshot === 30, `page 2 loads normally without prior snapshot (got ${storyCountNoSnapshot})`);

    // Check no errors in console
    const errors = [];
    page.on("pageerror", (err) => errors.push(err.message));
    assert(errors.length === 0, "no console errors");

    // --- Test 8: Skip re-fetch when previous page was viewed recently ---
    console.log("\nTest 8: Skip re-fetch when previous page viewed less than 60s ago");
    // Visit page 1 to get a fresh snapshot
    await page.goto("https://news.ycombinator.com/news?p=1", { waitUntil: "load" });
    await page.waitForTimeout(2000);

    const storageForTest8 = await getStorageSession(context);
    const idsForTest8 = storageForTest8.page_1.storyIds;

    // Simulate a gap by trimming IDs, but keep a recent timestamp
    // Set dwell to 60s so the recent timestamp triggers the skip
    const trimmedIdsTest8 = idsForTest8.slice(3);
    await setStorageSession(context, {
      page_1: { storyIds: trimmedIdsTest8, timestamp: Date.now() },
      pagegap_dwell: 60_000,
    });

    // Navigate to page 2 — should skip re-fetch due to recent timestamp
    await page.goto("https://news.ycombinator.com/news?p=2", { waitUntil: "load" });
    await page.waitForTimeout(3000);

    const storyCountRecent = await page.$$eval("tr.athing.submission", (rows) => rows.length);
    assert(
      storyCountRecent === 30,
      `page 2 has exactly 30 stories when previous page viewed recently (got ${storyCountRecent})`
    );

    // --- Test 9: Duplicate detection (simulated) ---
    console.log("\nTest 9: Duplicate detection (simulated)");
    await clearStorageSession(context);
    await setStorageSession(context, { pagegap_dwell: 0 });

    // Visit page 2 to learn its story IDs
    await page.goto("https://news.ycombinator.com/news?p=2", { waitUntil: "load" });
    await page.waitForTimeout(2000);

    const storagePre9 = await getStorageSession(context);
    const page2Ids = storagePre9.page_2.storyIds;

    // Create a fake page_1 snapshot that includes 3 of page 2's story IDs
    // This simulates those stories having been on page 1 when the user viewed it
    const overlapIds = page2Ids.slice(0, 3);
    const fakePage1Ids = [...Array(27).fill("fake_id"), ...overlapIds];
    await setStorageSession(context, {
      page_1: { storyIds: fakePage1Ids, timestamp: Date.now() - 120_000 },
      pagegap_dwell: 0,
    });

    await page.goto("https://news.ycombinator.com/news?p=2", { waitUntil: "load" });
    await page.waitForTimeout(3000);

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
    console.log("\nTest 10: Duplicates detected even when dwell time not met");
    await clearStorageSession(context);

    // Visit page 2 to get its IDs
    await page.goto("https://news.ycombinator.com/news?p=2", { waitUntil: "load" });
    await page.waitForTimeout(2000);
    const storagePre11 = await getStorageSession(context);
    const page2Ids11 = storagePre11.page_2.storyIds;

    // Create page_1 snapshot with overlap but RECENT timestamp + HIGH dwell
    const overlapIds11 = page2Ids11.slice(0, 2);
    const fakePage1Ids11 = [...Array(28).fill("fake_id"), ...overlapIds11];
    await setStorageSession(context, {
      page_1: { storyIds: fakePage1Ids11, timestamp: Date.now() },
      pagegap_dwell: 60_000,
    });

    await page.goto("https://news.ycombinator.com/news?p=2", { waitUntil: "load" });
    await page.waitForTimeout(3000);

    const dupCount11 = await page.$$eval(
      "tr.athing.submission.pagegap-duplicate",
      (rows) => rows.length
    );
    assert(dupCount11 >= 2, `duplicates marked even with dwell skip (got ${dupCount11})`);

    const totalStories11 = await page.$$eval("tr.athing.submission", (rows) => rows.length);
    assert(totalStories11 === 30, `no gap injection when dwell not met (got ${totalStories11})`);

    // --- Test 11: No duplicate markers on page 1 ---
    console.log("\nTest 11: No duplicate markers on page 1");
    await clearStorageSession(context);
    await setStorageSession(context, { pagegap_dwell: 0 });
    await page.goto("https://news.ycombinator.com/news?p=1", { waitUntil: "load" });
    await page.waitForTimeout(2000);

    const dupCountPage1 = await page.$$eval(
      "tr.pagegap-duplicate",
      (rows) => rows.length
    );
    assert(dupCountPage1 === 0, "no duplicate markers on page 1");

  } finally {
    await context.close();
  }

  // Summary
  console.log(`\n--- Results: ${passed} passed, ${failed} failed ---`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch((err) => {
  console.error("Test runner error:", err);
  process.exit(1);
});
