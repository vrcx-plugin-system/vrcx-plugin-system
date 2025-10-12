/**
 * Self Invite On Blocked Player Plugin
 *
 * Features:
 * - Detects blocked players joining via gameLog (more reliable than notifications)
 * - Uses pinia stores to get current location
 * - Automatically creates self-invite to new instance of same world
 * - Configurable delay before inviting
 * - Option to show notification
 *
 * @author Bluscream
 * @version 1.1.0
 */
class SelfInviteOnBlockedPlayerPlugin extends Plugin {
  constructor() {
    super({
      name: "Self Invite on Blocked Player",
      description:
        "Automatically creates a self-invite to a new instance when a blocked player joins your current instance",
      author: "Bluscream",
      version: "2.0.0",
      build: "1728778800",
      dependencies: [],
    });

    // Tracking
    this.lastBlockedPlayerJoin = null;
    this.inviteCreated = false;
  }

  async load() {
    // Settings are accessed via this.get() with defaults
    const enabled = this.get("general.enabled", true);
    const delayMs = this.get("general.delayMs", 1000);
    const cooldownMs = this.get("general.cooldownMs", 30000);

    this.logger.log(
      `⚙️ Enabled: ${enabled}, Delay: ${delayMs}ms, Cooldown: ${cooldownMs}ms`
    );

    this.logger.log("Self Invite on Blocked Player plugin ready");
    this.loaded = true;
  }

  async start() {
    // Setup utils shortcut
    this.utils = window.customjs.utils;

    // Setup gameLog monitoring for blocked players
    this.setupGameLogMonitoring();

    this.enabled = true;
    this.started = true;
    this.logger.log(
      "Self Invite on Blocked Player plugin started, monitoring for blocked players"
    );
  }

  async onLogin(user) {
    // Reset state on login
    this.lastBlockedPlayerJoin = null;
    this.inviteCreated = false;
    this.logger.log("State reset on login");
  }

  async stop() {
    this.logger.log("Stopping Self Invite on Blocked Player plugin");

    // Cleanup is handled automatically by parent class via subscriptions
    await super.stop();
  }

  // ============================================================================
  // GAMELOG MONITORING
  // ============================================================================

  setupGameLogMonitoring() {
    // Wait for gameLog store to be available
    const checkInterval = setInterval(() => {
      const gameLogStore = window.$pinia?.gameLog;

      if (gameLogStore) {
        clearInterval(checkInterval);

        // Subscribe to gameLog store state changes using Pinia's $subscribe
        const unsubscribe = gameLogStore.$subscribe(
          (mutation, state) => {
            // Watch for new entries in gameLogSessionTable
            if (
              mutation.type === "direct" &&
              state.gameLogSessionTable?.length > 0
            ) {
              // Get the latest entry
              const latestEntry =
                state.gameLogSessionTable[state.gameLogSessionTable.length - 1];

              // Check if it's a player join event
              if (latestEntry?.type === "OnPlayerJoined") {
                this.handlePlayerJoin(latestEntry);
              }
            }
          },
          { flush: "sync" } // Process immediately, not batched
        );

        // Store unsubscribe function for cleanup
        this.registerSubscription(unsubscribe);

        this.logger.log(
          "GameLog store subscription registered (using Pinia $subscribe)"
        );
      }
    }, 100);

    // Register the interval for cleanup
    this.registerTimer(checkInterval);

    // Clear interval after 10 seconds if store not found
    setTimeout(() => {
      clearInterval(checkInterval);
    }, 10000);
  }

  async handlePlayerJoin(entry) {
    try {
      // Check if feature is enabled
      if (!this.get("general.enabled", true)) {
        return;
      }

      // Handle both raw gameLog format and database entry format
      const userId = entry.userId || entry.user_id;
      const displayName = entry.displayName || entry.display_name;

      if (!userId) {
        return;
      }

      // Check if player is blocked using pinia moderation store
      const moderationStore = window.$pinia?.moderation;
      if (!moderationStore) {
        this.logger.warn("Moderation store not available");
        return;
      }

      const moderation = moderationStore.cachedPlayerModerations.get(userId);

      // Check if user is blocked
      if (!moderation || moderation.type !== "block") {
        return;
      }

      this.logger.log(`Blocked player joined: ${displayName} (${userId})`);

      // Check cooldown
      const now = Date.now();
      const cooldown = this.get("general.cooldownMs", 30000);

      if (
        this.lastBlockedPlayerJoin &&
        now - this.lastBlockedPlayerJoin < cooldown
      ) {
        this.logger.log(
          `Cooldown active, skipping self-invite (${Math.round(
            (cooldown - (now - this.lastBlockedPlayerJoin)) / 1000
          )}s remaining)`
        );
        return;
      }

      // Get current location from pinia location store
      const locationStore = window.$pinia?.location;
      if (!locationStore) {
        this.logger.error("Location store not available");
        return;
      }

      const currentLocation = locationStore.lastLocation?.location;
      if (
        !currentLocation ||
        currentLocation === "offline" ||
        currentLocation === "traveling"
      ) {
        this.logger.log("Not in a valid location, skipping self-invite");
        return;
      }

      // Parse location to get worldId
      const worldId = this.getWorldIdFromLocation(currentLocation);
      if (!worldId) {
        this.logger.error("Could not extract worldId from location");
        return;
      }

      // Create self-invite with delay
      const delay = this.get("general.delayMs", 1000);
      this.logger.log(`Creating self-invite to new instance in ${delay}ms...`);

      setTimeout(() => {
        this.createSelfInvite(worldId, displayName);
      }, delay);

      this.lastBlockedPlayerJoin = now;
    } catch (error) {
      this.logger.error(`Error handling player join: ${error.message}`);
    }
  }

