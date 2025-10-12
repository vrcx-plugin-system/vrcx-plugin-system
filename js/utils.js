// ============================================================================
// VRCX CUSTOM UTILS
// Utility functions for all plugins
// ============================================================================

(function () {
  "use strict";

  console.log("[CJS|Utils] Initializing VRCX Custom Utils...");

  // Initialize namespace
  if (!window.customjs) {
    window.customjs = {};
  }

  if (!window.customjs.utils) {
    window.customjs.utils = {};
  }

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  /**
   * Check if value is empty (null, undefined, or empty string)
   * @param {any} v - Value to check
   * @returns {boolean} True if empty
   */
  window.customjs.utils.isEmpty = function (v) {
    return v === null || v === undefined || v === "";
  };

  /**
   * Convert milliseconds to human-readable text
   * @param {number} ms - Milliseconds
   * @returns {string} Human-readable time (e.g., "2d 3h")
   */
  window.customjs.utils.timeToText = function (ms) {
    if (!ms || ms < 0) return "0s";

    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  /**
   * Get current timestamp as localized string
   * @param {Date} now - Optional date object (defaults to now)
   * @returns {string} Localized timestamp
   */
  window.customjs.utils.getTimestamp = function (now = null) {
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
  };

  /**
   * Format date/time as YYYY-MM-DD HH:MM:SS GMT+1
   * @param {Date} now - Optional date object (defaults to now)
   * @returns {string} Formatted date/time
   */
  window.customjs.utils.formatDateTime = function (now = null) {
    now = now ?? new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds} GMT+1`;
  };

  /**
   * Copy text to clipboard with fallback
   * @param {string} text - Text to copy
   * @param {string} description - Description for logging
   * @returns {Promise<boolean>} True if successful
   */
  window.customjs.utils.copyToClipboard = async function (
    text,
    description = "Text"
  ) {
    try {
      // Try modern clipboard API
      await navigator.clipboard.writeText(text);
      console.log(`[CJS|Utils] ${description} copied to clipboard`);
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
          console.log(
            `[CJS|Utils] ${description} copied to clipboard (fallback method)`
          );
          return true;
        } else {
          throw new Error("execCommand('copy') returned false");
        }
      } catch (fallbackError) {
        console.error(
          `[CJS|Utils] Failed to copy to clipboard: ${error.message} (fallback: ${fallbackError.message})`
        );
        return false;
      }
    }
  };

  console.log("[CJS|Utils] ✓ VRCX Custom Utils initialized");
})();
