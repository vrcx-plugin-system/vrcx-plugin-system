// ============================================================================
// UTILITY CLASSES
// ============================================================================

// Utils class for common utility functions
class Utils {
  static SCRIPT = {
    name: "Utils Module",
    description: "Utility classes and helper functions for VRCX custom modules",
    author: "Bluscream",
    version: "1.0.0",
    build: "1760216414",
    dependencies: [],
  };
  static isEmpty(v) {
    return v === null || v === undefined || v === "";
  }

  static timeToText(ms) {
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

  static getTimestamp(now = null) {
    now = now ?? new Date();
    const timestamp = now.toLocaleString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
    return timestamp;
  }

  static formatDateTime(now = null) {
    now = now ?? new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds} GMT+1`;
  }

  static tryDecodeBase64(str) {
    if (!str || typeof str !== "string") {
      return str;
    }

    // Check if string looks like base64 (ends with = or =)
    if (!str.endsWith("=")) {
      return str;
    }

    try {
      const decoded = atob(str);
      window.Logger?.log("Decoded base64 string", { console: true }, "info");
      return decoded;
    } catch (error) {
      window.Logger?.log(
        `Failed to decode as base64, using original: ${error.message}`,
        { console: true },
        "warning"
      );
      return str;
    }
  }

  static async getSteamPlaytime(steamId, apiKey, appId = "438100") {
    try {
      if (!steamId) {
        window.Logger?.log("No Steam ID found", { console: true }, "warning");
        return null;
      }

      // Decode base64 encoded steam ID or key if needed
      steamId = this.tryDecodeBase64(steamId);
      apiKey = this.tryDecodeBase64(apiKey);

      const response = await fetch(
        `https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=${apiKey}&steamid=${steamId}&format=json&include_played_free_games=1`
      );
      const data = await response.json();

      // Filter games by app ID to find VRChat specifically
      const vrchatGame = data?.response?.games?.find(
        (game) => game.appid == appId
      );
      if (!vrchatGame) {
        window.Logger?.log(
          "No VRChat playtime data found",
          { console: true },
          "warning"
        );
        return null;
      }
      const playtimeMinutes = vrchatGame.playtime_forever;
      window.Logger?.log(
        `Got Steam playtime for vrchat: ${playtimeMinutes} minutes`,
        { console: true },
        "info"
      );
      return playtimeMinutes;
    } catch (error) {
      window.Logger?.log(
        `Error getting Steam playtime: ${error.message}`,
        { console: true },
        "error"
      );
      return null;
    }
  }
  // Global registry to track processed menus
  static processedMenus = new Set();

  // Utility function to clear the processed menus registry (useful for debugging)
  static clearProcessedMenus() {
    Utils.processedMenus.clear();
    window.Logger?.log(
      "Cleared processed menus registry",
      { console: true },
      "info"
    );
  }
}

// Auto-initialize the module
(function () {
  // Register this module in the global namespace
  window.customjs = window.customjs || {};
  window.customjs.utils = Utils;
  window.customjs.clearProcessedMenus = Utils.clearProcessedMenus;
  window.customjs.script = window.customjs.script || {};
  window.customjs.script.utils = Utils.SCRIPT;

  // Also make Utils available globally for backward compatibility
  window.Utils = Utils;
  window.clearProcessedMenus = Utils.clearProcessedMenus;

  console.log(
    `✓ Loaded ${Utils.SCRIPT.name} v${Utils.SCRIPT.version} by ${Utils.SCRIPT.author}`
  );
})();