  // ============================================================================
  // SELF INVITE LOGIC
  // ============================================================================

  createSelfInvite(worldId, blockedPlayerName) {
    try {
      // Check if $app is available
      if (!window.$app?.newInstanceSelfInvite) {
        this.logger.error("$app.newInstanceSelfInvite not available");
        return;
      }

      // Get world name for notification
      const locationStore = window.$pinia?.location;
      const worldName = locationStore?.lastLocation?.worldName || "this world";

      // Create self-invite to new instance
      window.$app.newInstanceSelfInvite(worldId);

      this.logger.log(`✓ Self-invite created for world: ${worldId}`);

      // Show notification if enabled
      if (this.get("notifications.showNotification", true)) {
        const showName = this.get("notifications.showPlayerName", false);
        const message = showName
          ? `Blocked player ${blockedPlayerName} joined. Self-invite created to new instance of ${worldName}`
          : `Blocked player joined. Self-invite created to new instance of ${worldName}`;

        this.logger.showInfo(message);
      }

      this.inviteCreated = true;
    } catch (error) {
      this.logger.error(`Failed to create self-invite: ${error.message}`);
    }
  }

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  /**
   * Extract worldId from location string
   * @param {string} location - Location string (e.g., "wrld_xxx:12345~region(us)")
   * @returns {string|null} World ID or null
   */
  getWorldIdFromLocation(location) {
    if (!location || typeof location !== "string") {
      return null;
    }

    // Location format: wrld_xxx:instanceId~details
    // or just wrld_xxx for world homes
    const match = location.match(/^(wrld_[a-f0-9-]+)/i);
    return match ? match[1] : null;
  }

  /**
   * Get current world ID from pinia store
   * @returns {string|null} World ID or null
   */
  getCurrentWorldId() {
    const locationStore = window.$pinia?.location;
    if (!locationStore?.lastLocation?.location) {
      return null;
    }

    return this.getWorldIdFromLocation(locationStore.lastLocation.location);
  }

  /**
   * Check if a user is blocked
   * @param {string} userId - User ID to check
   * @returns {boolean} True if blocked
   */
  isUserBlocked(userId) {
    const moderationStore = window.$pinia?.moderation;
    if (!moderationStore) {
      return false;
    }

    const moderation = moderationStore.cachedPlayerModerations.get(userId);
    return moderation?.type === "block";
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  /**
   * Manually trigger a self-invite (for testing or external use)
   * @param {string} worldId - Optional world ID (defaults to current world)
   */
  async triggerSelfInvite(worldId = null) {
    const targetWorldId = worldId || this.getCurrentWorldId();

    if (!targetWorldId) {
      this.logger.error("No world ID provided and could not get current world");
      return false;
    }

    this.logger.log(
      `Manually triggering self-invite for world: ${targetWorldId}`
    );
    this.createSelfInvite(targetWorldId, "Manual trigger");
    return true;
  }

  /**
   * Get plugin statistics
   * @returns {object} Statistics object
   */
  getStats() {
    return {
      lastBlockedPlayerJoin: this.lastBlockedPlayerJoin,
      inviteCreated: this.inviteCreated,
      enabled: this.get("general.enabled", true),
      cooldown: this.get("general.cooldownMs", 30000),
    };
  }

  /**
   * Reset cooldown timer
   */
  resetCooldown() {
    this.lastBlockedPlayerJoin = null;
    this.logger.log("Cooldown reset");
  }
}

// Export plugin class for PluginLoader
window.customjs.__LAST_PLUGIN_CLASS__ = SelfInviteOnBlockedPlayerPlugin;
