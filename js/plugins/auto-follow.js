/**
 * Auto Follow Plugin
 * Automatic location tracking system that follows selected users
 * Monitors user location changes and sends you invites to join them
 *
 * Configuration:
 * - window.customjs.config.autofollow.customInviteMessage: Custom invite request message template
 *
 * Template Variables:
 * - {userId}: Target user ID being followed
 * - {userName}, {userDisplayName}: Target user display name
 * - {worldName}: World name they traveled to
 * - {worldId}: World ID
 * - {instanceId}: Full instance ID
 * - {myUserId}: Your user ID
 * - {myUserName}, {myDisplayName}: Your display name
 * - {now}: Formatted date/time
 * - {date}: Current date
 * - {time}: Current time
 * - {timestamp}: Unix timestamp
 * - {iso}: ISO 8601 date/time
 *
 * Example:
 * window.customjs.config.autofollow.customInviteMessage = "Following you to {worldName}!"
 */
class AutoFollowPlugin extends Plugin {
  constructor() {
    super({
      name: "Auto Follow Manager",
      description:
        "Automatic location tracking system that follows selected users",
      author: "Bluscream",
      version: "2.0.0",
      build: "1728778800",
      dependencies: [
        "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/plugins/context-menu-api.js",
      ],
    });

    // Auto-follow state
    this.autoFollowUsers = new Map(); // Map<userId, {user, lastLocation}>
    this.lastRequestedFrom = new Map(); // Map<userId, lastRequestedLocation>
    this.checkInterval = 10000; // Check every 10 seconds

    // Default config
    this.defaultConfig = {
      customInviteMessage: "Can I join you?",
    };
  }

  async load() {
    // Settings are accessed via this.get() with defaults
    const message = this.get("messages.customInviteMessage", "Can I join you?");

    this.logger.log(`⚙️ Custom invite message: "${message}"`);

    this.logger.log("Auto Follow plugin ready");
    this.loaded = true;
  }

  async start() {
    // Setup utils shortcut
    this.utils = window.customjs.utils;

    // Wait for dependencies
    this.contextMenuApi = await window.customjs.pluginManager.waitForPlugin(
      "context-menu-api"
    );

    // Setup context menu buttons
    this.setupUserButtons();

    // Setup location monitoring
    this.setupLocationMonitoring();

    this.enabled = true;
    this.started = true;
    this.logger.log("Auto Follow plugin started, location monitoring active");
  }

  async onLogin(user) {
    // No login-specific logic needed for auto follow plugin
  }

  async stop() {
    this.logger.log("Stopping Auto Follow plugin");

    // Remove context menu items
    const contextMenu =
      window.customjs?.pluginManager?.getPlugin("context-menu-api");
    if (contextMenu) {
      contextMenu.removeUserItem("autoFollow");
      contextMenu.removeUserItem("clearAutoFollow");
    }

    // Clear auto-follow users
    this.autoFollowUsers.clear();
    this.lastRequestedFrom.clear();

    // Parent cleanup (will stop timers automatically)
    await super.stop();
  }

  // ============================================================================
  // CONTEXT MENU INTEGRATION
  // ============================================================================

  setupUserButtons() {
    try {
      // Don't setup if already done
      if (this.autoFollowItem && this.clearAutoFollowItem) {
        return true;
      }

      if (!this.contextMenuApi) {
        this.logger.warn("Context Menu API not available");
        return false;
      }

      this.autoFollowItem = this.contextMenuApi.addUserItem("autoFollow", {
        text: "Auto Follow",
        icon: "el-icon-position",
        onClick: (user) => this.toggleAutoFollow(user),
      });

      this.clearAutoFollowItem = this.contextMenuApi.addUserItem(
        "clearAutoFollow",
        {
          text: "Clear AutoFollow",
          icon: "el-icon-delete",
          onClick: () => this.clearAllAutoFollows(),
        }
      );

      this.logger.log("Auto Follow context menu buttons added");
      return true;
    } catch (error) {
      this.logger.error("Error setting up Auto Follow buttons:", error);

      if (!this.autoFollowItem || !this.clearAutoFollowItem) {
        setTimeout(() => this.setupUserButtons(), 2000);
      }

      return false;
    }
  }

  // ============================================================================
  // LOCATION MONITORING
  // ============================================================================

  setupLocationMonitoring() {
    // Poll user locations periodically
    const intervalId = this.registerTimer(
      setInterval(() => {
        this.checkFollowedUsersLocations();
      }, this.checkInterval)
    );

    this.logger.log(
      `Location monitoring started (interval: ${this.checkInterval}ms)`
    );
  }

