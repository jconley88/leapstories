const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const dist = path.join(root, "dist-firefox");

// Clean and recreate dist directory
fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });

// Read and transform manifest
const manifest = JSON.parse(fs.readFileSync(path.join(root, "manifest.json"), "utf8"));

// Firefox MV3 uses "scripts" array, not "service_worker"
manifest.background = { scripts: [manifest.background.service_worker] };

// Required for temporary add-on loading and to declare minimum version (115+ for storage.session)
manifest.browser_specific_settings = {
  gecko: {
    id: "leapstories@example.com",
    strict_min_version: "115.0",
  },
};

fs.writeFileSync(path.join(dist, "manifest.json"), JSON.stringify(manifest, null, 2));

// Copy extension directories
for (const dir of ["src", "icons"]) {
  fs.cpSync(path.join(root, dir), path.join(dist, dir), { recursive: true });
}

// Patch storage.js: chrome.storage.session -> browser.storage.session
const storagePath = path.join(dist, "src", "storage.js");
const storageContent = fs.readFileSync(storagePath, "utf8");
fs.writeFileSync(storagePath, storageContent.replaceAll("chrome.storage.session", "browser.storage.local"));

console.log("Built Firefox extension in dist-firefox/");
