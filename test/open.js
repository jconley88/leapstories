const { chromium } = require("playwright");
const path = require("path");

const extensionPath = path.join(__dirname, "..");

(async () => {
  const ctx = await chromium.launchPersistentContext("", {
    headless: false,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
    ],
  });

  const page = ctx.pages()[0] || (await ctx.newPage());
  await page.goto("https://news.ycombinator.com");

  // Keep open until you close the browser
  await new Promise(() => {});
})();
