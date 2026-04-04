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

  // Read the stored snapshot and remove first 3 IDs to simulate gap
  const storage = await sw.evaluate(
    () => new Promise((resolve) => chrome.storage.session.get("page_1", resolve))
  );
  const trimmedIds = storage.page_1.storyIds.slice(3);
  await sw.evaluate(
    (d) => new Promise((resolve) => chrome.storage.session.set(d, resolve)),
    { page_1: { storyIds: trimmedIds, timestamp: Date.now() } }
  );

  console.log(`Removed 3 story IDs from page_1 snapshot to simulate gap.`);
  console.log(`Navigating to page 2 — you should see 3 injected stories at the top.`);

  // Navigate to page 2 — extension will detect the "gap" and inject
  await page.goto("https://news.ycombinator.com/news?p=2", { waitUntil: "load" });
  await page.waitForTimeout(3000);

  const count = await page.$$eval("tr.athing.submission", (rows) => rows.length);
  console.log(`Page 2 has ${count} stories (expected ~33: 30 original + 3 injected).`);
  console.log(`Browser is open — inspect the page. Close the browser when done.`);

  // Keep open
  await new Promise(() => {});
})();
