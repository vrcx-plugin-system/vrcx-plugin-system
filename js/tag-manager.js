// ============================================================================
// CUSTOM TAGS MANAGEMENT
// ============================================================================

class CustomTagManager {
  static SCRIPT = {
    name: "Tag Manager Module",
    description: "Custom user tags management with URL-based loading",
    author: "Bluscream",
    version: "1.0.0",
    build: "{build:tag-manager.js}",
    dependencies: [
      "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/config.js",
      "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/api-helpers.js",
      "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/utils.js",
    ],
  };
  constructor() {
    this.loadedTags = new Map(); // Map of URL -> Set of tag objects
    this.updateInterval = null;
    this.on_startup();
  }

  on_startup() {
    // Register the on_login hook (lifecycle manager is guaranteed to be ready)
    window.on_login((currentUser) => this.on_login(currentUser));
  }

  on_login(currentUser) {
    // Runs after successful VRChat login - load tags now (receives currentUser object)
    const tagConfig = window.customjs?.config?.tags;
    const initialDelay = tagConfig?.initialDelay || 5000;

    setTimeout(async () => {
      await this.loadAllTags();
      this.startPeriodicUpdates();

      // Log startup message
      try {
        const timestamp = window.Utils?.getTimestamp
          ? window.Utils.getTimestamp()
          : new Date().toISOString();
        const msg = `VRCX-Utils started at\n ${timestamp}`;
        window.Logger?.log(msg, window.Logger.defaultOptions, "info") ||
          console.log(msg);
      } catch (error) {
        console.log("VRCX-Utils started at", new Date().toISOString());
      }
    }, initialDelay);
  }

  async loadAllTags() {
    const tagConfig = window.customjs?.config?.tags;

    if (!tagConfig?.urls || tagConfig.urls.length === 0) {
      console.warn("No tag URLs configured");
      return;
    }

    for (const url of tagConfig.urls) {
      try {
        await this.loadTagsFromUrl(url);
      } catch (error) {
        console.error(`Failed to load tags from ${url}:`, error.message);
      }
    }
  }

