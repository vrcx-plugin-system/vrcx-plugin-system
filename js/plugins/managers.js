// ============================================================================
// MANAGERS PLUGIN
// Version: 3.0.0
// Build: 1728668400
// ============================================================================

/**
 * Managers Plugin
 * Collection of manager utilities: instance monitoring, notifications, debug tools
 * NOW USING PROPER HOOK SYSTEM - No direct function overrides!
 */
class ManagersPlugin extends Plugin {
  constructor() {
    super({
      name: "Managers",
      description:
        "Management classes for instance monitoring, notifications, and debug tools",
      author: "Bluscream",
      version: "3.0.0",
      build: "1728668400",
      dependencies: [
        "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/Plugin.js",
        "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/plugins/api-helpers.js",
        "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/plugins/utils.js",
      ],
    });

    this.lastInvisiblePlayers = 0;
  }

  async load() {
    this.log("Managers plugin ready");
    this.loaded = true;
  }

  async start() {
    // Setup hooks for instance monitoring
    this.setupInstanceMonitoring();

    // Setup hooks for notification handling
    this.setupNotificationHandling();

    // Setup debug tools
    this.setupDebugTools();

    this.enabled = true;
    this.started = true;
    this.log("Managers plugin started, all hooks registered");
  }

  async onLogin(user) {
    // No login-specific logic needed for managers plugin
  }

  async stop() {
    this.log("Stopping Managers plugin");
    await super.stop();
  }

  // ============================================================================
  // INSTANCE MONITORING (Using Hooks)
  // ============================================================================

