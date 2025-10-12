/**
 * Auto Invite Plugin
 * Automatic user invitation system with location tracking
 * Monitors user location changes and sends invites to multiple users
 */
class AutoInvitePlugin extends Plugin {
  constructor() {
    super({
      name: "Auto Invite Manager",
      description: "Automatic user invitation system with location tracking",
      author: "Bluscream",
      version: "3.0.0",
      build: "1728735600",
      dependencies: [
        "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/plugin.js",
        "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/plugins/api-helpers.js",
        "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/plugins/context-menu-api.js",
        "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/plugins/utils.js",
      ],
    });

    // Auto-invite state
    this.autoInviteUsers = new Map(); // Map<userId, userObject>
    this.lastInvitedTo = null;
    this.lastJoined = null;
    this.lastDestinationCheck = null;

    // Tracking
    this.gameLogHookRetries = 0;
  }

  async load() {
    this.logger.log("Auto Invite plugin ready");
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
    this.logger.log("Auto Invite plugin started, location tracking active");
  }

  async onLogin(user) {
    // No login-specific logic needed for auto invite plugin
  }

  async stop() {
    this.logger.log("Stopping Auto Invite plugin");

    // Remove context menu items
    const contextMenu =
      window.customjs?.pluginManager?.getPlugin("context-menu-api");
    if (contextMenu) {
      contextMenu.removeUserItem("autoInvite");
      contextMenu.removeUserItem("clearAutoInvite");
    }

    // Clear auto-invite users
    this.autoInviteUsers.clear();
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

    this.logger.log("Location tracking setup complete");
  }

