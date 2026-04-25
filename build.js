/**
 * Build script for VRCX Plugin System core
 * Automatically updates the build timestamp in index.ts before webpack runs
 */

const fs = require("fs");
const path = require("path");

console.log("=== VRCX Plugin System Build ===\n");

// Update build timestamp in index.ts
const indexPath = path.join(__dirname, "src", "index.ts");
const buildTimestamp = Math.floor(Date.now() / 1000);

try {
  let content = fs.readFileSync(indexPath, "utf8");
  const timestampRegex = /build:\s*\d+,\s*\/\/\s*AUTO-GENERATED BUILD TIMESTAMP/;

  if (timestampRegex.test(content)) {
    content = content.replace(
      timestampRegex,
      `build: ${buildTimestamp}, // AUTO-GENERATED BUILD TIMESTAMP`
    );
    fs.writeFileSync(indexPath, content, "utf8");
    console.log(`[INFO] Updated build timestamp: ${buildTimestamp}`);
  } else {
    console.warn("[WARN] Could not find build timestamp marker in index.ts");
  }
} catch (error) {
  console.warn(`[WARN] Failed to update build timestamp: ${error.message}`);
}

console.log("[INFO] Building core plugin system...\n");
