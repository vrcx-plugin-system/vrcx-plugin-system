// ============================================================================
// AUTO INVITE PLUGIN
// Version: 2.1.1
// Build: 1760196000
// ============================================================================

/**
 * Auto Invite Plugin
 * Automatic user invitation system with location tracking
 * Monitors user location changes and sends invites to a selected user
 */
class AutoInvitePlugin extends Plugin {
  constructor() {
    super({
      name: "Auto Invite Manager",
      description: "Automatic user invitation system with location tracking",
      author: "Bluscream",
      version: "2.1.1",
      build: "1760196000",
      dependencies: [
        "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/plugin.js",
        "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/plugins/api-helpers.js",
        "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/plugins/context-menu-api.js",
        "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/plugins/utils.js",
      ],
    });

    // Auto-invite state
    this.autoInviteUser = null;
    this.lastInvitedTo = null;
    this.lastJoined = null;
    this.lastDestinationCheck = null;

    // Tracking
    this.gameLogHookRetries = 0;
  }

  async load() {
    this.log("Auto Invite plugin ready");
    this.loaded = true;
  }

  async start() {
    // Wait for dependencies
    this.contextMenuApi = await window.customjs.pluginManager.waitForPlugin(
      "context-menu-api"
    );
    this.utils = await window.customjs.pluginManager.waitForPlugin("utils");

    // Setup location tracking
    this.setupLocationTracking();

    // Setup location store monitor
    this.setupLocationStoreMonitor();

    // Setup context menu button
    this.setupUserButton();

    this.enabled = true;
    this.started = true;
    this.log("Auto Invite plugin started, location tracking active");
  }

  async onLogin(user) {
    // No login-specific logic needed for auto invite plugin
  }

  async stop() {
    this.log("Stopping Auto Invite plugin");

    // Remove context menu items
    const contextMenu =
      window.customjs?.pluginManager?.getPlugin("context-menu-api");
    if (contextMenu) {
      contextMenu.removeUserItem("autoInvite");
    }

    // Clear auto-invite user
    this.autoInviteUser = null;
    this.lastInvitedTo = null;

    // Parent cleanup (will stop timers automatically)
    await super.stop();
  }

  // ============================================================================
  // LOCATION TRACKING
  // ============================================================================

  setupLocationTracking() {
    // Hook into location API
    this.setupLocationAPIHook();

    // Also try to setup game log hook
    this.setupGameLogHook();

    this.log("Location tracking setup complete");
  }

  setupGameLogHook() {
    // Try to access game log store
    if (window.$pinia?.gameLog || window.$pinia?.location) {
      this.log("Using location store monitoring for travel detection");
    } else {
      // Retry after delay
      if (this.gameLogHookRetries < 3) {
        this.gameLogHookRetries++;
        setTimeout(() => {
          this.log(
            `Retrying store access (attempt ${this.gameLogHookRetries}/3)...`
          );
          this.setupGameLogHook();
        }, 3000);
      } else {
        this.warn("Max retries reached, relying on location store polling");
      }
    }
  }

  setupLocationAPIHook() {
    // Hook into setCurrentUserLocation if available
    if (
      !window.customjs?.functions?.["$app.setCurrentUserLocation"] &&
      window.$app?.setCurrentUserLocation
    ) {
      // Use the hook system to intercept location changes
      this.registerPostHook("$app.setCurrentUserLocation", (result, args) => {
        const [location, travelingToLocation] = args;
        setTimeout(async () => {
          await this.onCurrentUserLocationChanged(
            location,
            travelingToLocation
          );
        }, 1000);
      });

      this.log("Hooked into setCurrentUserLocation");
    }
  }

  setupLocationStoreMonitor() {
    // Monitor location store changes by polling
    const intervalId = this.registerTimer(
      setInterval(() => {
        this.checkLocationStoreChanges();
      }, 1000)
    );

    this.log("Location store monitor started");
  }

  checkLocationStoreChanges() {
    try {
      const locationStore = window.$pinia?.location;
      if (!locationStore) return;

      const currentLocation = locationStore.lastLocation?.location;
      const destination = locationStore.lastLocationDestination;

      // Check if we're traveling and have a destination
      if (
        currentLocation === "traveling" &&
        destination &&
        destination !== this.lastDestinationCheck
      ) {
        this.log(`Location store traveling detected: ${destination}`);
        this.lastDestinationCheck = destination;
        this.onLocationDestinationDetected(destination);
      }
    } catch (error) {
      // Silently handle errors in polling
    }
  }

  // ============================================================================
  // CONTEXT MENU INTEGRATION
  // ============================================================================

  setupUserButton() {
    try {
      // Don't setup if already done
      if (this.autoInviteItem) {
        return true;
      }

      if (!this.contextMenuApi) {
        this.warn("Context Menu API not available");
        return false;
      }

      this.autoInviteItem = this.contextMenuApi.addUserItem("autoInvite", {
        text: "Auto Invite",
        icon: "el-icon-message",
        onClick: (user) => this.toggleAutoInvite(user),
      });

      this.log("Auto Invite context menu button added");
      return true;
    } catch (error) {
      this.error("Error setting up Auto Invite button:", error);

      if (!this.autoInviteItem) {
        setTimeout(() => this.setupUserButton(), 2000);
      }

      return false;
    }
  }

