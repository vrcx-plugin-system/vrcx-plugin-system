// ============================================================================
// VRCX CUSTOM API
// Provides API wrapper functions and managers for all plugins
// ============================================================================

(function () {
  "use strict";

  console.log("[CJS|API] Initializing VRCX Custom API...");

  // Initialize API namespace
  if (!window.customjs) {
    window.customjs = {};
  }

  if (!window.customjs.functions) {
    window.customjs.functions = {};
  }

  if (!window.customjs.events) {
    window.customjs.events = {};
  }

  // ============================================================================
  // API WRAPPER FUNCTIONS
  // ============================================================================

  window.customjs.functions.API = {
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
     * Send invite request to user (request to join them)
     * @param {object} params - Invite request parameters
     * @param {string} receiverUserId - User ID to request invite from
     * @returns {Promise} API response
     */
    sendInviteRequest: function (params, receiverUserId) {
      return window.request.notificationRequest.sendRequestInvite(
        params,
        receiverUserId
      );
    },

    /**
     * Get user by ID
     * @param {string} userId - User ID to fetch
     * @returns {Promise} API response with user data
     */
    getUser: function (userId) {
      return window.request.userRequest.getUser({ userId });
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
  // LOCATION MANAGER
  // ============================================================================

  window.customjs.functions.LocationManager = {
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

  // ============================================================================
  // INSTANCE MONITORING
  // ============================================================================

  let lastInvisiblePlayers = 0;

  window.customjs.functions.setupInstanceMonitoring = function () {
    // Wait for request.instanceRequest.getInstance to be available
    const waitForGetInstance = setInterval(() => {
      if (window.request?.instanceRequest?.getInstance) {
        clearInterval(waitForGetInstance);

        // Store original function
        const originalGetInstance =
          window.request.instanceRequest.getInstance.bind(
            window.request.instanceRequest
          );
        window.customjs.functions._originalGetInstance = originalGetInstance;

        // Wrap function
        window.request.instanceRequest.getInstance = function (...args) {
          const result = originalGetInstance(...args);

          // Process result when promise resolves
          if (result && typeof result.then === "function") {
            result.then((instanceArgs) => {
              const users = instanceArgs.json.userCount;
              const realUsers =
                instanceArgs.json.n_users - instanceArgs.json.queueSize;
              const invisiblePlayers = realUsers - users;

              if (invisiblePlayers > 0) {
                instanceArgs.json.invisiblePlayers = invisiblePlayers;
                instanceArgs.json.displayName = `${
                  instanceArgs.json.displayName ?? instanceArgs.json.name
                } (${invisiblePlayers} invisible)`;

                console.warn(
                  `[CJS|API] Found ${invisiblePlayers} potentially invisible players in instance "${instanceArgs.json.instanceId}" in world "${instanceArgs.json.worldName}"`
                );

                // Show notification
                if (window.$app?.playNoty) {
                  window.$app.playNoty({
                    text: `Found <strong>${invisiblePlayers}</strong> potentially invisible players`,
                    type: "warning",
                  });
                }

                // Emit event
                if (window.customjs?.events?.onInvisiblePlayersDetected) {
                  window.customjs.events.onInvisiblePlayersDetected({
                    count: invisiblePlayers,
                    instanceId: instanceArgs.json.instanceId,
                    worldName: instanceArgs.json.worldName,
                  });
                }
              }
            });
          }

          return result;
        };

        console.log("[CJS|API] Instance monitoring active");
      }
    }, 100);

    // Clear interval after 10 seconds if not found
    setTimeout(() => clearInterval(waitForGetInstance), 10000);
  };

  // ============================================================================
  // NOTIFICATION HANDLING
  // ============================================================================

  window.customjs.functions.setupNotificationHandling = function () {
    // Wait for $pinia.notification.playNoty to be available
    const waitForPlayNoty = setInterval(() => {
      if (window.$pinia?.notification?.playNoty) {
        clearInterval(waitForPlayNoty);

        // Store original function
        const originalPlayNoty =
          window.$pinia.notification.playNoty.bind(window.$pinia.notification);
        window.customjs.functions._originalPlayNoty = originalPlayNoty;

        // Wrap function
        window.$pinia.notification.playNoty = function (...args) {
          const result = originalPlayNoty(...args);

          // Process notification
          const json = args[0];
          let noty = json;

          if (typeof json === "string") {
            try {
              noty = JSON.parse(json);
            } catch (e) {
              return result;
            }
          }

          if (!noty) return result;

          const now = new Date().getTime();
          const time = new Date(noty.created_at).getTime();
          const diff = now - time;

          // Only process recent notifications (within 10 seconds)
          if (diff <= 10000) {
            handleNotification(noty);
          }

          return result;
        };

        console.log("[CJS|API] Notification handling active");
      }
    }, 100);

    // Clear interval after 10 seconds if not found
    setTimeout(() => clearInterval(waitForPlayNoty), 10000);
  };

  function handleNotification(noty) {
    switch (noty.type) {
      case "OnPlayerJoined":
        handleTaggedPlayerJoined(noty);
        break;

      case "BlockedOnPlayerJoined":
        // Emit event for auto-invite plugin
        if (window.customjs?.events?.onBlockedPlayerJoined) {
          window.customjs.events.onBlockedPlayerJoined(noty);
        }

        // Auto-invite fallback logic
        const autoInvite = window.customjs?.plugins?.find(
          (p) => p.metadata?.id === "auto-invite"
        );
        if (autoInvite?.lastJoined && window.$app) {
          const p = window.$app.parseLocation(autoInvite.lastJoined);
          window.$app.newInstanceSelfInvite(p.worldId);
        }
        break;

      case "GameStarted":
        // Trigger registry overrides when game starts
        const registryPlugin = window.customjs?.plugins?.find(
          (p) => p.metadata?.id === "registry-overrides"
        );
        if (registryPlugin?.triggerEvent) {
          registryPlugin.triggerEvent("GAME_START");
        }

        // Emit event
        if (window.customjs?.events?.onGameStarted) {
          window.customjs.events.onGameStarted(noty);
        }
        break;

      case "invite":
        console.log("[CJS|API] Invite notification received:", noty);

        // Emit event
        if (window.customjs?.events?.onInviteReceived) {
          window.customjs.events.onInviteReceived(noty);
        }
        break;
    }
  }

  function handleTaggedPlayerJoined(noty) {
    try {
      const playerId = noty.userId || noty.id;
      const playerName = noty.displayName || noty.name || "Unknown Player";

      if (!playerId) return;

      // Check if the player has custom tags
      const customTags = window.$pinia?.user?.customUserTags;
      if (!customTags || customTags.size === 0) return;

      const playerTag = customTags.get(playerId);

      if (playerTag) {
        const message = `${playerName} joined (${playerTag.tag})`;
        console.log(`[CJS|API] ${message}`);

        // Show desktop notification
        if (window.$app?.playNoty) {
          window.$app.playNoty({
            text: message,
            type: "info",
          });
        }

        // Emit event
        if (window.customjs?.events?.onTaggedPlayerJoined) {
          window.customjs.events.onTaggedPlayerJoined({
            playerId,
            playerName,
            playerTag,
          });
        }
      }
    } catch (error) {
      console.error("[CJS|API] Error handling tagged player join:", error);
    }
  }

  // ============================================================================
  // EVENT HANDLERS (for plugins to override/listen to)
  // ============================================================================

  /**
   * Called when invisible players are detected in an instance
   * @param {object} data - {count, instanceId, worldName}
   */
  window.customjs.events.onInvisiblePlayersDetected = null;

  /**
   * Called when a blocked player joined notification is received
   * @param {object} noty - Notification object
   */
  window.customjs.events.onBlockedPlayerJoined = null;

  /**
   * Called when game started notification is received
   * @param {object} noty - Notification object
   */
  window.customjs.events.onGameStarted = null;

  /**
   * Called when an invite notification is received
   * @param {object} noty - Notification object
   */
  window.customjs.events.onInviteReceived = null;

  /**
   * Called when a tagged player joins
   * @param {object} data - {playerId, playerName, playerTag}
   */
  window.customjs.events.onTaggedPlayerJoined = null;

  // ============================================================================
  // AUTO-INITIALIZATION
  // ============================================================================

  // Wait a bit for VRCX to initialize, then setup monitoring
  setTimeout(() => {
    window.customjs.functions.setupInstanceMonitoring();
    window.customjs.functions.setupNotificationHandling();
  }, 2000);

  console.log("[CJS|API] ✓ VRCX Custom API initialized");
})();
