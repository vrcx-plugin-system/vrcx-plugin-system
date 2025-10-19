/**
 * Update build timestamps in all core modules and index.ts
 * This runs before webpack build to ensure accurate timestamps
 */

const fs = require("fs");
const path = require("path");

const SRC_DIR = path.join(__dirname, "src");
const MODULES_DIR = path.join(SRC_DIR, "modules");
const INDEX_FILE = path.join(SRC_DIR, "index.ts");

/**
 * Get the most recent modification time from files in a directory
 */
function getMostRecentModificationTime(dir, filePattern = /\.(ts|js)$/) {
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
        } else if (item.isFile() && filePattern.test(item.name)) {
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
 * Update build timestamp in a file
 */
function updateBuildTimestampInFile(filePath, unixTimestamp) {
  try {
    let content = fs.readFileSync(filePath, "utf8");
    const buildRegex = /build:\s*["'](\d+)["']/;
    const match = content.match(buildRegex);

    if (match) {
      const oldTimestamp = match[1];

      if (oldTimestamp !== unixTimestamp.toString()) {
        content = content.replace(buildRegex, `build: "${unixTimestamp}"`);
        fs.writeFileSync(filePath, content, "utf8");
        return { updated: true, old: oldTimestamp, new: unixTimestamp };
      }
    }

    return { updated: false, old: match ? match[1] : null, new: unixTimestamp };
  } catch (error) {
    console.error(
      `  ⚠ Failed to update ${path.basename(filePath)}: ${error.message}`
    );
    return { updated: false, old: null, new: null };
  }
}

/**
 * Update timestamps for all core modules
 */
function updateModuleTimestamps() {
  console.log("📦 Updating core module timestamps...\n");

  const moduleFiles = [
    "utils.ts",
    "logger.ts",
    "config.ts",
    "repo.ts",
    "plugin.ts",
  ];

  let updatedCount = 0;

  for (const moduleName of moduleFiles) {
    const filePath = path.join(MODULES_DIR, moduleName);

    if (!fs.existsSync(filePath)) {
      console.warn(`  ⚠ Module not found: ${moduleName}`);
      continue;
    }

    // Get this module's modification time
    const stats = fs.statSync(filePath);
    const unixTimestamp = Math.floor(stats.mtime.getTime() / 1000);

    // Update timestamp in the file
    const result = updateBuildTimestampInFile(filePath, unixTimestamp);

    if (result.updated) {
      const date = new Date(stats.mtime);
      console.log(`  ✓ ${moduleName}: ${result.old} → ${result.new}`);
      console.log(`    Last modified: ${date.toLocaleString()}`);
      updatedCount++;
    } else if (result.new) {
      console.log(`  ○ ${moduleName}: ${result.new} (unchanged)`);
    }
  }

  console.log(`\n✓ Updated ${updatedCount} module(s)\n`);
}

/**
 * Update the main build timestamp in index.ts
 */
function updateMainBuildTimestamp() {
  console.log("🔄 Updating main build timestamp...\n");

  // Get most recent modification time from all source files
  const mostRecentTime = getMostRecentModificationTime(SRC_DIR);
  const unixTimestamp = Math.floor(mostRecentTime / 1000);

  // Update build timestamp in index.ts
  const result = updateBuildTimestampInFile(INDEX_FILE, unixTimestamp);

  if (result.updated) {
    const date = new Date(mostRecentTime);
    console.log(`  ✓ Main build updated: ${result.old} → ${result.new}`);
    console.log(`    Last modified: ${date.toLocaleString()}`);
  } else {
    console.log(`  ○ Main build: ${result.new} (unchanged)`);
  }

  console.log("");
}

// Run the updates
console.log("=== VRCX Plugin System Build Timestamp Update ===\n");
updateModuleTimestamps();
updateMainBuildTimestamp();
console.log("✨ Timestamp update complete!\n");
