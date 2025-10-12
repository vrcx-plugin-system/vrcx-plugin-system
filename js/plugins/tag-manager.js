// ============================================================================
// TAG MANAGER PLUGIN
// Version: 2.1.0
// Build: 1744630000
// ============================================================================

/**
 * Tag Manager Plugin
 * Custom user tags management with URL-based loading
 * Supports loading tags from external JSON sources (e.g., FewTags)
 */
class TagManagerPlugin extends Plugin {
  constructor() {
    super({
      name: "Tag Manager",
      description: "Custom user tags management with URL-based loading",
      author: "Bluscream",
      version: "2.1.0",
      build: "1744630000",
      dependencies: [
        "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/plugin.js",
        "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/plugins/config.js",
        "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/plugins/api-helpers.js",
        "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/plugins/utils.js",
      ],
    });

    // Map of URL -> Set of tag objects
    this.loadedTags = new Map();
  }

  async load() {
    this.logger.log("Tag Manager plugin ready");
    this.loaded = true;
  }

  async start() {
    // Wait for dependencies
    this.utils = await window.customjs.pluginManager.waitForPlugin("utils");
    this.apiHelpers = await window.customjs.pluginManager.waitForPlugin(
      "api-helpers"
    );

    this.enabled = true;
    this.started = true;
    this.logger.log(
      "Tag Manager plugin started (waiting for login to load tags)"
    );
  }

  async onLogin(currentUser) {
    this.logger.log(`User logged in: ${currentUser?.displayName}`);

    const tagConfig = this.getConfig("tags");
    if (!tagConfig) {
      this.logger.warn("Tags config not available, skipping tag loading");
      return;
    }

    const initialDelay = tagConfig.initialDelay || 5000;

    // Schedule initial tag load
    setTimeout(async () => {
      await this.loadAllTags();
      this.startPeriodicUpdates();

      // Log startup message
      try {
        const timestamp =
          this.utils?.getTimestamp() || new Date().toISOString();
        const msg = `VRCX Custom Tags loaded at ${timestamp}`;
        // Use the plugin's own logger
        this.logger.log(
          msg,
          { console: true, vrcx: { message: true } },
          "info"
        );
      } catch (error) {
        this.logger.log(`Tags loaded at ${new Date().toISOString()}`);
      }
    }, initialDelay);

    this.logger.log(`Tag loading scheduled (delay: ${initialDelay}ms)`);
  }

  async stop() {
    this.logger.log("Stopping Tag Manager");

    // Clear loaded tags
    this.loadedTags.clear();

    // Parent cleanup (will clear the timer automatically)
    await super.stop();
  }

  // ============================================================================
  // TAG LOADING
  // ============================================================================

  async loadAllTags() {
    const tagConfig = this.getConfig("tags");

    if (!tagConfig?.urls || tagConfig.urls.length === 0) {
      this.logger.warn("No tag URLs configured");
      return;
    }

    this.logger.log(`Loading tags from ${tagConfig.urls.length} URLs...`);

    for (const url of tagConfig.urls) {
      try {
        await this.loadTagsFromUrl(url);
      } catch (error) {
        this.logger.error(`Failed to load tags from ${url}:`, error);
      }
    }

    this.logger.log(
      `✓ Tag loading complete (${this.getLoadedTagsCount()} tags loaded)`
    );
  }

  async loadTagsFromUrl(url) {
    try {
      this.logger.log(`Fetching tags from: ${url}`);

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const tags = this.parseTagData(data, url);

      if (tags.length > 0) {
        this.loadedTags.set(url, new Set(tags));
        await this.applyTags(tags);
        this.logger.log(`✓ Loaded ${tags.length} tags from ${url}`);
      } else {
        this.logger.warn(`No valid tags found in ${url}`);
      }
    } catch (error) {
      this.logger.error(`Error loading tags from ${url}:`, error);
      throw error;
    }
  }

  parseTagData(data, url) {
    const tags = [];

    // Handle FewTags format: object with user IDs as keys
    if (typeof data === "object" && !Array.isArray(data)) {
      for (const [userId, userData] of Object.entries(data)) {
        if (userData && userData.tags && Array.isArray(userData.tags)) {
          const mainTag = userData.tag || userData.tags[0] || "Custom Tag";
          const tagColor = userData.foreground_color || "#FF00C6";

          tags.push({
            UserId: userId,
            Tag: this.cleanTagText(mainTag),
            TagColour: tagColor,
          });
        }
      }
    }
    // Handle alternative formats
    else if (Array.isArray(data)) {
      tags.push(...data);
    } else if (data.tags && Array.isArray(data.tags)) {
      tags.push(...data.tags);
    } else if (data.data && Array.isArray(data.data)) {
      tags.push(...data.data);
    } else {
      this.logger.warn(`Unknown data structure in ${url}`);
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
      return false;
    }

    if (!tag.UserId || typeof tag.UserId !== "string") {
      return false;
    }

    if (!tag.Tag || typeof tag.Tag !== "string") {
      return false;
    }

    // Set default color if not provided
    if (!tag.TagColour) {
      tag.TagColour = "#FF00C6";
    }

    return true;
  }