  async checkFollowedUsersLocations() {
    if (this.autoFollowUsers.size === 0) return;

    try {
      for (const [userId, data] of this.autoFollowUsers.entries()) {
        await this.checkUserLocation(userId, data);
      }
    } catch (error) {
      this.logger.error(`Error checking locations: ${error.message}`);
    }
  }

  async checkUserLocation(userId, data) {
    try {
      // Fetch user data from API
      const userResponse = await window.request.userRequest.getUser({ userId });
      if (!userResponse || !userResponse.json) return;

      const user = userResponse.json;
      const currentLocation = user.location;

      // Skip if no location or in private/offline
      if (
        !currentLocation ||
        currentLocation === "offline" ||
        currentLocation === "private"
      ) {
        return;
      }

      // Check if location changed
      if (data.lastLocation !== currentLocation) {
        this.logger.log(
          `User ${user.displayName} moved from ${
            data.lastLocation || "unknown"
          } to ${currentLocation}`
        );

        // Update stored location
        data.lastLocation = currentLocation;
        data.user = user; // Update user data
        this.autoFollowUsers.set(userId, data);

        // Only request invite if we haven't already requested for this location
        const lastRequested = this.lastRequestedFrom.get(userId);
        if (lastRequested !== currentLocation) {
          await this.requestInviteToUser(user, currentLocation);
        }
      }
    } catch (error) {
      // Silently handle errors for individual users
      this.logger.warn(
        `Failed to check location for user ${userId}: ${error.message}`
      );
    }
  }

  async requestInviteToUser(user, location) {
    const userName = user.displayName;
    let instanceId = location;
    let worldId = location.split(":")[0];
    let worldName = "Unknown World";

    // Try to get world name
    try {
      worldName = await window.$app.getWorldName(worldId);
    } catch (error) {
      this.logger.warn(`Failed to get world name: ${error.message}`);
    }

    this.logger.log(
      `Requesting invite from ${userName} to "${worldName}" (${instanceId})`
    );

    try {
      // Get custom message template from config
      const messageTemplate = this.get(
        "messages.customInviteMessage",
        "Can I join you?"
      );

      // Process template
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
      if (
        !customMessage &&
        this.get("messages.customInviteMessage", "Can I join you?")
      ) {
        customMessage = this.processInviteMessageTemplate(
          this.get("messages.customInviteMessage", "Can I join you?"),
          user,
          worldName,
          instanceId
        );
      }

      // Build invite request params
      const inviteParams = {
        instanceId: instanceId,
        worldId: worldId,
        worldName: worldName,
      };

      // Only add message if we have one
      if (customMessage) {
        inviteParams.message = customMessage;
      }

      // Send invite request
      await window.request.notificationRequest.sendRequestInvite(
        inviteParams,
        user.id
      );

      this.lastRequestedFrom.set(user.id, location);
      this.logger.log(`✓ Successfully requested invite from ${userName}`);
    } catch (error) {
      this.logger.error(
        `Failed to request invite from ${userName}: ${error.message}`
      );
    }
  }

  /**
   * Process invite message template with variable substitution
   * @param {string} template - Message template with placeholders
   * @param {object} user - Target user object being followed
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

  // ============================================================================
  // USER MANAGEMENT
  // ============================================================================

  toggleAutoFollow(user) {
    if (!this.contextMenuApi) return;

    if (this.utils.isEmpty(user)) {
      this.logger.showError("Invalid user");
      return;
    }

    if (this.autoFollowUsers.has(user.id)) {
      // Remove user from list
      this.autoFollowUsers.delete(user.id);
      this.lastRequestedFrom.delete(user.id);
      this.logger.log(`Removed ${user.displayName} from Auto Follow list`);
      this.logger.showInfo(`Removed ${user.displayName} from Auto Follow list`);
    } else {
      // Add user to list
      this.autoFollowUsers.set(user.id, {
        user: user,
        lastLocation: null,
      });
      this.logger.log(`Added ${user.displayName} to Auto Follow list`);
      this.logger.showSuccess(`Added ${user.displayName} to Auto Follow list`);

      // Immediately check their location
      this.checkUserLocation(user.id, {
        user: user,
        lastLocation: null,
      });
    }

    // Update context menu button text
    this.updateAutoFollowButtonText();
  }

  /**
   * Update the Auto Follow button text based on current list
   */
  updateAutoFollowButtonText() {
    if (!this.contextMenuApi) return;

    if (this.autoFollowUsers.size === 0) {
      this.contextMenuApi.updateUserItem("autoFollow", {
        text: "Auto Follow",
        icon: "el-icon-position",
      });
    } else if (this.autoFollowUsers.size === 1) {
      const data = Array.from(this.autoFollowUsers.values())[0];
      this.contextMenuApi.updateUserItem("autoFollow", {
        text: `Auto Follow: ${data.user.displayName}`,
        icon: "el-icon-position",
      });
    } else {
      this.contextMenuApi.updateUserItem("autoFollow", {
        text: `Auto Follow (${this.autoFollowUsers.size} users)`,
        icon: "el-icon-position",
      });
    }
  }

