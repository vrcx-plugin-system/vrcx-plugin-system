class ManagersPlugin extends Plugin {
  constructor() {
    super({
      name: "Managers",
      description: "Instance monitoring and notification handling",
      author: "Bluscream",
      version: "3.2.0",
      build: "1760386122",
      dependencies: [
        "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/plugin.js",
        "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/plugins/api-helpers.js",
        "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/plugins/utils.js",
      ],
    });

    this.lastInvisiblePlayers = 0;
  }

  async load() {
    this.logger.log("Managers plugin ready");
    this.loaded = true;
  }

  async start() {
    // Setup hooks for instance monitoring
    this.setupInstanceMonitoring();

    // Setup hooks for notification handling
    this.setupNotificationHandling();

    this.enabled = true;
    this.started = true;
    this.logger.log("Managers plugin started, all hooks registered");
  }

  async onLogin(user) {
    // No login-specific logic needed for managers plugin
  }

  async stop() {
    this.logger.log("Stopping Managers plugin");
    await super.stop();
  }

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

              // Use the plugin's own logger
              this.logger.log(
                `Found ${invisiblePlayers} potentially invisible players in instance "${instanceArgs.json.instanceId}" in world "${instanceArgs.json.worldName}"`,
                { console: true, vrcx: { notify: true } },
                "warning"
              );
            }
          });
        }
      }
    );

    this.logger.log(
      "Instance monitoring hook registered (will activate when function available)"
    );
  }

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

    this.logger.log(
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
        this.logger.log("Invite notification received:", noty);
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
        // Use the plugin's own logger
        this.logger.log(
          message,
          { console: true, desktop: true, xsoverlay: true },
          "info"
        );
      }
    } catch (error) {
      this.logger.error("Error handling tagged player join:", error);
    }
  }
}

// Export plugin class for PluginManager
window.__LAST_PLUGIN_CLASS__ = ManagersPlugin;
