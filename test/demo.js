const { chromium } = require("playwright");
const path = require("path");

const extensionPath = path.join(__dirname, "..");

(async () => {
  const context = await chromium.launchPersistentContext("", {
    headless: false,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
    ],
  });

  const page = context.pages()[0] || (await context.newPage());

  // Visit page 1 to store snapshot
  await page.goto("https://news.ycombinator.com/news?p=1", { waitUntil: "load" });
  await page.waitForTimeout(2000);

  // Get service worker to modify storage
  let sw = context.serviceWorkers()[0];
  if (!sw) {
    sw = await context.waitForEvent("serviceworker", { timeout: 5000 });
  }

  // Get page 2 story IDs so we can create overlap for duplicate demo
  await page.goto("https://news.ycombinator.com/news?p=2", { waitUntil: "load" });
  await page.waitForTimeout(2000);

  const storage2 = await sw.evaluate(
    () => new Promise((resolve) => chrome.storage.session.get("page_2", resolve))
  );
  const page2Ids = storage2.page_2.storyIds;

  // Read page 1 snapshot and modify it:
  // - Remove first 3 IDs to simulate gap stories
  // - Add first 3 page 2 IDs to simulate duplicates (stories that fell from page 1 to page 2)
  const storage1 = await sw.evaluate(
    () => new Promise((resolve) => chrome.storage.session.get("page_1", resolve))
  );
  const trimmedIds = [...storage1.page_1.storyIds.slice(3), ...page2Ids.slice(0, 3)];
  await sw.evaluate(
    (d) => new Promise((resolve) => chrome.storage.session.set(d, resolve)),
    { page_1: { storyIds: trimmedIds, timestamp: Date.now() } }
  );

  console.log(`Modified page_1 snapshot: removed 3 IDs (gap), added 3 page 2 IDs (duplicates).`);
  console.log(`Navigating to page 2...`);
  console.log(`  - Gap stories = injected at the top (no special styling)`);
  console.log(`  - Duplicate stories = dimmed with "seen on previous page" prefix`);

  // Navigate to page 2 — extension will detect gaps and duplicates
  await page.goto("https://news.ycombinator.com/news?p=2", { waitUntil: "load" });
  await page.waitForTimeout(3000);

  const total = await page.$$eval("tr.athing.submission", (rows) => rows.length);
  const dups = await page.$$eval("tr.athing.submission.pagegap-duplicate", (rows) => rows.length);
  console.log(`Page 2: ${total} stories total, ${total - 30} gap (injected), ${dups} duplicate (dimmed).`);
  console.log(`Browser is open — inspect the page. Close the browser when done.`);

  // Keep open
  await new Promise(() => {});
})();
