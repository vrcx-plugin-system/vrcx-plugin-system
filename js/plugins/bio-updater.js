class BioUpdaterPlugin extends Plugin {
  constructor() {
    super({
      name: "Bio Updater",
      description:
        "Automatic bio updating with user statistics and custom templates",
      author: "Bluscream",
      version: "3.1.0",
      build: "1728935100",
      dependencies: [],
    });

    this.updateTimerId = null;
  }

  async load() {
    // Define settings using new Equicord-style system
    const SettingType = window.customjs.SettingType;

    const defaultTemplate = `-
Relationship: {partners} <3
Auto Accept: {autojoin}
Auto Invite: {autoinvite}

Real Rank: {rank}
Friends: {friends} | Blocked: {blocked} | Muted: {muted}
Time played: {playtime}
Date joined: {date_joined}
Last updated: {now} (every 2h)
Tags loaded: {tags_loaded}

User ID: {userId}
Steam ID: {steamId}
Oculus ID: {oculusId}`;

    // Define category metadata
    this.categories = this.defineSettingsCategories({
      timing: {
        name: "Update Timing",
        description: "Control when and how often bio updates occur",
      },
      steam: {
        name: "Steam Integration",
        description: "Steam API credentials for playtime tracking",
      },
      template: {
        name: "Bio Template",
        description: "Customize your bio content and placeholders",
      },
    });

    this.settings = this.defineSettings({
      updateInterval: {
        type: SettingType.NUMBER,
        description: "How often to update bio (default: 2 hours in ms)",
        category: "timing",
        default: 7200000,
      },
      initialDelay: {
        type: SettingType.NUMBER,
        description:
          "Delay before first update after login (default: 20 seconds in ms)",
        category: "timing",
        default: 20000,
      },
      steamId: {
        type: SettingType.STRING,
        description: "Your Steam ID64 (can be base64 encoded)",
        category: "steam",
        placeholder: "Steam ID64",
        default: "",
      },
      apiKey: {
        type: SettingType.STRING,
        description: "Your Steam Web API key (can be base64 encoded)",
        category: "steam",
        placeholder: "Steam API Key",
        default: "",
      },
      appId: {
        type: SettingType.STRING,
        description: "Steam app ID for VRChat (default: 438100)",
        category: "steam",
        default: "438100",
      },
      template: {
        type: SettingType.STRING,
        description: "Bio template with placeholders",
        category: "template",
        placeholder: defaultTemplate,
        default: defaultTemplate,
        variables: {
          "{partners}": "Relationship partners count",
          "{autojoin}": "Auto-accept friends status",
          "{autoinvite}": "Auto-invite status",
          "{rank}": "Real VRChat trust rank",
          "{friends}": "Friend count",
          "{blocked}": "Blocked users count",
          "{muted}": "Muted users count",
          "{playtime}": "Total VRChat playtime",
          "{date_joined}": "Account creation date",
          "{now}": "Current date/time",
          "{tags_loaded}": "Number of custom tags loaded",
          "{userId}": "Your VRChat user ID",
          "{steamId}": "Your Steam ID64",
          "{oculusId}": "Your Oculus ID",
          "{last_activity}": "Time since last activity",
        },
      },
    });

    this.logger.log(
      `⚙️ Update interval: ${this.settings.store.updateInterval}ms`
    );
    this.logger.log(
      `⚙️ Template configured: ${this.settings.store.template.length} chars`
    );

    this.logger.log("Bio updater ready (waiting for login)");
    this.loaded = true;
  }

  async start() {
    // Setup utils shortcut
    this.utils = window.customjs.utils;

    // Wait for dependencies
    this.autoInvite = await window.customjs.pluginManager.waitForPlugin(
      "auto-invite"
    );
    this.tagManager = await window.customjs.pluginManager.waitForPlugin(
      "tag-manager"
    );

    this.enabled = true;
    this.started = true;
    this.logger.log("Bio updater started (waiting for login to begin updates)");
  }

  async onLogin(currentUser) {
    this.logger.log(`User logged in: ${currentUser?.displayName}`);

    // Use settings from ConfigManager
    const updateInterval = this.settings.store.updateInterval;
    const initialDelay = this.settings.store.initialDelay;

    // Register update timer with automatic cleanup
    this.updateTimerId = this.registerTimer(
      setInterval(async () => {
        await this.updateBio();
      }, updateInterval)
    );

    this.logger.log(
      `Bio update timer registered (interval: ${updateInterval}ms)`
    );

    // Do initial update after delay
    setTimeout(async () => {
      await this.updateBio();
    }, initialDelay);

    this.logger.log(`Initial bio update scheduled (delay: ${initialDelay}ms)`);
  }

  async stop() {
    this.logger.log("Stopping bio updater");
    await super.stop(); // This will clean up all timers automatically
  }

  async updateBio() {
    try {
      this.logger.log("Updating bio...");

      const now = Date.now();
      const currentUser = window.$pinia?.user?.currentUser;

      if (!currentUser) {
        this.logger.warn("Current user not available, skipping bio update");
        return;
      }

      // Get user stats from database
      const stats = await window.database.getUserStats({
        id: currentUser.id,
      });

      // Split bio to preserve custom text before separator
      const oldBio = currentUser.bio.split("\n-\n")[0];

      // Get Steam playtime if configured
      const steamId = this.settings.store.steamId;
      const steamKey = this.settings.store.apiKey;
      const steamAppId = this.settings.store.appId;
      const steamPlayTime = await this.getSteamPlaytime(
        steamId,
        steamKey,
        steamAppId
      );

      let steamHours,
        steamSeconds = null;
      if (steamPlayTime) {
        steamHours = `${Math.floor(steamPlayTime / 60)
          .toString()
          .padStart(2, "0")}h`;
        steamSeconds = steamPlayTime * 60 * 1000;
      }

      // Calculate playtime text
      let playTimeText = this.timeToText(steamSeconds ?? stats.timeSpent);
      if (steamHours) playTimeText += ` (${steamHours})`;

      // Get moderations
      const moderations = Array.from(
        window.$pinia?.moderation?.cachedPlayerModerations?.values() || []
      );

      // Get last activity
      const last_activity = new Date(currentUser.last_activity);

      // Get favorites
      const favs = Array.from(
        window.$pinia?.favorite?.favoriteFriends?.values() || []
      );
      const joiners = favs.filter(
        (friend) => friend.groupKey === "friend:group_2"
      );
      const partners = favs.filter(
        (friend) => friend.groupKey === "friend:group_1"
      );

      // Apply template with replacements
      const bioTemplate = this.settings.store.template;

      const newBio = bioTemplate
        .replace("{last_activity}", this.timeToText(now - last_activity))
        .replace("{playtime}", playTimeText)
        .replace("{date_joined}", currentUser.date_joined ?? "Unknown")
        .replace("{friends}", currentUser.friends.length ?? "?")
        .replace(
          "{blocked}",
          moderations.filter((item) => item.type === "block").length ?? "?"
        )
        .replace(
          "{muted}",
          moderations.filter((item) => item.type === "mute").length ?? "?"
        )
        .replace("{now}", this.formatDateTime())
        .replace("{autojoin}", joiners.map((f) => f.name).join(", "))
        .replace("{partners}", partners.map((f) => f.name).join(", "))
        .replace(
          "{autoinvite}",
          this.autoInvite
            ?.getAutoInviteUsersList()
            ?.map((u) => u.displayName)
            .join(", ") ?? ""
        )
        .replace("{tags_loaded}", this.tagManager?.getLoadedTagsCount() ?? 0)
        .replace("{userId}", currentUser.id)
        .replace("{steamId}", currentUser.steamId)
        .replace("{oculusId}", currentUser.oculusId)
        .replace("{picoId}", currentUser.picoId)
        .replace("{viveId}", currentUser.viveId)
        .replace("{rank}", currentUser.$trustLevel);

      let bio = oldBio + newBio;

      // Ensure bio doesn't exceed 512 characters
      if (bio.length > 512) {
        bio = bio.substring(0, 499) + "...";
        this.logger.warn(
          `Bio truncated to 499 chars + "..." (was ${
            oldBio.length + newBio.length
          } chars)`
        );
      }

      this.logger.log(`Updating bio (${bio.length} chars)`);

      // Save bio via utils helper
      await this.utils.saveBio(bio);

      this.logger.log("✓ Bio updated successfully");

      // Emit event for other plugins
      this.emit("bio-updated", { bio, timestamp: now });
    } catch (error) {
      this.logger.error(`Error updating bio: ${error.message}`);
    }
  }

  /**
   * Manually trigger bio update
   */
  async triggerUpdate() {
    this.logger.log("Manual bio update triggered");
    await this.updateBio();
  }

  /**
   * Convert milliseconds to human-readable text
   * @param {number} ms - Milliseconds
   * @returns {string} Human-readable time (e.g., "2d 3h")
   */
  timeToText(ms) {
    if (!ms || ms < 0) return "0s";

    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }

  /**
   * Format date/time as YYYY-MM-DD HH:MM:SS GMT+1
   * @param {Date} now - Optional date object (defaults to now)
   * @returns {string} Formatted date/time
   */
  formatDateTime(now = null) {
    now = now ?? new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds} GMT+1`;
  }

  /**
   * Try to decode base64 string (if it looks like base64)
   * @param {string} str - String to decode
   * @returns {string} Decoded string or original if not base64
   */
  tryDecodeBase64(str) {
    if (!str || typeof str !== "string") return str;
    if (!str.endsWith("=")) return str;

    try {
      const decoded = atob(str);
      this.logger.log("Decoded base64 string");
      return decoded;
    } catch (error) {
      this.logger.warn(`Failed to decode base64: ${error.message}`);
      return str;
    }
  }

  /**
   * Get Steam playtime for an app
   * @param {string} steamId - Steam ID (can be base64 encoded)
   * @param {string} apiKey - Steam API key (can be base64 encoded)
   * @param {string} appId - Steam app ID (default: 438100 for VRChat)
   * @returns {Promise<number|null>} Playtime in minutes or null
   */
  async getSteamPlaytime(steamId, apiKey, appId = "438100") {
    try {
      if (!steamId) {
        this.logger.warn("No Steam ID provided");
        return null;
      }

      // Decode base64 if needed
      steamId = this.tryDecodeBase64(steamId);
      apiKey = this.tryDecodeBase64(apiKey);

      const response = await fetch(
        `https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=${apiKey}&steamid=${steamId}&format=json&include_played_free_games=1`
      );
      const data = await response.json();

      const game = data?.response?.games?.find((g) => g.appid == appId);
      if (!game) {
        this.logger.warn(`No playtime data found for app ${appId}`);
        return null;
      }

      const playtimeMinutes = game.playtime_forever;
      this.logger.log(`Got Steam playtime: ${playtimeMinutes} minutes`);
      return playtimeMinutes;
    } catch (error) {
      this.logger.error(`Error getting Steam playtime: ${error.message}`);
      return null;
    }
  }
}

// Export plugin class for PluginLoader
window.customjs.__LAST_PLUGIN_CLASS__ = BioUpdaterPlugin;
