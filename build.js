/**
 * Update build timestamp in index.ts based on most recent file modification
 * This runs before webpack build to ensure accurate timestamps
 *
 * Flags:
 *   --no-timestamp      Skip updating build timestamps
 *   --skip-timestamp    Skip updating build timestamps (alias)
 */

const fs = require("fs");
const path = require("path");

const SRC_DIR = path.join(__dirname, "src");
const INDEX_FILE = path.join(SRC_DIR, "index.ts");
const skipTimestamp =
  process.argv.includes("--no-timestamp") ||
  process.argv.includes("--skip-timestamp");

/**
 * Get the most recent modification time from all source files
 */
function getMostRecentModificationTime(dir) {
  let mostRecent = 0;

  function scanDirectory(directory) {
    try {
      const items = fs.readdirSync(directory, { withFileTypes: true });

      for (const item of items) {
        const fullPath = path.join(directory, item.name);

        if (item.isDirectory()) {
          // Skip node_modules and dist
          if (item.name !== "node_modules" && item.name !== "dist") {
            scanDirectory(fullPath);
          }
        } else if (
          item.isFile() &&
          (item.name.endsWith(".ts") || item.name.endsWith(".js"))
        ) {
          const stats = fs.statSync(fullPath);
          const mtime = stats.mtime.getTime();
          if (mtime > mostRecent) {
            mostRecent = mtime;
          }
        }
      }
    } catch (error) {
      console.error(`Error scanning directory ${directory}:`, error.message);
    }
  }

  scanDirectory(dir);
  return mostRecent;
}

/**
 * Update the build timestamp in index.ts
 */
function updateBuildTimestamp() {
  try {
    console.log("[INFO] Updating build timestamp...");

    // Get most recent modification time from all source files
    const mostRecentTime = getMostRecentModificationTime(SRC_DIR);
    const unixTimestamp = Math.floor(mostRecentTime / 1000);

    // Read index.ts
    let content = fs.readFileSync(INDEX_FILE, "utf8");

    // Update build timestamp
    const buildRegex = /build:\s*["'](\d+)["']/;
    const match = content.match(buildRegex);

    if (match) {
      const oldTimestamp = match[1];

      if (oldTimestamp !== unixTimestamp.toString()) {
        content = content.replace(buildRegex, `build: "${unixTimestamp}"`);
        fs.writeFileSync(INDEX_FILE, content, "utf8");

        const date = new Date(mostRecentTime);
        console.log(
          `[OK] Build timestamp updated: ${oldTimestamp} -> ${unixTimestamp}`
        );
        console.log(`  Last modified: ${date.toLocaleString()}`);
        return true;
      } else {
        console.log(`[OK] Build timestamp already current: ${unixTimestamp}`);
        return false;
      }
    } else {
      console.warn("[!] No build timestamp found in index.ts");
      return false;
    }
  } catch (error) {
    console.error(`[X] Failed to update build timestamp: ${error.message}`);
    console.warn("[!] Continuing build despite timestamp update failure...");
    return false;
  }
}

// Run the update
console.log("=== VRCX Plugin System Build Timestamp Update ===\n");

if (skipTimestamp) {
  console.log(
    "[SKIP] Skipping build timestamp update (--no-timestamp flag set)"
  );
} else {
  updateBuildTimestamp();
}

console.log("");
