// ============================================================================
// MANAGERS PLUGIN
// Version: 2.0.0
// Build: 1728668400
// ============================================================================

/**
 * Managers Plugin
 * Collection of manager utilities: instance monitoring, notifications, debug tools
 */
class ManagersPlugin extends Plugin {
  constructor() {
    super({
      id: "managers",
      name: "Managers",
      description:
        "Management classes for instance monitoring, notifications, and debug tools",
      author: "Bluscream",
      version: "2.0.0",
      build: "1728668400",
      dependencies: [
        "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/Plugin.js",
        "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/plugins/api-helpers.js",
        "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/plugins/utils.js",
      ],
    });

    // Sub-manager instances
    this.instanceMonitor = null;
    this.notificationHandler = null;
    this.debugTools = null;
  }

  async load() {
    // Expose to global namespace
    window.customjs.managers = this;

    this.log("Managers plugin ready");
    this.loaded = true;
  }

  async start() {
    // Initialize sub-managers
    this.instanceMonitor = new InstanceMonitor(this);
    this.notificationHandler = new NotificationHandler(this);
    this.debugTools = new DebugTools(this);

    // Expose sub-managers globally
    window.customjs.instanceMonitor = this.instanceMonitor;
    window.customjs.notificationHandler = this.notificationHandler;
    window.customjs.debugTools = this.debugTools;

    // Legacy support
    window.InstanceMonitor = InstanceMonitor;
    window.NotificationHandler = NotificationHandler;
    window.DebugTools = DebugTools;

    this.enabled = true;
    this.started = true;
    this.log("Managers plugin started, all sub-managers initialized");
  }

  async stop() {
    this.log("Stopping Managers plugin");

    // Cleanup sub-managers
    this.instanceMonitor = null;
    this.notificationHandler = null;
    this.debugTools = null;

    await super.stop();
  }
}

// ============================================================================
// INSTANCE MONITOR
// ============================================================================

class InstanceMonitor {
  constructor(parentPlugin) {
    this.parentPlugin = parentPlugin;
    this.lastInvisiblePlayers = 0;
    this.setupInstanceOverride();
  }

  setupInstanceOverride() {
    if (!window.request?.instanceRequest?.getInstance) {
      console.warn("[InstanceMonitor] getInstance not available yet");
      return;
    }

    // Use hook system to intercept getInstance
    const originalGetInstance = window.request.instanceRequest.getInstance;

    window.request.instanceRequest.getInstance = (params) => {
      return originalGetInstance(params).then((args) => {
        const users = args.json.userCount;
        const realUsers = args.json.n_users - args.json.queueSize;
        args.json.invisiblePlayers = realUsers - users;

        if (args.json.invisiblePlayers > 0) {
          args.json.displayName = `${
            args.json.displayName ?? args.json.name
          } (${args.json.invisiblePlayers} invisible)`;

          setTimeout(async () => {
            window.customjs?.logger?.log(
              `Found ${args.json.invisiblePlayers} potentially invisible players in instance "${args.json.instanceId}" in world "${args.json.worldName}"`,
              { console: true, vrcx: { notify: true } },
              "warning"
            );
          }, 1000);
        }

        return args;
      });
    };

    console.log("[InstanceMonitor] Instance override setup complete");
  }
}

// ============================================================================
// NOTIFICATION HANDLER
// ============================================================================

class NotificationHandler {
  constructor(parentPlugin) {
    this.parentPlugin = parentPlugin;

    // Try to setup, retry if not available
    if (!this.setupNotificationOverride()) {
      setTimeout(() => {
        if (!this.setupNotificationOverride()) {
          console.warn(
            "[NotificationHandler] Notification store still not available"
          );
        }
      }, 2000);
    }
  }

  setupNotificationOverride() {
    const notificationStore = window.$pinia?.notification;
    if (!notificationStore || !notificationStore.playNoty) {
      return false;
    }

    const originalPlayNoty = notificationStore.playNoty.bind(notificationStore);

    notificationStore.playNoty = (json) => {
      // Call original first
      setTimeout(() => {
        originalPlayNoty(json);
      }, 0);

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

      switch (noty.type) {
        case "OnPlayerJoined":
          this.handleTaggedPlayerJoined(noty);
          break;

        case "BlockedOnPlayerJoined":
          if (window.customjs?.autoInviteManager?.lastJoined && window.$app) {
            const p = window.$app.parseLocation(
              window.customjs.autoInviteManager.lastJoined
            );
            window.$app.newInstanceSelfInvite(p.worldId);
          }
          break;

        case "GameStarted":
          // Trigger registry overrides when game starts
          if (window.customjs?.registryOverrides) {
            window.customjs.registryOverrides.triggerEvent("GAME_START");
          }
          break;

        case "invite":
          // Log invite notifications
          console.log("[NotificationHandler] Invite received:", noty);
          break;
      }
    };

    console.log("[NotificationHandler] Notification override setup complete");
    return true;
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
        window.customjs?.logger?.log(
          message,
          { console: true, desktop: true, xsoverlay: true },
          "info"
        );
      }
    } catch (error) {
      console.error(
        "[NotificationHandler] Error handling tagged player:",
        error
      );
    }
  }
}

// ============================================================================
// DEBUG TOOLS
// ============================================================================

class DebugTools {
  constructor(parentPlugin) {
    this.parentPlugin = parentPlugin;
    this.setupIPCLogging();
    this.setupConsoleFunctions();
  }

  setupIPCLogging() {
    // Initialize backups if not already done
    if (window.customjs?.apiHelpers?.initBackups) {
      window.customjs.apiHelpers.initBackups();
    }

    // Hook into SendIpc for debugging
    if (
      window.AppApi?.SendIpc &&
      window.customjs?.functions &&
      !window.customjs.functions["AppApi.SendIpc"]
    ) {
      // Use the hook system
      const originalSendIpc = window.AppApi.SendIpc;
      window.customjs.functions["AppApi.SendIpc"] = originalSendIpc;

      window.AppApi.SendIpc = (...args) => {
        console.log(`[IPC OUT]`, args);
        return originalSendIpc.apply(window.AppApi, args);
      };

      console.log("[DebugTools] IPC logging enabled");
    }
  }

  setupConsoleFunctions() {
    // Add useful console functions for debugging
    const debugFunctions = {
      getCurrentUser: () => window.$pinia?.user?.currentUser,
      getCurrentLocation: () => window.$app?.lastLocation,
      getFriends: () => window.$pinia?.user?.currentUser?.friends,
      getCustomTags: () => window.$pinia?.user?.customUserTags,
      getUserTag: (userId) => window.customjs?.tagManager?.getUserTag(userId),
      clearProcessedMenus: () => window.customjs?.utils?.clearProcessedMenus(),
      triggerRegistryEvent: (event) =>
        window.customjs?.registryOverrides?.triggerEvent(event),
      refreshTags: () => window.customjs?.tagManager?.refreshTags(),
      getLoadedTagsCount: () =>
        window.customjs?.tagManager?.getLoadedTagsCount(),
      getActiveTagsCount: () =>
        window.customjs?.tagManager?.getActiveTagsCount(),
      getStores: () => window.$pinia,
      listPlugins: () => window.customjs?.plugins,
      getPlugin: (id) =>
        window.customjs?.plugins?.find((p) => p.metadata.id === id),
    };

    // Expose debug functions
    window.customjs.debugFunctions = debugFunctions;
    window.debugVRCX = debugFunctions; // Legacy

    console.log("[DebugTools] Console debug functions registered");
  }
}

// Export plugin class for PluginLoader
window.__LAST_PLUGIN_CLASS__ = ManagersPlugin;
