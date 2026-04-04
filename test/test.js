const { chromium } = require("playwright");
const path = require("path");

(async () => {
  const extensionPath = path.join(__dirname, "..");

  const context = await chromium.launchPersistentContext("", {
    headless: false,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
    ],
  });

  const page = context.pages()[0] || (await context.newPage());

  const messages = [];
  page.on("console", (msg) => messages.push(msg.text()));

  await page.goto("https://news.ycombinator.com");

  await page.waitForTimeout(2000);

  if (messages.some((m) => m.includes("PageGap loaded"))) {
    console.log("PASS:", messages.find((m) => m.includes("PageGap loaded")));
  } else {
    console.log("FAIL: no PageGap console message found");
    console.log("Messages seen:", messages);
  }

  await context.close();
})();