  async applyTags(tags) {
    const userStore = window.$pinia?.user;
    if (!userStore) {
      this.logger.warn("User store not available, cannot apply tags");
      return;
    }

    for (const tag of tags) {
      try {
        userStore.addCustomTag({
          UserId: tag.UserId,
          Tag: tag.Tag,
          TagColour: tag.TagColour,
        });
      } catch (error) {
        this.logger.error(`Error applying tag for user ${tag.UserId}:`, error);
      }
    }

    // Check friends and blocked players for tags
    this.checkFriendsAndBlockedForTags();
  }

  checkFriendsAndBlockedForTags() {
    try {
      const friends = window.$pinia?.user?.currentUser?.friends || [];
      let taggedFriendsCount = 0;

      for (const friendId of friends) {
        const friendTag = this.getUserTag(friendId);
        if (friendTag) {
          taggedFriendsCount++;
          const friendName = this.getFriendName(friendId);
          this.logger.log(
            `👥 Friend: ${friendName} (${friendId}) - Tag: ${friendTag.tag}`
          );
        }
      }

      // Check moderated players
      const moderations = Array.from(
        window.$pinia?.moderation?.cachedPlayerModerations?.values() || []
      );

      let taggedBlockedCount = 0;
      for (const moderated of moderations) {
        const moderatedTag = this.getUserTag(moderated.targetUserId);
        if (moderatedTag) {
          taggedBlockedCount++;
          this.logger.log(
            `🚫 Moderated: ${moderated.targetDisplayName} (${moderated.targetUserId}) - Tag: ${moderatedTag.tag}`
          );
        }
      }

      // Summary
      const totalTagged = taggedFriendsCount + taggedBlockedCount;
      this.logger.log(
        `${totalTagged} Tagged Users > Friends: ${taggedFriendsCount}/${friends.length} | Moderated: ${taggedBlockedCount}/${moderations.length}`
      );
    } catch (error) {
      this.logger.error(
        "Error checking friends and moderated players for tags:",
        error
      );
    }
  }

  startPeriodicUpdates() {
    const updateInterval = this.getConfig("tags.updateInterval", 3600000);

    const intervalId = this.registerTimer(
      setInterval(async () => {
        this.logger.log("Periodic tag update triggered");
        await this.loadAllTags();
      }, updateInterval)
    );

    this.logger.log(`Periodic updates started (interval: ${updateInterval}ms)`);
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  /**
   * Get tag for a specific user
   * @param {string} userId - User ID
   * @returns {object|null} Tag object or null
   */
  getUserTag(userId) {
    const customTags = window.$pinia?.user?.customUserTags;
    if (!customTags || customTags.size === 0) {
      return null;
    }
    return customTags.get(userId) || null;
  }

  /**
   * Get display name for a user
   * @param {string} userId - User ID
   * @returns {string} Display name or user ID
   */
  getFriendName(userId) {
    const cachedUser = window.$pinia?.user?.cachedUsers?.get(userId);
    return cachedUser?.displayName || userId;
  }

  /**
   * Manually refresh tags from all configured URLs
   */
  async refreshTags() {
    this.logger.log("Manually refreshing tags...");
    await this.loadAllTags();
  }

  /**
   * Add a single tag manually
   * @param {string} userId - User ID
   * @param {string} tag - Tag text
   * @param {string} color - Tag color (default: #FF00C6)
   */
  addTag(userId, tag, color = "#FF00C6") {
    try {
      const userStore = window.$pinia?.user;
      if (!userStore) {
        this.logger.warn("User store not available, cannot add tag");
        return;
      }

      userStore.addCustomTag({
        UserId: userId,
        Tag: tag,
        TagColour: color,
      });
      this.logger.log(`Manually added tag: ${tag} for user ${userId}`);
    } catch (error) {
      this.logger.error("Error adding manual tag:", error);
    }
  }

  /**
   * Get count of loaded tags from source URLs
   * @returns {number} Total loaded tags
   */
  getLoadedTagsCount() {
    let total = 0;
    for (const tagSet of this.loadedTags.values()) {
      total += tagSet.size;
    }
    return total;
  }

  /**
   * Get count of currently active tags in VRCX
   * @returns {number} Active tags count
   */
  getActiveTagsCount() {
    return window.$pinia?.user?.customUserTags?.size || 0;
  }

  /**
   * Get tags from specific URL
   * @param {string} url - URL to get tags from
   * @returns {Set} Set of tag objects
   */
  getTagsFromUrl(url) {
    return this.loadedTags.get(url) || new Set();
  }
}

// Export plugin class for PluginLoader
window.__LAST_PLUGIN_CLASS__ = TagManagerPlugin;
