class TagManagerPlugin extends Plugin {
  constructor() {
    super({
      name: "Tag Manager",
      description: "Custom user tags management with URL-based loading",
      author: "Bluscream",
      version: "3.2.0",
      build: "1760363253",
      dependencies: [],
    });

    // Map of URL -> Set of tag objects
    this.loadedTags = new Map();
  }

  async load() {
    // Define settings using new Equicord-style system
    const SettingType = window.customjs.SettingType;

    // Define category metadata
    this.categories = this.defineSettingsCategories({
      general: {
        name: "Tag Sources",
        description: "Configure tag loading sources",
      },
      timing: {
        name: "Update Timing",
        description: "Control when and how often tags are refreshed",
      },
      notifications: {
        name: "Notifications",
        description: "Configure notifications for tagged players",
      },
    });

    this.settings = this.defineSettings({
      urls: {
        type: SettingType.CUSTOM,
        description: "URLs to load user tags from",
        category: "general",
        default: [
          "https://github.com/Bluscream/FewTags/raw/refs/heads/main/usertags.json",
        ],
      },
      updateInterval: {
        type: SettingType.NUMBER,
        description: "How often to reload tags (default: 1 hour in ms)",
        category: "timing",
        default: 3600000,
      },
      initialDelay: {
        type: SettingType.NUMBER,
        description:
          "Delay before first tag load after login (default: 5 seconds in ms)",
        category: "timing",
        default: 5000,
      },
      notifyOnPlayerJoin: {
        type: SettingType.BOOLEAN,
        description:
          "Show notification when a tagged player joins your instance",
        category: "notifications",
        default: true,
      },
    });

    this.logger.log(
      `⚙️ Configured tag sources: ${this.settings.store.urls.length}`
    );

    this.logger.log("Tag Manager plugin ready");
    this.loaded = true;
  }

  async start() {
    // Setup player join monitoring
    this.setupPlayerJoinMonitoring();

    this.enabled = true;
    this.started = true;
    this.logger.log(
      "Tag Manager plugin started (waiting for login to load tags)"
    );
  }

  async onLogin(currentUser) {
    this.logger.log(`User logged in: ${currentUser?.displayName}`);

    const initialDelay = this.settings.store.initialDelay;

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

    // Cleanup is handled automatically by parent class via subscriptions
    // Parent cleanup (will clear the timer and subscriptions automatically)
    await super.stop();
  }

  async loadAllTags() {
    const urls = this.settings.store.urls;

    if (!urls || urls.length === 0) {
      this.logger.warn("No tag URLs configured");
      return;
    }

    this.logger.log(`Loading tags from ${urls.length} URLs...`);

    for (const url of urls) {
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
    const updateInterval = this.settings.store.updateInterval;

    const intervalId = this.registerTimer(
      setInterval(async () => {
        this.logger.log("Periodic tag update triggered");
        await this.loadAllTags();
      }, updateInterval)
    );

    this.logger.log(`Periodic updates started (interval: ${updateInterval}ms)`);
  }

  setupPlayerJoinMonitoring() {
    // Subscribe to gameLog store changes
    this.subscribe("GAMELOG", ({ gameLogSessionTable }) => {
      if (gameLogSessionTable?.length > 0) {
        // Get the latest entry
        const latestEntry = gameLogSessionTable[gameLogSessionTable.length - 1];

        // Check if it's a player join event
        if (latestEntry?.type === "OnPlayerJoined") {
          this.handlePlayerJoin(latestEntry);
        }
      }
    });

    this.logger.log("Player join monitoring registered");
  }

  handlePlayerJoin(entry) {
    try {
      // Check if notifications are enabled
      if (!this.settings.store.notifyOnPlayerJoin) {
        return;
      }

      // Handle both raw gameLog format and database entry format
      const playerId = entry.userId || entry.user_id;
      const playerName =
        entry.displayName || entry.display_name || "Unknown Player";

      if (!playerId) {
        return;
      }

      // Check if the player has a custom tag
      const playerTag = this.getUserTag(playerId);

      if (playerTag) {
        const message = `${playerName} joined (${playerTag.tag})`;

        // Log with desktop and VR notifications
        this.logger.log(
          message,
          { console: true, desktop: true, xsoverlay: true, ovrtoolkit: true },
          "info"
        );
      }
    } catch (error) {
      this.logger.error("Error handling player join:", error);
    }
  }

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
window.customjs.__LAST_PLUGIN_CLASS__ = TagManagerPlugin;
