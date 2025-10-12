// ============================================================================
// BIO UPDATER PLUGIN
// Version: 2.1.0
// Build: 1728668400
// ============================================================================

class BioUpdaterPlugin extends Plugin {
  constructor() {
    super({
      name: "Bio Updater",
      description:
        "Automatic bio updating with user statistics and custom templates",
      author: "Bluscream",
      version: "2.1.0",
      build: "1728668400",
      dependencies: [
        "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/Plugin.js",
        "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/plugins/config.js",
        "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/plugins/api-helpers.js",
        "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/plugins/utils.js",
      ],
    });

    this.updateTimerId = null;
  }

  async load() {
    this.log("Bio updater ready (waiting for login)");
    this.loaded = true;
  }

  async start() {
    this.enabled = true;
    this.started = true;
    this.log("Bio updater started (waiting for login to begin updates)");
  }

  async onLogin(currentUser) {
    this.log(`User logged in: ${currentUser?.displayName}`);

    const config = this.getConfig("bio");
    if (!config) {
      this.warn("Bio config not available, skipping bio updates");
      return;
    }

    // Register update timer with automatic cleanup
    this.updateTimerId = this.registerTimer(
      setInterval(async () => {
        await this.updateBio();
      }, config.updateInterval)
    );

    this.log(
      `Bio update timer registered (interval: ${config.updateInterval}ms)`
    );

    // Do initial update after delay
    setTimeout(async () => {
      await this.updateBio();
    }, config.initialDelay);

    this.log(`Initial bio update scheduled (delay: ${config.initialDelay}ms)`);
  }

  async stop() {
    this.log("Stopping bio updater");
    await super.stop(); // This will clean up all timers automatically
  }

  async updateBio() {
    try {
      this.log("Updating bio...");

      const now = Date.now();
      const currentUser = window.$pinia?.user?.currentUser;

      if (!currentUser) {
        this.warn("Current user not available, skipping bio update");
        return;
      }

      // Get user stats from database
      const stats = await window.database.getUserStats({
        id: currentUser.id,
      });

      // Split bio to preserve custom text before separator
      const oldBio = currentUser.bio.split("\n-\n")[0];

      // Get utils plugin for helper functions
      const utils = window.customjs?.pluginManager?.getPlugin("utils");

      // Get Steam playtime if configured
      const steamId = this.getConfig("steam.id");
      const steamKey = this.getConfig("steam.key");
      const steamPlayTime = await utils?.getSteamPlaytime(steamId, steamKey);

      let steamHours,
        steamSeconds = null;
      if (steamPlayTime) {
        steamHours = `${Math.floor(steamPlayTime / 60)
          .toString()
          .padStart(2, "0")}h`;
        steamSeconds = steamPlayTime * 60 * 1000;
      }

      // Calculate playtime text
      let playTimeText = utils?.timeToText(steamSeconds ?? stats.timeSpent);
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
      const bioTemplate = this.getConfig("bio.template");
      const newBio = bioTemplate
        .replace(
          "{last_activity}",
          window.customjs.utils?.timeToText(now - last_activity) ?? ""
        )
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
        .replace(
          "{now}",
          window.customjs.utils?.formatDateTime() ?? new Date().toISOString()
        )
        .replace("{autojoin}", joiners.map((f) => f.name).join(", "))
        .replace("{partners}", partners.map((f) => f.name).join(", "))
        .replace(
          "{autoinvite}",
          window.customjs.plugins
            ?.find((p) => p.metadata.id === "auto-invite")
            ?.getAutoInviteUser()?.displayName ?? ""
        )
        .replace(
          "{tags_loaded}",
          window.customjs.plugins
            ?.find((p) => p.metadata.id === "tag-manager")
            ?.getLoadedTagsCount() ?? 0
        )
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
        this.warn(
          `Bio truncated to 499 chars + "..." (was ${
            oldBio.length + newBio.length
          } chars)`
        );
      }

      this.log(`Updating bio (${bio.length} chars)`);

      // Save bio via API
      await window.customjs.api?.saveBio(bio);

      this.log("✓ Bio updated successfully");

      // Emit event for other plugins
      this.emit("bio-updated", { bio, timestamp: now });
    } catch (error) {
      this.error(`Error updating bio: ${error.message}`);
    }
  }

  /**
   * Manually trigger bio update
   */
  async triggerUpdate() {
    this.log("Manual bio update triggered");
    await this.updateBio();
  }
}

// Export plugin class for PluginLoader
window.__LAST_PLUGIN_CLASS__ = BioUpdaterPlugin;