  setupGameLogHook() {
    // Try to access game log store
    if (window.$pinia?.gameLog || window.$pinia?.location) {
      this.logger.log("Using location store monitoring for travel detection");
    } else {
      // Retry after delay
      if (this.gameLogHookRetries < 3) {
        this.gameLogHookRetries++;
        setTimeout(() => {
          this.logger.log(
            `Retrying store access (attempt ${this.gameLogHookRetries}/3)...`
          );
          this.setupGameLogHook();
        }, 3000);
      } else {
        this.logger.warn(
          "Max retries reached, relying on location store polling"
        );
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

      this.logger.log("Hooked into setCurrentUserLocation");
    }
  }

  setupLocationStoreMonitor() {
    // Monitor location store changes by polling
    const intervalId = this.registerTimer(
      setInterval(() => {
        this.checkLocationStoreChanges();
      }, 1000)
    );

    this.logger.log("Location store monitor started");
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
        this.logger.log(`Location store traveling detected: ${destination}`);
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
      if (this.autoInviteItem && this.clearAutoInviteItem) {
        return true;
      }

      if (!this.contextMenuApi) {
        this.logger.warn("Context Menu API not available");
        return false;
      }

      this.autoInviteItem = this.contextMenuApi.addUserItem("autoInvite", {
        text: "Auto Invite",
        icon: "el-icon-message",
        onClick: (user) => this.toggleAutoInvite(user),
      });

      this.clearAutoInviteItem = this.contextMenuApi.addUserItem(
        "clearAutoInvite",
        {
          text: "Clear AutoInvite",
          icon: "el-icon-delete",
          onClick: () => this.clearAllAutoInvites(),
        }
      );

      this.logger.log("Auto Invite context menu buttons added");
      return true;
    } catch (error) {
      this.logger.error("Error setting up Auto Invite buttons:", error);

      if (!this.autoInviteItem || !this.clearAutoInviteItem) {
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

    if (this.autoInviteUsers.size > 0 && !this.utils.isEmpty(destination)) {
      // Only invite if we haven't already invited to this location
      if (this.lastInvitedTo !== destination) {
        await this.sendInvitesToUsers(destination);
      }
    }
  }

  async onCurrentUserLocationChanged(location, travelingToLocation) {
    if (!this.utils?.isEmpty) return;

    this.logger.log(
      `Location change: ${location} (traveling to: ${travelingToLocation})`
    );

    // Check if user is starting to travel
    if (location === "traveling") {
      if (
        this.autoInviteUsers.size > 0 &&
        !utils.isEmpty(travelingToLocation)
      ) {
        if (this.lastInvitedTo !== travelingToLocation) {
          await this.sendInvitesToUsers(travelingToLocation);
        }
      }
    } else if (location && location !== "offline" && location !== "private") {
      // User has arrived at a new location
      this.lastJoined = location;
      this.logger.log(`User arrived at: ${location}`);

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

  async sendInvitesToUsers(destination) {
    if (this.autoInviteUsers.size === 0) return;

    let instanceId = destination;
    let worldId = destination.split(":")[0];
    let worldName = "Unknown World";

    // Try to get world name
    try {
      worldName = await window.$app.getWorldName(worldId);
    } catch (error) {
      this.logger.warn(`Failed to get world name: ${error.message}`);
    }

    const userNames = Array.from(this.autoInviteUsers.values())
      .map((u) => u.displayName)
      .join(", ");

    this.logger.log(
      `Inviting ${this.autoInviteUsers.size} user(s) to "${worldName}" (${instanceId})`
    );

    try {
      const apiHelpers =
        window.customjs?.pluginManager?.getPlugin("api-helpers");

      // Send invites to all users in the list
      const invitePromises = Array.from(this.autoInviteUsers.values()).map(
        (user) =>
          apiHelpers?.API.sendInvite(
            {
              instanceId: instanceId,
              worldId: worldId,
              worldName: worldName,
            },
            user.id
          )
      );

      await Promise.all(invitePromises);

      this.lastInvitedTo = destination;
      this.logger.log(`✓ Successfully sent invites to: ${userNames}`);
    } catch (error) {
      this.logger.error(`Failed to send invites: ${error.message}`);
    }
  }

  toggleAutoInvite(user) {
    if (!this.utils || !this.contextMenuApi) return;

    if (this.utils.isEmpty(user)) {
      this.logger.showError("Invalid user");
      return;
    }

    if (this.autoInviteUsers.has(user.id)) {
      // Remove user from list
      this.autoInviteUsers.delete(user.id);
      this.logger.log(`Removed ${user.displayName} from Auto Invite list`);
      this.logger.showInfo(`Removed ${user.displayName} from Auto Invite list`);
    } else {
      // Add user to list
      this.autoInviteUsers.set(user.id, user);
      this.logger.log(`Added ${user.displayName} to Auto Invite list`);
      this.logger.showSuccess(`Added ${user.displayName} to Auto Invite list`);
    }

    // Update context menu button text
    this.updateAutoInviteButtonText();
  }

  /**
   * Update the Auto Invite button text based on current list
   */
  updateAutoInviteButtonText() {
    if (!this.contextMenuApi) return;

    if (this.autoInviteUsers.size === 0) {
      this.contextMenuApi.updateUserItem("autoInvite", {
        text: "Auto Invite",
        icon: "el-icon-message",
      });
    } else if (this.autoInviteUsers.size === 1) {
      const user = Array.from(this.autoInviteUsers.values())[0];
      this.contextMenuApi.updateUserItem("autoInvite", {
        text: `Auto Invite: ${user.displayName}`,
        icon: "el-icon-message",
      });
    } else {
      this.contextMenuApi.updateUserItem("autoInvite", {
        text: `Auto Invite (${this.autoInviteUsers.size} users)`,
        icon: "el-icon-message",
      });
    }
  }

  /**
   * Clear all auto-invite users
   */
  clearAllAutoInvites() {
    if (this.autoInviteUsers.size === 0) {
      this.logger.showInfo("Auto Invite list is already empty");
      return;
    }

    const count = this.autoInviteUsers.size;
    this.autoInviteUsers.clear();
    this.lastInvitedTo = null;
    this.logger.log(`Cleared ${count} user(s) from Auto Invite list`);
    this.logger.showSuccess(`Cleared ${count} user(s) from Auto Invite list`);

    // Update context menu button
    this.updateAutoInviteButtonText();
  }

  /**
   * Get currently selected auto-invite users
   * @returns {Map<string, object>} Map of userId to user object
   */
  getAutoInviteUsers() {
    return this.autoInviteUsers;
  }

  /**
   * Get auto-invite users as array
   * @returns {Array} Array of user objects
   */
  getAutoInviteUsersList() {
    return Array.from(this.autoInviteUsers.values());
  }

  /**
   * Add user to auto-invite list programmatically
   * @param {object} user - User object
   */
  addAutoInviteUser(user) {
    if (!user || !user.id) return;

    this.autoInviteUsers.set(user.id, user);
    this.logger.log(`Auto-invite user added: ${user?.displayName}`);
    this.updateAutoInviteButtonText();
  }

  /**
   * Remove user from auto-invite list programmatically
   * @param {string} userId - User ID
   */
  removeAutoInviteUser(userId) {
    if (this.autoInviteUsers.has(userId)) {
      const user = this.autoInviteUsers.get(userId);
      this.autoInviteUsers.delete(userId);
      this.logger.log(`Auto-invite user removed: ${user?.displayName}`);
      this.updateAutoInviteButtonText();
    }
  }

  /**
   * Clear auto-invite users (alias for clearAllAutoInvites)
   */
  clearAutoInviteUsers() {
    this.clearAllAutoInvites();
  }
}

// Export plugin class for PluginLoader
window.__LAST_PLUGIN_CLASS__ = AutoInvitePlugin;
