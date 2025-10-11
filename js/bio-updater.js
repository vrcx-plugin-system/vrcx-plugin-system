// ============================================================================
// BIO MANAGEMENT SYSTEM
// ============================================================================

class BioUpdater {
  static SCRIPT = {
    name: "Bio Updater Module",
    description:
      "Automatic bio updating with user statistics and custom templates",
    author: "Bluscream",
    version: "1.0.0",
    dependencies: [
      "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/config.js",
      "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/api-helpers.js",
      "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/utils.js",
    ],
  };
  constructor() {
    this.updateInterval = null;
    this.init();
  }

  init() {
    // Wait for cmake sureonfig to be available
    const checkConfig = () => {
      if (window.CONFIG && window.CONFIG.bio) {
        window.Logger?.log(
          "Bio updater initialized",
          { console: true },
          "info"
        );
        window.Logger?.log(
          `Bio template: ${window.CONFIG.bio.template}`,
          { console: true },
          "info"
        );
        this.updateInterval = setInterval(async () => {
          await this.updateBio();
        }, window.CONFIG.bio.updateInterval);
        setTimeout(async () => {
          await this.updateBio();
        }, window.CONFIG.bio.initialDelay);
      } else {
        setTimeout(checkConfig, 100);
      }
    };
    checkConfig();
  }

  async updateBio() {
    try {
      const now = Date.now();
      // Updated for new Pinia store structure
      const currentUser = window.$pinia?.user?.currentUser;
      if (!currentUser) {
        window.Logger?.log(
          "Current user not available, skipping bio update",
          { console: true },
          "warning"
        );
        return;
      }

      const stats = await window.database.getUserStats({
        id: currentUser.id,
      });
      const oldBio = currentUser.bio.split("\n-\n")[0];
      const steamPlayTime = await Utils.getSteamPlaytime(
        window.CONFIG.steam.id,
        window.CONFIG.steam.key
      );

      let steamHours,
        steamSeconds = null;
      if (steamPlayTime) {
        steamHours = `${Math.floor(steamPlayTime / 60)
          .toString()
          .padStart(2, "0")}h`;
        steamSeconds = steamPlayTime * 60 * 1000;
      }

      let playTimeText = Utils.timeToText(steamSeconds ?? stats.timeSpent);
      if (steamHours) playTimeText += ` (${steamHours})`;

      const moderations = Array.from(
        window.$pinia?.moderation?.cachedPlayerModerations?.values() || []
      );
      const last_activity = new Date(currentUser.last_activity);
      const favs = Array.from(
        window.$pinia?.favorite?.favoriteFriends?.values() || []
      );
      const joiners = favs.filter(
        (friend) => friend.groupKey === "friend:group_2"
      );
      const partners = favs.filter(
        (friend) => friend.groupKey === "friend:group_1"
      );

      const newBio = window.CONFIG.bio.template
        .replace("{last_activity}", Utils.timeToText(now - last_activity) ?? "")
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
        .replace("{now}", Utils.formatDateTime())
        .replace("{autojoin}", joiners.map((f) => f.name).join(", "))
        .replace("{partners}", partners.map((f) => f.name).join(", "))
        .replace(
          "{autoinvite}",
          window.customjs?.autoInviteManager?.getAutoInviteUser()
            ?.displayName ?? ""
        )
        .replace(
          "{tags_loaded}",
          window.customjs?.tagManager
            ? window.customjs.tagManager.getLoadedTagsCount()
            : 0
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
        window.Logger?.log(
          `Bio truncated to 499 chars + "..." (was ${
            oldBio.length + newBio.length
          } chars)`,
          { console: true },
          "warn"
        );
      }

      window.Logger?.log(`Updating bio to ${bio}`, { console: true }, "info");
      await API.saveBio(bio);
      window.Logger?.log(`Bio updated`, { vrcx: { notify: true } }, "success");
    } catch (error) {
      window.Logger?.log(
        `Error updating bio: ${error.message}`,
        { vrcx: { notify: true }, console: true },
        "error"
      );
    }
  }
}

// Auto-initialize the module
(function () {
  // Register this module in the global namespace
  window.customjs = window.customjs || {};
  window.customjs.bioUpdater = new BioUpdater();
  window.customjs.script = window.customjs.script || {};
  window.customjs.script.bioUpdater = BioUpdater.SCRIPT;

  // Also make BioUpdater available globally for backward compatibility
  window.BioUpdater = BioUpdater;

  console.log(
    `✓ Loaded ${BioUpdater.SCRIPT.name} v${BioUpdater.SCRIPT.version} by ${BioUpdater.SCRIPT.author}`
  );
})();