  // ============================================================================
  // AUTO INVITE LOGIC
  // ============================================================================

  async onLocationDestinationDetected(destination) {
    if (!this.utils?.isEmpty) return;

    if (
      !this.utils.isEmpty(this.autoInviteUser) &&
      !this.utils.isEmpty(destination)
    ) {
      // Only invite if we haven't already invited to this location
      if (this.lastInvitedTo !== destination) {
        await this.sendInviteToUser(destination);
      }
    }
  }

  async onCurrentUserLocationChanged(location, travelingToLocation) {
    if (!this.utils?.isEmpty) return;

    this.log(
      `Location change: ${location} (traveling to: ${travelingToLocation})`
    );

    // Check if user is starting to travel
    if (location === "traveling") {
      if (
        !utils.isEmpty(this.autoInviteUser) &&
        !utils.isEmpty(travelingToLocation)
      ) {
        if (this.lastInvitedTo !== travelingToLocation) {
          await this.sendInviteToUser(travelingToLocation);
        }
      }
    } else if (location && location !== "offline" && location !== "private") {
      // User has arrived at a new location
      this.lastJoined = location;
      this.log(`User arrived at: ${location}`);

      // Trigger registry overrides for instance switching
      const registryPlugin = window.customjs?.plugins?.find(
        (p) => p.metadata?.id === "registry-overrides"
      );
      if (registryPlugin?.triggerEvent) {
        const isPublic =
          location.includes("~public") || location.includes("~hidden");
        const eventType = isPublic
          ? "INSTANCE_SWITCH_PUBLIC"
          : "INSTANCE_SWITCH_PRIVATE";
        registryPlugin.triggerEvent(eventType);
      }
    }
  }

  async sendInviteToUser(destination) {
    const userName = `"${
      this.autoInviteUser?.displayName ?? this.autoInviteUser
    }"`;

    let instanceId = destination;
    let worldId = destination.split(":")[0];
    let worldName = "Unknown World";

    // Try to get world name
    try {
      worldName = await window.$app.getWorldName(worldId);
    } catch (error) {
      this.warn(`Failed to get world name: ${error.message}`);
    }

    this.log(`Inviting ${userName} to "${worldName}" (${instanceId})`);

    try {
      const apiHelpers =
        window.customjs?.pluginManager?.getPlugin("api-helpers");
      await apiHelpers?.API.sendInvite(
        {
          instanceId: instanceId,
          worldId: worldId,
          worldName: worldName,
        },
        this.autoInviteUser.id
      );

      this.lastInvitedTo = destination;
      this.log(`✓ Successfully sent invite to ${userName}`);
    } catch (error) {
      this.error(`Failed to send invite: ${error.message}`);
    }
  }

  toggleAutoInvite(user) {
    if (!this.utils || !this.contextMenuApi) return;

    // Log what we received for debugging
    this.log(
      `toggleAutoInvite called with user: ${JSON.stringify(
        user || "undefined"
      )}`
    );

    if (
      this.utils.isEmpty(user) ||
      (!this.utils.isEmpty(this.autoInviteUser) &&
        user.id === this.autoInviteUser?.id)
    ) {
      // Disable - Store displayName before clearing
      const previousUserName = this.autoInviteUser?.displayName || "unknown";
      this.log(`Disabled Auto Invite for ${previousUserName}`);
      this.autoInviteUser = null;

      this.contextMenuApi.updateUserItem("autoInvite", {
        text: "Auto Invite",
        icon: "el-icon-message",
      });

      this.logger.showInfo("Auto Invite disabled");
    } else {
      // Enable
      this.autoInviteUser = user;
      this.log(`Enabled Auto Invite for ${this.autoInviteUser.displayName}`);

      this.contextMenuApi.updateUserItem("autoInvite", {
        text: `Auto Invite: ${this.autoInviteUser.displayName}`,
        icon: "el-icon-message",
      });

      this.logger.showSuccess(`Auto Invite enabled for ${user.displayName}`);
    }
  }

  /**
   * Get currently selected auto-invite user
   * @returns {object|null} User object or null
   */
  getAutoInviteUser() {
    return this.autoInviteUser;
  }

  /**
   * Set auto-invite user programmatically
   * @param {object} user - User object
   */
  setAutoInviteUser(user) {
    this.autoInviteUser = user;
    this.log(`Auto-invite user set to: ${user?.displayName}`);

    // Update context menu
    if (this.contextMenuApi) {
      this.contextMenuApi.updateUserItem("autoInvite", {
        text: `Auto Invite: ${user.displayName}`,
        icon: "el-icon-message",
      });
    }
  }

  /**
   * Clear auto-invite user
   */
  clearAutoInviteUser() {
    this.autoInviteUser = null;
    this.lastInvitedTo = null;
    this.log("Auto-invite user cleared");

    // Update context menu
    if (this.contextMenuApi) {
      this.contextMenuApi.updateUserItem("autoInvite", {
        text: "Auto Invite",
        icon: "el-icon-message",
      });
    }
  }
}

// Export plugin class for PluginLoader
window.__LAST_PLUGIN_CLASS__ = AutoInvitePlugin;