  /**
   * Clear all auto-follow users
   */
  clearAllAutoFollows() {
    if (this.autoFollowUsers.size === 0) {
      this.logger.showInfo("Auto Follow list is already empty");
      return;
    }

    const count = this.autoFollowUsers.size;
    this.autoFollowUsers.clear();
    this.lastRequestedFrom.clear();
    this.logger.log(`Cleared ${count} user(s) from Auto Follow list`);
    this.logger.showSuccess(`Cleared ${count} user(s) from Auto Follow list`);

    // Update context menu button
    this.updateAutoFollowButtonText();
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  /**
   * Get currently selected auto-follow users
   * @returns {Map<string, object>} Map of userId to {user, lastLocation}
   */
  getAutoFollowUsers() {
    return this.autoFollowUsers;
  }

  /**
   * Get auto-follow users as array
   * @returns {Array} Array of user objects
   */
  getAutoFollowUsersList() {
    return Array.from(this.autoFollowUsers.values()).map((data) => data.user);
  }

  /**
   * Add user to auto-follow list programmatically
   * @param {object} user - User object
   */
  addAutoFollowUser(user) {
    if (!user || !user.id) return;

    this.autoFollowUsers.set(user.id, {
      user: user,
      lastLocation: null,
    });
    this.logger.log(`Auto-follow user added: ${user?.displayName}`);
    this.updateAutoFollowButtonText();

    // Immediately check their location
    this.checkUserLocation(user.id, {
      user: user,
      lastLocation: null,
    });
  }

  /**
   * Remove user from auto-follow list programmatically
   * @param {string} userId - User ID
   */
  removeAutoFollowUser(userId) {
    if (this.autoFollowUsers.has(userId)) {
      const data = this.autoFollowUsers.get(userId);
      this.autoFollowUsers.delete(userId);
      this.lastRequestedFrom.delete(userId);
      this.logger.log(`Auto-follow user removed: ${data?.user?.displayName}`);
      this.updateAutoFollowButtonText();
    }
  }

  /**
   * Clear auto-follow users (alias for clearAllAutoFollows)
   */
  clearAutoFollowUsers() {
    this.clearAllAutoFollows();
  }

  /**
   * Get the current custom invite message template
   * @returns {string|null} Current message template or null if disabled
   */
  getCustomInviteMessage() {
    return this.get("messages.customInviteMessage", "Can I join you?");
  }

  /**
   * Set custom invite message template
   * @param {string|null} message - Message template with placeholders, or null to disable
   *
   * Available placeholders:
   * - {userId}: Target user ID being followed
   * - {userName}, {userDisplayName}: Target user display name
   * - {worldName}: World name they traveled to
   * - {worldId}: World ID
   * - {instanceId}: Full instance ID
   * - {myUserId}: Your user ID
   * - {myUserName}, {myDisplayName}: Your display name
   * - {now}: Formatted date/time
   * - {date}: Current date
   * - {time}: Current time
   * - {timestamp}: Unix timestamp
   * - {iso}: ISO 8601 date/time
   *
   * Example: "Following you to {worldName}!"
   * Set to null to omit custom messages (will use default config or no message)
   */
  async setCustomInviteMessage(message) {
    this.set("messages.customInviteMessage", message);
    await this.saveSettings();
    if (message === null) {
      this.logger.log("Custom invite message disabled");
    } else {
      this.logger.log(`Custom invite message updated: "${message}"`);
    }
  }

  /**
   * Set the check interval for location monitoring
   * @param {number} milliseconds - Interval in milliseconds
   */
  setCheckInterval(milliseconds) {
    if (milliseconds < 5000) {
      this.logger.warn("Interval too short, setting to minimum 5000ms");
      milliseconds = 5000;
    }

    this.checkInterval = milliseconds;
    this.logger.log(`Check interval updated to ${milliseconds}ms`);

    // Restart monitoring with new interval if already started
    if (this.started) {
      this.logger.log("Restarting location monitoring with new interval...");
      // Note: The old timer is automatically cleaned up by the parent stop() method
    }
  }
}

// Export plugin class for PluginLoader
window.customjs.__LAST_PLUGIN_CLASS__ = AutoFollowPlugin;