  setupInstanceMonitoring() {
    // Use POST-HOOK to process getInstance results
    // Hook system will automatically wait for the function to exist
    this.registerPostHook(
      "request.instanceRequest.getInstance",
      (result, args) => {
        // result is a Promise, add .then() to process when it resolves
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

              const apiHelpers =
                window.customjs.pluginManager.getPlugin("api-helpers");
              if (apiHelpers?.logger) {
                apiHelpers.logger.log(
                  `Found ${invisiblePlayers} potentially invisible players in instance "${instanceArgs.json.instanceId}" in world "${instanceArgs.json.worldName}"`,
                  { console: true, vrcx: { notify: true } },
                  "warning"
                );
              }
            }
          });
        }
      }
    );

    this.log(
      "Instance monitoring hook registered (will activate when function available)"
    );
  }

  // ============================================================================
  // NOTIFICATION HANDLING (Using Hooks)
  // ============================================================================

  setupNotificationHandling() {
    // Use POST-HOOK to process notifications
    // Hook system will automatically wait for the function to exist
    this.registerPostHook("$pinia.notification.playNoty", (result, args) => {
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
      if (diff > 10000) return;

      this.handleNotification(noty);
    });

    this.log(
      "Notification hook registered (will activate when function available)"
    );
  }

  handleNotification(noty) {
    switch (noty.type) {
      case "OnPlayerJoined":
        this.handleTaggedPlayerJoined(noty);
        break;

      case "BlockedOnPlayerJoined":
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
        break;

      case "invite":
        this.log("Invite notification received:", noty);
        break;
    }
  }

  handleTaggedPlayerJoined(noty) {
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
        const apiHelpers =
          window.customjs.pluginManager.getPlugin("api-helpers");
        if (apiHelpers?.logger) {
          apiHelpers.logger.log(
            message,
            { console: true, desktop: true, xsoverlay: true },
            "info"
          );
        }
      }
    } catch (error) {
      this.error("Error handling tagged player join:", error);
    }
  }

  // ============================================================================
  // DEBUG TOOLS (Using Hooks)
  // ============================================================================

  setupDebugTools() {
    // Setup IPC logging hook
    this.setupIPCLogging();

    // Setup console debug functions
    this.setupConsoleFunctions();

    this.log("Debug tools initialized");
  }

  setupIPCLogging() {
    // Use PRE-HOOK to log IPC calls
    // Hook system will automatically wait for the function to exist
    this.registerPreHook("AppApi.SendIpc", (args) => {
      console.log(`[IPC OUT]`, args); // eslint-disable-line no-console - Intentional debug output for IPC monitoring
    });

    this.log(
      "IPC logging hook registered (will activate when function available)"
    );
  }

  setupConsoleFunctions() {
    // Add useful console functions for debugging
    const debugFunctions = {
      getCurrentUser: () => window.$pinia?.user?.currentUser,
      getCurrentLocation: () => window.$app?.lastLocation,
      getFriends: () => window.$pinia?.user?.currentUser?.friends,
      getCustomTags: () => window.$pinia?.user?.customUserTags,
      getUserTag: (userId) =>
        window.customjs.pluginManager
          .getPlugin("tag-manager")
          ?.getUserTag(userId),
      clearProcessedMenus: () =>
        window.customjs.pluginManager
          .getPlugin("context-menu-api")
          ?.clearProcessedMenus(),
      triggerRegistryEvent: (event) =>
        window.customjs.pluginManager
          .getPlugin("registry-overrides")
          ?.triggerEvent(event),
      refreshTags: () =>
        window.customjs.pluginManager.getPlugin("tag-manager")?.refreshTags(),
      getLoadedTagsCount: () =>
        window.customjs.pluginManager
          .getPlugin("tag-manager")
          ?.getLoadedTagsCount(),
      getActiveTagsCount: () =>
        window.customjs.pluginManager
          .getPlugin("tag-manager")
          ?.getActiveTagsCount(),
      getStores: () => window.$pinia,
      listPlugins: () => window.customjs?.plugins,
      getPlugin: (id) =>
        window.customjs?.plugins?.find((p) => p.metadata.id === id),
      getPluginManager: () => window.customjs?.pluginManager,
      getPluginList: () => window.customjs?.pluginManager?.getPluginList(),
      // New helper functions for the refactored system
      inspectPlugin: (id) => {
        // Open devtools for debugging
        if (window.AppApi?.ShowDevTools) {
          window.AppApi.ShowDevTools();
        }

        const plugin = window.customjs?.plugins?.find(
          (p) => p.metadata.id === id
        );
        if (plugin) {
          // Intentional console output for debug inspection
          console.group(`Plugin: ${plugin.metadata.name}`); // eslint-disable-line no-console
          console.log("Metadata:"); // eslint-disable-line no-console
          console.dir(plugin.metadata); // eslint-disable-line no-console
          console.table({
            // eslint-disable-line no-console
            enabled: plugin.enabled,
            loaded: plugin.loaded,
            started: plugin.started,
          });
          console.log("Resources:"); // eslint-disable-line no-console
          console.dir(plugin.resources); // eslint-disable-line no-console
          console.groupEnd(); // eslint-disable-line no-console
        } else {
          console.warn(`Plugin not found: ${id}`); // eslint-disable-line no-console
        }
        return plugin;
      },
      listEvents: () => {
        // Open devtools for debugging
        if (window.AppApi?.ShowDevTools) {
          window.AppApi.ShowDevTools();
        }

        const events = window.customjs?.events || {};
        // Intentional console output for debug listing
        console.group("Custom Events"); // eslint-disable-line no-console
        Object.keys(events).forEach((eventName) => {
          console.log(`${eventName}: ${events[eventName].length} listeners`); // eslint-disable-line no-console
        });
        console.groupEnd(); // eslint-disable-line no-console
        return events;
      },
      listHooks: () => {
        // Open devtools for debugging
        if (window.AppApi?.ShowDevTools) {
          window.AppApi.ShowDevTools();
        }

        // Intentional console output for debug listing
        console.group("Registered Hooks"); // eslint-disable-line no-console
        console.log("Pre-hooks:"); // eslint-disable-line no-console
        console.dir(Object.keys(window.customjs?.hooks?.pre || {})); // eslint-disable-line no-console
        console.log("Post-hooks:"); // eslint-disable-line no-console
        console.dir(Object.keys(window.customjs?.hooks?.post || {})); // eslint-disable-line no-console
        console.groupEnd(); // eslint-disable-line no-console
        return window.customjs?.hooks;
      },
    };

    // Expose debug functions globally
    window.customjs.debugFunctions = debugFunctions;

    this.log(
      "Console debug functions registered (will open DevTools when used)"
    );
  }
}

// Export plugin class for PluginManager
window.__LAST_PLUGIN_CLASS__ = ManagersPlugin;
