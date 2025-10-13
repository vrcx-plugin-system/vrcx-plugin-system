class AutoInvitePlugin extends Plugin {
  constructor() {
    super({
      name: "Auto Invite Manager",
      description:
        "Automatic user invitation system with location tracking and custom messages",
      author: "Bluscream",
      version: "3.0.0",
      build: "1728847200",
      dependencies: [
        "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/plugins/context-menu-api.js",
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
    // Define settings using new Equicord-style system
    const SettingType = window.customjs.SettingType;

    this.settings = this.defineSettings({
      customInviteMessage: {
        type: SettingType.STRING,
        description: "Message to send when inviting users automatically",
        placeholder: "Auto-invite from VRCX",
        default: "Auto-invite from VRCX",
        variables: {
          "{userId}": "Target user ID being invited",
          "{userName}": "Target user display name",
          "{userDisplayName}": "Target user display name",
          "{worldName}": "Current world name",
          "{worldId}": "Current world ID",
          "{instanceId}": "Current instance ID",
          "{myUserId}": "Your user ID",
          "{myUserName}": "Your display name",
          "{myDisplayName}": "Your display name",
          "{now}": "Formatted date/time",
          "{date}": "Current date",
          "{time}": "Current time",
          "{timestamp}": "Unix timestamp",
          "{iso}": "ISO 8601 date/time",
        },
      },
    });

    this.logger.log(
      `⚙️ Custom invite message: "${this.settings.store.customInviteMessage}"`
    );

    this.logger.log("Auto Invite plugin ready");
    this.loaded = true;
  }

  async start() {
    // Setup utils shortcut
    this.utils = window.customjs.utils;

    // Wait for dependencies
    this.contextMenuApi = await window.customjs.pluginManager.waitForPlugin(
      "context-menu-api"
    );

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

  async onLocationDestinationDetected(destination) {
    if (this.autoInviteUsers.size > 0 && !this.utils.isEmpty(destination)) {
      // Only invite if we haven't already invited to this location
      if (this.lastInvitedTo !== destination) {
        await this.sendInvitesToUsers(destination);
      }
    }
  }

  async onCurrentUserLocationChanged(location, travelingToLocation) {
    this.logger.log(
      `Location change: ${location} (traveling to: ${travelingToLocation})`
    );

    // Check if user is starting to travel
    if (location === "traveling") {
      if (
        this.autoInviteUsers.size > 0 &&
        !this.utils.isEmpty(travelingToLocation)
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
      // Get custom message template from config
      const messageTemplate = this.get(
        "messages.customInviteMessage",
        "Auto-invite from VRCX"
      );

      // Send invites to all users in the list
      const invitePromises = Array.from(this.autoInviteUsers.values()).map(
        (user) => {
          // Process template for each user
          let customMessage = null;

          if (messageTemplate) {
            customMessage = this.processInviteMessageTemplate(
              messageTemplate,
              user,
              worldName,
              instanceId
            );
          }

          // Fallback to default config if null
          if (!customMessage && this.settings.store.customInviteMessage) {
            customMessage = this.processInviteMessageTemplate(
              this.settings.store.customInviteMessage,
              user,
              worldName,
              instanceId
            );
          }

          // Build invite params
          const inviteParams = {
            instanceId: instanceId,
            worldId: worldId,
            worldName: worldName,
          };

          // Only add message if we have one
          if (customMessage) {
            inviteParams.message = customMessage;
          }

          return window.request.notificationRequest.sendInvite(
            inviteParams,
            user.id
          );
        }
      );

      await Promise.all(invitePromises);

      this.lastInvitedTo = destination;
      this.logger.log(`✓ Successfully sent invites to: ${userNames}`);
    } catch (error) {
      this.logger.error(`Failed to send invites: ${error.message}`);
    }
  }

  /**
   * Process invite message template with variable substitution
   * @param {string} template - Message template with placeholders
   * @param {object} user - Target user object
   * @param {string} worldName - World name
   * @param {string} instanceId - Instance ID
   * @returns {string} Processed message
   */
  processInviteMessageTemplate(template, user, worldName, instanceId) {
    const currentUser = window.$pinia?.user?.currentUser;
    const now = new Date();

    return template
      .replace("{userId}", user.id || "")
      .replace("{userName}", user.displayName || "")
      .replace("{userDisplayName}", user.displayName || "")
      .replace("{worldName}", worldName || "")
      .replace("{worldId}", instanceId.split(":")[0] || "")
      .replace("{instanceId}", instanceId || "")
      .replace("{myUserId}", currentUser?.id || "")
      .replace("{myUserName}", currentUser?.displayName || "")
      .replace("{myDisplayName}", currentUser?.displayName || "")
      .replace("{now}", this.utils?.formatDateTime?.() || now.toISOString())
      .replace("{date}", now.toLocaleDateString())
      .replace("{time}", now.toLocaleTimeString())
      .replace("{timestamp}", now.getTime().toString())
      .replace("{iso}", now.toISOString());
  }

  toggleAutoInvite(user) {
    if (!this.contextMenuApi) return;

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

  /**
   * Get the current custom invite message template
   * @returns {string|null} Current message template or null if disabled
   */
  getCustomInviteMessage() {
    return this.settings.store.customInviteMessage;
  }

  /**
   * Set custom invite message template
   * @param {string|null} message - Message template with placeholders, or null to disable
   *
   * Available placeholders:
   * - {userId}: Target user ID
   * - {userName}, {userDisplayName}: Target user display name
   * - {worldName}: World name
   * - {worldId}: World ID
   * - {instanceId}: Full instance ID
   * - {myUserId}: Current user ID
   * - {myUserName}, {myDisplayName}: Current user display name
   * - {now}: Formatted date/time
   * - {date}: Current date
   * - {time}: Current time
   * - {timestamp}: Unix timestamp
   * - {iso}: ISO 8601 date/time
   *
   * Example: "Auto-invite from {myUserName} to {worldName} at {now}"
   * Set to null to omit custom messages (will use default config or no message)
   */
  async setCustomInviteMessage(message) {
    this.settings.store.customInviteMessage =
      message || "Auto-invite from VRCX";
    // Settings are now auto-saved!
    if (message === null) {
      this.logger.log("Custom invite message disabled");
    } else {
      this.logger.log(`Custom invite message updated: "${message}"`);
    }
  }
}

// Export plugin class for PluginLoader
window.customjs.__LAST_PLUGIN_CLASS__ = AutoInvitePlugin;
