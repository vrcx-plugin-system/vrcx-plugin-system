/**
 * Build repo.json from plugin files
 * Scans ../plugins directory and extracts metadata from each plugin
 */

const fs = require("fs");
const path = require("path");

// Configuration
const PLUGINS_DIR = path.join(__dirname, "..", "plugins");
const REPO_FILE = path.join(PLUGINS_DIR, "repo.json");
const BASE_URL =
  "https://github.com/vrcx-plugin-system/plugins/raw/refs/heads/main";

// Files to exclude from scanning
const EXCLUDE_FILES = ["repo.json", "README.md", "LICENSE", ".gitignore"];

// Default enabled plugins (core functionality)
const DEFAULT_ENABLED = [
  "bio-symbols-patch",
  "api-retry-patch",
  "user-badge-pipeline-patch",
  "context-menu-api",
  "nav-menu-api",
  "invite-message-api",
  "plugin-manager-ui",
];

/**
 * Extract plugin metadata from JavaScript file
 */
function extractPluginMetadata(filePath, fileName) {
  try {
    const content = fs.readFileSync(filePath, "utf8");
    const pluginId = fileName.replace(".js", "");

    // Extract constructor metadata
    const metadata = {
      id: pluginId,
      name: pluginId
        .split("-")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" "),
      description: "",
      author: "Unknown",
      build: "?",
      url: `${BASE_URL}/${fileName}`,
      tags: [],
      enabled: DEFAULT_ENABLED.includes(pluginId),
    };

    // Extract name
    const nameMatch = content.match(/name:\s*["']([^"']+)["']/);
    if (nameMatch) {
      metadata.name = nameMatch[1];
    }

    // Extract description
    const descMatch = content.match(/description:\s*["']([^"']+)["']/);
    if (descMatch) {
      metadata.description = descMatch[1];
    }

    // Extract author
    const authorMatch = content.match(/author:\s*["']([^"']+)["']/);
    if (authorMatch) {
      metadata.author = authorMatch[1];
    }

    // Extract build
    const buildMatch = content.match(/build:\s*["']([^"']+)["']/);
    if (buildMatch) {
      metadata.build = buildMatch[1];
    }

    // Extract tags
    const tagsMatch = content.match(/tags:\s*\[([^\]]+)\]/);
    if (tagsMatch) {
      const tagsStr = tagsMatch[1];
      metadata.tags = tagsStr
        .split(",")
        .map((t) => t.trim().replace(/["']/g, ""))
        .filter((t) => t.length > 0);
    }

    return metadata;
  } catch (error) {
    console.error(`Error extracting metadata from ${fileName}:`, error.message);
    return null;
  }
}

/**
 * Scan plugins directory and build repository
 */
function buildRepository() {
  console.log("🔍 Scanning plugins directory...");

  if (!fs.existsSync(PLUGINS_DIR)) {
    console.error(`❌ Plugins directory not found: ${PLUGINS_DIR}`);
    process.exit(1);
  }

  // Read all files in plugins directory
  const files = fs.readdirSync(PLUGINS_DIR);
  const pluginFiles = files.filter((file) => {
    return file.endsWith(".js") && !EXCLUDE_FILES.includes(file);
  });

  console.log(`📦 Found ${pluginFiles.length} plugin files`);

  // Extract metadata from each plugin
  const plugins = [];
  for (const file of pluginFiles) {
    const filePath = path.join(PLUGINS_DIR, file);
    const metadata = extractPluginMetadata(filePath, file);

    if (metadata) {
      plugins.push(metadata);
      console.log(`  ✓ ${metadata.name} (${metadata.id})`);
    } else {
      console.log(`  ✗ Failed to extract metadata from ${file}`);
    }
  }

  // Sort plugins by name
  plugins.sort((a, b) => a.name.localeCompare(b.name));

  // Build repository object
  const repository = {
    name: "VRCX Plugin Repository",
    description: "Default repository for VRCX plugins",
    author: "Bluscream",
    build: Date.now().toString(),
    url: "https://github.com/vrcx-plugin-system/plugins",
    plugins: plugins,
  };

  // Write to file
  try {
    fs.writeFileSync(REPO_FILE, JSON.stringify(repository, null, 2));
    console.log(`\n✅ Repository file created: ${REPO_FILE}`);
    console.log(`📊 Total plugins: ${plugins.length}`);

    // Show tag breakdown
    const tagCount = {};
    plugins.forEach((p) => {
      p.tags.forEach((tag) => {
        tagCount[tag] = (tagCount[tag] || 0) + 1;
      });
    });

    console.log(`\n🏷️ ${tagCount} Tags`);
    // Object.entries(tagCount)
    //   .sort(([, a], [, b]) => b - a)
    //   .slice(0, 15)
    //   .forEach(([tag, count]) => {
    //     console.log(`  ${tag}: ${count}`);
    //   });

    // Show enabled/disabled breakdown
    const enabledCount = plugins.filter((p) => p.enabled).length;
    const disabledCount = plugins.length - enabledCount;
    console.log(`\n🔌 Enabled: ${enabledCount}, Disabled: ${disabledCount}`);
  } catch (error) {
    console.error(`❌ Error writing repository file: ${error.message}`);
    process.exit(1);
  }
}

// Run the build
console.log("🚀 Building repository from plugins...\n");
buildRepository();
console.log("\n✨ Done!");
