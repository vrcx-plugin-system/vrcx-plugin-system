// ============================================================================
// API HELPERS PLUGIN
// Version: 2.0.0
// Build: 1728668400
// ============================================================================

class ApiHelpersPlugin extends Plugin {
  constructor() {
    super({
      id: "api-helpers",
      name: "API Helpers Plugin",
      description:
        "API wrapper functions, logging, and location management for VRCX",
      author: "Bluscream",
      version: "2.0.0",
      build: "1728668400",
      dependencies: [
        "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/Plugin.js",
        "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/plugins/utils.js",
      ],
    });

    // Backup original functions
    this.bak = {
      initialized: false,
    };
  }

  async load() {
    // Initialize backups
    this.initBackups();

    // Expose API methods globally
    window.customjs.api = this.API;
    window.customjs.logger = this.Logger;
    window.customjs.location = this.LocationManager;
    window.customjs.apiHelpers = this;

    // Legacy support
    window.bak = this.bak;
    window.API = this.API;
    window.Logger = this.Logger;
    window.LocationManager = this.LocationManager;

    this.log("API helpers ready");
    this.loaded = true;
  }

  async start() {
    // Retry backup initialization if it failed earlier
    if (!this.bak.initialized) {
      this.initBackups();
    }

    this.enabled = true;
    this.started = true;
    this.log("API helpers started");
  }

  // ============================================================================
  // BACKUP INITIALIZATION
  // ============================================================================

  /**
   * Initialize backup references to original functions
   */
  initBackups() {
    if (this.bak.initialized) return true;

    // Store references to original functions before any overrides
    if (window.$pinia && window.request && window.AppApi) {
      this.bak = {
        initialized: true,
        updateCurrentUserLocation: window.$app?.updateCurrentUserLocation,
        setCurrentUserLocation: window.$app?.setCurrentUserLocation,
        applyWorldDialogInstances: window.$app?.applyWorldDialogInstances,
        applyGroupDialogInstances: window.$app?.applyGroupDialogInstances,
        playNoty: window.$app?.playNoty,
        getInstance: window.request?.instanceRequest?.getInstance,
        SendIpc: window.AppApi.SendIpc.bind(window.AppApi),
      };
      this.log("✓ Function backups initialized");
      return true;
    }

    this.warn("⚠ Some APIs not available yet for backup");
    return false;
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
  // LOGGING & NOTIFICATIONS
  // ============================================================================

  Logger = {
    // Default options object with all logging methods enabled
    defaultOptions: {
      console: true,
      vrcx: {
        notify: true,
        message: true,
      },
      event: {
        noty: true,
        external: true,
      },
      desktop: true,
      xsoverlay: true,
      ovrtoolkit: true,
      webhook: true,
    },

    /**
     * Log message to various outputs
     * @param {string} msg - Message to log
     * @param {object} options - Logging options (which outputs to use)
     * @param {string} level - Log level (info, warn, error)
     */
    log: function (msg, options = {}, level = "info") {
      // Merge with default options, assuming false for missing properties
      const opts = {
        console: options.console ?? false,
        vrcx: {
          notify: options.vrcx?.notify ?? false,
          message: options.vrcx?.message ?? false,
        },
        event: {
          noty: options.event?.noty ?? false,
          external: options.event?.external ?? false,
        },
        desktop: options.desktop ?? false,
        xsoverlay: options.xsoverlay ?? false,
        ovrtoolkit: options.ovrtoolkit ?? false,
        webhook: options.webhook ?? false,
      };

      // Add timestamp to longer messages
      const timestamp = new Date().toISOString();
      const timestampedMsg = msg.length > 50 ? `[${timestamp}] ${msg}` : msg;

      // Console logging
      if (opts.console) {
        if (typeof console[level] === "function") {
          console[level](timestampedMsg);
        } else {
          console.log(timestampedMsg);
        }
      }

      // VRCX event logging via IPC
      if (opts.event.noty && window.AppApi?.SendIpc) {
        try {
          window.AppApi.SendIpc("Noty", timestampedMsg);
        } catch (error) {
          console.warn("Failed to send Noty event:", error);
        }
      }

      if (
        opts.event.external &&
        window.$pinia?.user &&
        window.AppApi?.SendIpc
      ) {
        try {
          const userId = window.$pinia.user.currentUser?.id || "";
          window.AppApi.SendIpc("External", `${userId}:${timestampedMsg}`);
        } catch (error) {
          console.warn("Failed to send External event:", error);
        }
      }

      // Desktop notifications
      if (opts.desktop && window.AppApi?.DesktopNotification) {
        setTimeout(async () => {
          try {
            await window.AppApi.DesktopNotification(
              "VRCX Addon",
              timestampedMsg
            );
          } catch (error) {
            console.error("Error sending desktop notification:", error);
          }
        }, 0);
      }

      // XSOverlay notifications
      if (opts.xsoverlay && window.AppApi?.XSNotification) {
        setTimeout(async () => {
          try {
            await window.AppApi.XSNotification(
              "VRCX Addon",
              timestampedMsg,
              5000,
              1.0,
              ""
            );
          } catch (error) {
            console.error("Error sending XSOverlay notification:", error);
          }
        }, 0);
      }

      // OVRToolkit notifications
      if (opts.ovrtoolkit && window.AppApi?.OVRTNotification) {
        setTimeout(async () => {
          try {
            await window.AppApi.OVRTNotification(
              true,
              true,
              "VRCX Addon",
              timestampedMsg,
              5000,
              1.0,
              null
            );
          } catch (error) {
            console.error("Error sending OVRToolkit notification:", error);
          }
        }, 0);
      }

      // VRCX UI notifications
      if (opts.vrcx.notify && window.$app?.$notify) {
        try {
          const notifyMethod = window.$app.$notify[level];
          if (typeof notifyMethod === "function") {
            notifyMethod({
              title: "VRCX Addon",
              message: msg,
              type: level,
            });
          } else {
            window.$app.$notify.info({
              title: "VRCX Addon",
              message: msg,
              type: "info",
            });
          }
        } catch (error) {
          console.error("Error sending VRCX notify:", error);
        }
      }

      // VRCX message toasts
      if (opts.vrcx.message && window.$app?.$message) {
        try {
          const messageMethod = window.$app.$message[level];
          if (typeof messageMethod === "function") {
            messageMethod(msg);
          } else {
            window.$app.$message.info(msg);
          }
        } catch (error) {
          console.error("Error sending VRCX message:", error);
        }
      }

      // Webhook notifications
      if (opts.webhook) {
        setTimeout(async () => {
          try {
            const webhookUrl = window.customjs?.config?.webhook;
            if (webhookUrl) {
              const payload = {
                message: msg,
                level: level,
                timestamp: timestamp,
                source: "VRCX-Addon",
              };

              await fetch(webhookUrl, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
              });
            }
          } catch (error) {
            console.error("Error sending webhook notification:", error);
          }
        }, 0);
      }
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
