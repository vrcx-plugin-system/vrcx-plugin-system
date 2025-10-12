// ============================================================================
// UTILS PLUGIN
// Version: 2.0.0
// Build: 1728668400
// ============================================================================

class UtilsPlugin extends Plugin {
  constructor() {
    super({
      name: "Utils Plugin",
      description:
        "Utility functions for time, clipboard, notifications, and Steam API",
      author: "Bluscream",
      version: "2.0.0",
      build: "1728668400",
      dependencies: [
        "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/plugin.js",
      ],
    });

    // Track processed menus for context menu functionality
    this.processedMenus = new Set();
  }

  async load() {
    this.log("Utility functions ready");
    this.loaded = true;
  }

  async start() {
    this.enabled = true;
    this.started = true;
    this.log("Utils plugin started and ready");
  }

  async onLogin(user) {
    // No login-specific logic needed for utils plugin
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Check if value is empty (null, undefined, or empty string)
   * @param {any} v - Value to check
   * @returns {boolean} True if empty
   */
  isEmpty(v) {
    return v === null || v === undefined || v === "";
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
   * Get current timestamp as localized string
   * @param {Date} now - Optional date object (defaults to now)
   * @returns {string} Localized timestamp
   */
  getTimestamp(now = null) {
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
      this.log("Decoded base64 string");
      return decoded;
    } catch (error) {
      this.warn(`Failed to decode base64: ${error.message}`);
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
        this.warn("No Steam ID provided");
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
        this.warn(`No playtime data found for app ${appId}`);
        return null;
      }

      const playtimeMinutes = game.playtime_forever;
      this.log(`Got Steam playtime: ${playtimeMinutes} minutes`);
      return playtimeMinutes;
    } catch (error) {
      this.error(`Error getting Steam playtime: ${error.message}`);
      return null;
    }
  }

  /**
   * Copy text to clipboard with fallback
   * @param {string} text - Text to copy
   * @param {string} description - Description for logging
   * @returns {Promise<boolean>} True if successful
   */
  async copyToClipboard(text, description = "Text") {
    try {
      // Try modern clipboard API
      await navigator.clipboard.writeText(text);
      this.log(`${description} copied to clipboard`);
      return true;
    } catch (error) {
      // Fallback method
      try {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const successful = document.execCommand("copy");
        textArea.remove();

        if (successful) {
          this.log(`${description} copied to clipboard (fallback method)`);
          return true;
        } else {
          throw new Error("execCommand('copy') returned false");
        }
      } catch (fallbackError) {
        this.error(
          `Failed to copy to clipboard: ${error.message} (fallback: ${fallbackError.message})`
        );
        return false;
      }
    }
  }

  /**
   * Show success notification
   * @param {string} message - Message to display
   */
  showSuccess(message) {
    if (window.$app?.playNoty) {
      window.$app.playNoty({ message, type: "success" });
    } else {
      // Fallback when VRCX notification system not available
      console.log(`✓ ${message}`); // eslint-disable-line no-console
    }
  }

  /**
   * Show error notification
   * @param {string} message - Message to display
   */
  showError(message) {
    if (window.$app?.playNoty) {
      window.$app.playNoty({ message, type: "error" });
    } else {
      // Fallback when VRCX notification system not available
      console.error(`✗ ${message}`); // eslint-disable-line no-console
    }
  }

  /**
   * Show info notification
   * @param {string} message - Message to display
   */
  showInfo(message) {
    if (window.$app?.playNoty) {
      window.$app.playNoty({ message, type: "info" });
    } else {
      // Fallback when VRCX notification system not available
      console.log(`ℹ ${message}`); // eslint-disable-line no-console
    }
  }

  /**
   * Clear processed menus registry
   * Used by context menu API to track processed menu items
   */
  clearProcessedMenus() {
    this.processedMenus.clear();
    this.log("Cleared processed menus registry");
  }
}

// Export plugin class for PluginLoader
window.__LAST_PLUGIN_CLASS__ = UtilsPlugin;
