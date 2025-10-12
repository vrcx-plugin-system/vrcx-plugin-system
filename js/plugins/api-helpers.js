// ============================================================================
// API HELPERS PLUGIN
// Version: 4.0.0
// Build: 1744630000
// ============================================================================

class ApiHelpersPlugin extends Plugin {
  constructor() {
    super({
      name: "API Helpers Plugin",
      description: "API wrapper functions and location management for VRCX",
      author: "Bluscream",
      version: "4.0.0",
      build: "1744630000",
      dependencies: [
        "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/plugin.js",
        "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/plugins/utils.js",
      ],
    });
  }

  async load() {
    // Note: Functions are automatically backed up in customjs.functions by the hook system

    this.logger.log("API helpers ready");
    this.loaded = true;
  }

  async start() {
    this.enabled = true;
    this.started = true;
    this.logger.log("API helpers started");
  }

  async onLogin(user) {
    // No login-specific logic needed for API helpers plugin
  }

  // ============================================================================
  // API WRAPPER FUNCTIONS
  // ============================================================================

  API = {
    /**
     * Mark notification as seen
     * @param {object} params - Notification parameters
     * @param {boolean} emit - Whether to emit event
     * @returns {Promise} API response
     */
    seeNotification: function (params, emit = true) {
      return window.request
        .request(`auth/user/notifications/${params.notificationId}/see`, {
          method: "PUT",
        })
        .then((json) => {
          const args = { json, params };
          if (emit) window.request.request.$emit("NOTIFICATION:SEE", args);
          return args;
        });
    },

    /**
     * Hide notification
     * @param {object} params - Notification parameters
     * @param {boolean} emit - Whether to emit event
     * @returns {Promise} API response
     */
    hideNotification: function (params, emit = true) {
      return window.request.notificationRequest.hideNotification(params);
    },

    /**
     * Send invite to user
     * @param {object} params - Invite parameters
     * @param {string} receiverUserId - User ID to invite
     * @returns {Promise} API response
     */
    sendInvite: function (params, receiverUserId) {
      return window.request.notificationRequest.sendInvite(
        params,
        receiverUserId
      );
    },

    /**
     * Save current user data
     * @param {object} params - User parameters to save
     * @returns {Promise} API response
     */
    saveCurrentUser: function (params) {
      return window.request.userRequest.saveCurrentUser(params);
    },

    /**
     * Save bio and bio links
     * @param {string} bio - Bio text
     * @param {array} bioLinks - Bio links array
     * @returns {Promise} API response
     */
    saveBio: function (bio, bioLinks) {
      const currentUser = window.$pinia?.user?.currentUser;
      return this.saveCurrentUser({
        bio: bio ?? currentUser?.bio,
        bioLinks: bioLinks ?? currentUser?.bioLinks,
      });
    },
  };

  // ============================================================================
  // LOCATION & WORLD MANAGEMENT
  // ============================================================================

  LocationManager = {
    /**
     * Get location object from string or object
     * @param {string|object} loc - Location string or object
     * @returns {Promise<object>} Location object
     */
    getLocationObject: async function (loc) {
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

      // Fallback to last location if empty
      if (!loc && window.$app.lastLocation) {
        return this.getLocationObject(window.$app.lastLocation);
      }
      if (!loc && window.$app.lastLocationDestination) {
        return this.getLocationObject(window.$app.lastLocationDestination);
      }

      // Get world name
      if (loc && window.$app?.getWorldName) {
        loc.worldName = await window.$app.getWorldName(loc);
      }

      return loc;
    },
  };
}

// Export plugin class for PluginLoader
window.__LAST_PLUGIN_CLASS__ = ApiHelpersPlugin;