  async loadTagsFromUrl(url) {
    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const tags = this.parseTagData(data, url);

      if (tags.length > 0) {
        this.loadedTags.set(url, new Set(tags));
        await this.applyTags(tags);
      }
    } catch (error) {
      console.error(`Error loading tags from ${url}:`, error.message);
      throw error;
    }
  }

  parseTagData(data, url) {
    const tags = [];

    // Handle FewTags format: object with user IDs as keys
    if (typeof data === "object" && !Array.isArray(data)) {
      for (const [userId, userData] of Object.entries(data)) {
        if (userData && userData.tags && Array.isArray(userData.tags)) {
          // Extract the main tag (usually the first one or specified tag)
          const mainTag = userData.tag || userData.tags[0] || "Custom Tag";
          const tagColor = userData.foreground_color || "#FF00C6";

          // Add the main tag
          tags.push({
            UserId: userId,
            Tag: this.cleanTagText(mainTag),
            TagColour: tagColor,
          });

          // Optionally add individual tags from the tags array
          // (uncomment if you want each tag as a separate entry)
          /*
                    for (const tagText of userData.tags) {
                        tags.push({
                            UserId: userId,
                            Tag: this.cleanTagText(tagText),
                            TagColour: tagColor
                        });
                    }
                    */
        }
      }
    }
    // Handle alternative formats
    else if (Array.isArray(data)) {
      // Direct array of tags
      tags.push(...data);
    } else if (data.tags && Array.isArray(data.tags)) {
      // Object with tags property
      tags.push(...data.tags);
    } else if (data.data && Array.isArray(data.data)) {
      // Object with data property
      tags.push(...data.data);
    } else {
      window.Logger?.log(
        `Unknown data structure in ${url}: ${JSON.stringify(data)}`,
        { console: true },
        "warning"
      );
      return [];
    }

    // Validate and filter tags
    return tags.filter((tag) => this.validateTag(tag, url));
  }

  cleanTagText(tagText) {
    if (typeof tagText !== "string") return "Custom Tag";

    // Remove HTML-like color tags and formatting
    return tagText
      .replace(/<color=#[^>]*>/g, "")
      .replace(/<\/color>/g, "")
      .replace(/\*\*/g, "")
      .replace(/\*/g, "")
      .replace(/_/g, "")
      .trim();
  }

  validateTag(tag, url) {
    if (!tag || typeof tag !== "object") {
      window.Logger?.log(
        `Invalid tag object in ${url}: ${JSON.stringify(tag)}`,
        { console: true },
        "warning"
      );
      return false;
    }

    if (!tag.UserId || typeof tag.UserId !== "string") {
      window.Logger?.log(
        `Invalid UserId in tag from ${url}: ${JSON.stringify(tag)}`,
        { console: true },
        "warning"
      );
      return false;
    }

    if (!tag.Tag || typeof tag.Tag !== "string") {
      window.Logger?.log(
        `Invalid Tag in tag from ${url}: ${JSON.stringify(tag)}`,
        { console: true },
        "warning"
      );
      return false;
    }

    // Validate color if provided
    if (tag.TagColour && typeof tag.TagColour !== "string") {
      window.Logger?.log(
        `Invalid TagColour in tag from ${url}: ${JSON.stringify(tag)}`,
        { console: true },
        "warning"
      );
      return false;
    }

    // Set default color if not provided
    if (!tag.TagColour) {
      tag.TagColour = "#FF00C6";
    }

    return true;
  }

  async applyTags(tags) {
    // Updated for new Pinia store structure
    const userStore = window.$pinia?.user;
    if (!userStore) {
      window.Logger?.log(
        "User store not available, cannot apply tags",
        { console: true },
        "warning"
      );
      return;
    }

    for (const tag of tags) {
      try {
        // VRCX stores tags with userId as key, and only ONE tag per user
        // The key is just the userId, not userId_TagName
        userStore.addCustomTag({
          UserId: tag.UserId,
          Tag: tag.Tag,
          TagColour: tag.TagColour,
        });
      } catch (error) {
        window.Logger?.log(
          `Error applying tag for user ${tag.UserId}: ${error.message}`,
          { console: true },
          "error"
        );
      }
    }

    // After applying tags, check friends and blocked players for tags
    this.checkFriendsAndBlockedForTags();
  }

  checkFriendsAndBlockedForTags() {
    try {
      // Check friends - Updated for new Pinia store structure
      // NOTE: friends array contains userId strings directly, not objects!
      const friends = window.$pinia?.user?.currentUser?.friends || [];

      let taggedFriendsCount = 0;
      for (const friendId of friends) {
        // Friends array contains userId strings directly
        const friendTag = this.getUserTag(friendId);
        if (friendTag) {
          taggedFriendsCount++;
          // Look up friend name if available
          const friendName = this.getFriendName(friendId);
          window.Logger?.log(
            `👥 Friend: ${friendName} (${friendId}) - Tag: ${friendTag.tag}`,
            { console: true },
            "info"
          );
        }
      }

      // Check moderated players - Updated for new Pinia store structure
      const moderations = Array.from(
        window.$pinia?.moderation?.cachedPlayerModerations?.values() || []
      );

      let taggedBlockedCount = 0;
      for (const moderated of moderations) {
        const moderatedTag = this.getUserTag(moderated.targetUserId);
        if (moderatedTag) {
          taggedBlockedCount++;
          window.Logger?.log(
            `🚫 Moderated: ${moderated.targetDisplayName} (${moderated.targetUserId}) - Tag: ${moderatedTag.tag}`,
            { console: true },
            "info"
          );
        }
      }

      // Summary - Single line format
      const totalTagged = taggedFriendsCount + taggedBlockedCount;
      window.Logger?.log(
        `${totalTagged} Tagged Users > Friends: ${taggedFriendsCount}/${friends.length} | Moderated: ${taggedBlockedCount}/${moderations.length}`,
        { console: true },
        "success"
      );
    } catch (error) {
      window.Logger?.log(
        `Error checking friends and moderated players for tags: ${error.message}`,
        { console: true },
        "error"
      );
    }
  }

  getUserTag(userId) {
    // Updated for new Pinia store structure - use customUserTags not customTags!
    // VRCX stores tags with userId as key directly, ONE tag per user
    // Tag structure: Map<userId, { tag: string, colour: string }>
    const customTags = window.$pinia?.user?.customUserTags;
    if (!customTags || customTags.size === 0) {
      return null;
    }

    return customTags.get(userId) || null;
  }

  getFriendName(userId) {
    // Helper to get friend display name from cached users
    const cachedUser = window.$pinia?.user?.cachedUsers?.get(userId);
    return cachedUser?.displayName || userId;
  }

  startPeriodicUpdates() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    this.updateInterval = setInterval(async () => {
      window.Logger?.log(
        "Updating tags from URLs...",
        { console: true },
        "info"
      );
      await this.loadAllTags();
    }, window.customjs?.config?.tags?.updateInterval || 3600000);
  }

  // Method to manually refresh tags
  async refreshTags() {
    window.Logger?.log(
      "Manually refreshing tags...",
      { console: true },
      "info"
    );
    await this.loadAllTags();
  }

  // Method to add a single tag manually
  addTag(userId, tag, color = "#FF00C6") {
    try {
      // Updated for new Pinia store structure
      const userStore = window.$pinia?.user;
      if (!userStore) {
        window.Logger?.log(
          "User store not available, cannot add tag",
          { console: true },
          "warning"
        );
        return;
      }

      userStore.addCustomTag({
        UserId: userId,
        Tag: tag,
        TagColour: color,
      });
      window.Logger?.log(
        `Manually added tag: ${tag} for user ${userId}`,
        { console: true },
        "success"
      );
    } catch (error) {
      window.Logger?.log(
        `Error adding manual tag: ${error.message}`,
        { console: true },
        "error"
      );
    }
  }

  // Method to get loaded tags count (from source URLs)
  getLoadedTagsCount() {
    let total = 0;
    for (const tagSet of this.loadedTags.values()) {
      total += tagSet.size;
    }
    return total;
  }

  // Method to get currently active tags count (in VRCX)
  getActiveTagsCount() {
    return window.$pinia?.user?.customUserTags?.size || 0;
  }

  // Method to get tags from specific URL
  getTagsFromUrl(url) {
    return this.loadedTags.get(url) || new Set();
  }

  // Cleanup method
  destroy() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    this.loadedTags.clear();
  }
}

// Auto-initialize the module
(function () {
  // Register this module in the global namespace
  window.customjs = window.customjs || {};
  window.customjs.tagManager = new CustomTagManager();
  window.customjs.script = window.customjs.script || {};
  window.customjs.script.tagManager = CustomTagManager.SCRIPT;

  // Also make CustomTagManager available globally for backward compatibility
  window.CustomTagManager = CustomTagManager;

  console.log(
    `✓ Loaded ${CustomTagManager.SCRIPT.name} v${CustomTagManager.SCRIPT.version} by ${CustomTagManager.SCRIPT.author}`
  );
})();
