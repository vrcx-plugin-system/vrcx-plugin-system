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

  if (!window.customjs.api) {
    window.customjs.api = {};
  }

  if (!window.customjs.api) {
    window.customjs.api = {};
  }

  // ============================================================================
  // API WRAPPER FUNCTIONS
  // ============================================================================

  /**
   * Mark notification as seen
   * @param {object} params - Notification parameters
   * @param {boolean} emit - Whether to emit event
   * @returns {Promise} API response
   */
  window.customjs.api.seeNotification = function (params, emit = true) {
    return window.request
      .request(`auth/user/notifications/${params.notificationId}/see`, {
        method: "PUT",
      })
      .then((json) => {
        const args = { json, params };
        if (emit) window.request.request.$emit("NOTIFICATION:SEE", args);
        return args;
      });
  };

  /**
   * Hide notification
   * @param {object} params - Notification parameters
   * @param {boolean} emit - Whether to emit event
   * @returns {Promise} API response
   */
  window.customjs.api.hideNotification = function (params, emit = true) {
    return window.request.notificationRequest.hideNotification(params);
  };

  /**
   * Send invite to user
   * @param {object} params - Invite parameters
   * @param {string} receiverUserId - User ID to invite
   * @returns {Promise} API response
   */
  window.customjs.api.sendInvite = function (params, receiverUserId) {
    return window.request.notificationRequest.sendInvite(
      params,
      receiverUserId
    );
  };

  /**
   * Send invite request to user (request to join them)
   * @param {object} params - Invite request parameters
   * @param {string} receiverUserId - User ID to request invite from
   * @returns {Promise} API response
   */
  window.customjs.api.sendInviteRequest = function (params, receiverUserId) {
    return window.request.notificationRequest.sendRequestInvite(
      params,
      receiverUserId
    );
  };

  /**
   * Get user by ID
   * @param {string} userId - User ID to fetch
   * @returns {Promise} API response with user data
   */
  window.customjs.api.getUser = function (userId) {
    return window.request.userRequest.getUser({ userId });
  };

  /**
   * Save current user data
   * @param {object} params - User parameters to save
   * @returns {Promise} API response
   */
  window.customjs.api.saveCurrentUser = function (params) {
    return window.request.userRequest.saveCurrentUser(params);
  };

  /**
   * Save bio and bio links
   * @param {string} bio - Bio text
   * @param {array} bioLinks - Bio links array
   * @returns {Promise} API response
   */
  window.customjs.api.saveBio = function (bio, bioLinks) {
    const currentUser = window.$pinia?.user?.currentUser;
    return window.customjs.api.saveCurrentUser({
      bio: bio ?? currentUser?.bio,
      bioLinks: bioLinks ?? currentUser?.bioLinks,
    });
  };

  // ============================================================================
  // LOCATION MANAGER
  // ============================================================================

  /**
   * Get location object from string or object
   * @param {string|object} loc - Location string or object
   * @returns {Promise<object>} Location object
   */
  window.customjs.api.getLocationObject = async function (loc) {
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
      return window.customjs.api.getLocationObject(window.$app.lastLocation);
    }
    if (!loc && window.$app.lastLocationDestination) {
      return window.customjs.api.getLocationObject(
        window.$app.lastLocationDestination
      );
    }

    // Get world name
    if (loc && window.$app?.getWorldName) {
      loc.worldName = await window.$app.getWorldName(loc);
    }

    return loc;
  };

  // ============================================================================
  // INSTANCE MONITORING
  // ============================================================================

  let lastInvisiblePlayers = 0;

  window.customjs.api.setupInstanceMonitoring = function () {
    // Wait for plugin manager to be available
    const waitForPluginManager = setInterval(() => {
      if (window.customjs?.pluginManager?.registerPostHook) {
        clearInterval(waitForPluginManager);

        // Use hook system to monitor getInstance calls
        window.customjs.pluginManager.registerPostHook(
          "request.instanceRequest.getInstance",
          (result, args) => {
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
                  if (window.customjs?.events?.invisiblePlayersDetected) {
                    window.customjs.api.invisiblePlayersDetected({
                      count: invisiblePlayers,
                      instanceId: instanceArgs.json.instanceId,
                      worldName: instanceArgs.json.worldName,
                    });
                  }
                }
              });
            }
          },
          { metadata: { name: "API Instance Monitor" } }
        );

        console.log("[CJS|API] Instance monitoring hook registered");
      }
    }, 100);

    // Clear interval after 10 seconds if not found
    setTimeout(() => clearInterval(waitForPluginManager), 10000);
  };

  // ============================================================================
  // NOTIFICATION HANDLING
  // ============================================================================

  window.customjs.api.setupNotificationHandling = function () {
    // Wait for plugin manager to be available
    const waitForPluginManager = setInterval(() => {
      if (window.customjs?.pluginManager?.registerPostHook) {
        clearInterval(waitForPluginManager);

        // Use hook system to monitor playNoty calls
        window.customjs.pluginManager.registerPostHook(
          "$pinia.notification.playNoty",
          (result, args) => {
            // Process notification
            const json = args[0];
            let noty = json;

            if (typeof json === "string") {
              try {
                noty = JSON.parse(json);
              } catch (e) {
                return;
              }
            }

            if (!noty) return;

            const now = new Date().getTime();
            const time = new Date(noty.created_at).getTime();
            const diff = now - time;

            // Only process recent notifications (within 10 seconds)
            if (diff <= 10000) {
              handleNotification(noty);
            }
          },
          { metadata: { name: "API Notification Handler" } }
        );

        console.log("[CJS|API] Notification handling hook registered");
      }
    }, 100);

    // Clear interval after 10 seconds if not found
    setTimeout(() => clearInterval(waitForPluginManager), 10000);
  };

  function handleNotification(noty) {
    switch (noty.type) {
      case "OnPlayerJoined":
        handleTaggedPlayerJoined(noty);
        break;

      case "BlockedOnPlayerJoined":
        // Emit event for plugins to listen to
        if (window.customjs?.events?.blockedPlayerJoined) {
          window.customjs.api.blockedPlayerJoined(noty);
        }
        // Note: Self-invite logic moved to selfinvite-onblockedplayer.js plugin
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
        if (window.customjs?.events?.gameStarted) {
          window.customjs.api.gameStarted(noty);
        }
        break;

      case "invite":
        console.log("[CJS|API] Invite notification received:", noty);

        // Emit event
        if (window.customjs?.events?.inviteReceived) {
          window.customjs.api.inviteReceived(noty);
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
        if (window.customjs?.events?.taggedPlayerJoined) {
          window.customjs.api.taggedPlayerJoined({
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
  window.customjs.api.invisiblePlayersDetected = null;

  /**
   * Called when a blocked player joined notification is received
   * @param {object} noty - Notification object
   */
  window.customjs.api.blockedPlayerJoined = null;

  /**
   * Called when game started notification is received
   * @param {object} noty - Notification object
   */
  window.customjs.api.gameStarted = null;

  /**
   * Called when an invite notification is received
   * @param {object} noty - Notification object
   */
  window.customjs.api.inviteReceived = null;

  /**
   * Called when a tagged player joins
   * @param {object} data - {playerId, playerName, playerTag}
   */
  window.customjs.api.taggedPlayerJoined = null;

  // ============================================================================
  // AUTO-INITIALIZATION
  // ============================================================================

  // Wait a bit for VRCX to initialize, then setup monitoring
  setTimeout(() => {
    window.customjs.api.setupInstanceMonitoring();
    window.customjs.api.setupNotificationHandling();
  }, 2000);

  console.log("[CJS|API] ✓ VRCX Custom API initialized");
})();
