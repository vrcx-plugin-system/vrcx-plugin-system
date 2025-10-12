// ============================================================================
// VRCX CUSTOM UTILS
// Utility functions for all plugins
// ============================================================================

(function () {
  "use strict";

  // ============================================================================
  // UTILS CORE MODULE
  // ============================================================================

  /**
   * UtilsModule - Core module that provides utility functions
   */
  class UtilsModule extends CoreModule {
    constructor() {
      super({
        id: "utils",
        name: "Utils",
        description: "Utility functions for VRCX Custom",
        author: "Bluscream",
        version: "2.0.0",
        build: "1760486400",
      });
    }

    async load() {
      this.log("Loading Utils module...");

      // Initialize namespace
      if (!window.customjs) {
        window.customjs = {};
      }

      if (!window.customjs.utils) {
        window.customjs.utils = {};
      }

      // Register all utility functions
      window.customjs.utils.isEmpty = function (v) {
        return v === null || v === undefined || v === "";
      };

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

      window.customjs.utils.getTimestamp = function (now = null) {
        now = now ?? new Date();
        return now.toLocaleString("en-US", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        });
      };

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

      window.customjs.utils.copyToClipboard = async function (
        text,
        description = "Text"
      ) {
        try {
          await navigator.clipboard.writeText(text);
          console.log(`[CJS|Utils] ${description} copied to clipboard`);
          return true;
        } catch (error) {
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
                `[CJS|Utils] ${description} copied to clipboard (fallback)`
              );
              return true;
            } else {
              throw new Error("execCommand('copy') returned false");
            }
          } catch (fallbackError) {
            console.error(
              `[CJS|Utils] Failed to copy to clipboard: ${error.message}`
            );
            return false;
          }
        }
      };

      window.customjs.utils.saveBio = function (bio, bioLinks) {
        const currentUser = window.$pinia?.user?.currentUser;
        return window.request.userRequest.saveCurrentUser({
          bio: bio ?? currentUser?.bio,
          bioLinks: bioLinks ?? currentUser?.bioLinks,
        });
      };

      window.customjs.utils.getLocationObject = async function (loc) {
        if (typeof loc === "string") {
          if (loc.endsWith(")")) {
            loc = window.$app.parseLocation(loc);
          } else if (loc.startsWith("wrld")) {
            loc = { worldId: loc, world: { id: loc } };
          } else {
            loc = { instanceId: loc, instance: { id: loc } };
          }
        } else if (!loc || loc === "traveling:traveling") {
          return;
        }

        if (!loc && window.$app.lastLocation) {
          return window.customjs.utils.getLocationObject(
            window.$app.lastLocation
          );
        }
        if (!loc && window.$app.lastLocationDestination) {
          return window.customjs.utils.getLocationObject(
            window.$app.lastLocationDestination
          );
        }

        if (loc && window.$app?.getWorldName) {
          loc.worldName = await window.$app.getWorldName(loc);
        }

        return loc;
      };

      this.loaded = true;
      this.log("✓ Utils module loaded");
    }

    async start() {
      this.log("Starting Utils module...");
      this.started = true;
      this.log("✓ Utils module started");
    }
  }

  // Auto-instantiate the core module
  if (typeof window !== "undefined") {
    new UtilsModule();
  }
})();
