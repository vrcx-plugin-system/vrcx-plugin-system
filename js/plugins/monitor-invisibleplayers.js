/**
 * Invisible Players Monitor Plugin
 *
 * Features:
 * - Detects discrepancy between reported userCount and actual n_users
 * - Shows notifications when invisible players are detected
 * - Configurable notification settings
 * - Modifies instance display name to show invisible player count
 *
 * @author Bluscream
 * @version 1.0.0
 */
class InvisiblePlayersMonitorPlugin extends Plugin {
  constructor() {
    super({
      name: "Invisible Players Monitor",
      description:
        "Detects and notifies when potentially invisible players are in your instance",
      author: "Bluscream",
      version: "2.0.0",
      build: "1728778800",
      dependencies: [],
    });

    this.lastInvisiblePlayers = 0;
  }

  async load() {
    // Settings are accessed via this.get() with defaults
    const enabled = this.get("general.enabled", true);
    const modifyInstanceName = this.get("general.modifyInstanceName", true);

    this.logger.log(
      `⚙️ Enabled: ${enabled}, Modify instance name: ${modifyInstanceName}`
    );

    this.logger.log("Invisible Players Monitor plugin ready");
    this.loaded = true;
  }

  async start() {
    // Setup instance monitoring
    this.setupInstanceMonitoring();

    this.enabled = true;
    this.started = true;
    this.logger.log("Invisible Players Monitor plugin started");
  }

  async onLogin(user) {
    // Reset state on login
    this.lastInvisiblePlayers = 0;
  }

  async stop() {
    this.logger.log("Stopping Invisible Players Monitor plugin");
    await super.stop();
  }

  // ============================================================================
  // INSTANCE MONITORING
  // ============================================================================

  setupInstanceMonitoring() {
    // Wait for plugin manager to be available
    const waitForPluginManager = setInterval(() => {
      if (window.customjs?.pluginManager?.registerPostHook) {
        clearInterval(waitForPluginManager);

        // Use hook system to monitor getInstance calls
        this.registerPostHook(
          "request.instanceRequest.getInstance",
          (result, args) => {
            // Process result when promise resolves
            if (result && typeof result.then === "function") {
              result.then((instanceArgs) => {
                this.handleInstanceData(instanceArgs);
              });
            }
          }
        );

        this.logger.log("Instance monitoring hook registered");
      }
    }, 100);

    // Clear interval after 10 seconds if not found
    setTimeout(() => {
      clearInterval(waitForPluginManager);
    }, 10000);
  }

  handleInstanceData(instanceArgs) {
    try {
      // Check if monitoring is enabled
      if (!this.get("general.enabled", true)) {
        return;
      }

      const users = instanceArgs.json.userCount;
      const realUsers = instanceArgs.json.n_users - instanceArgs.json.queueSize;
      const invisiblePlayers = realUsers - users;

      if (invisiblePlayers > 0) {
        // Modify instance display name if enabled
        if (this.get("general.modifyInstanceName", true)) {
          instanceArgs.json.invisiblePlayers = invisiblePlayers;
          instanceArgs.json.displayName = `${
            instanceArgs.json.displayName ?? instanceArgs.json.name
          } (${invisiblePlayers} invisible)`;
        }

        // Log to console
        this.logger.warn(
          `Found ${invisiblePlayers} potentially invisible players in instance "${instanceArgs.json.instanceId}" in world "${instanceArgs.json.worldName}"`
        );

        // Show notification if enabled
        if (this.get("notifications.showNotification", true)) {
          // Check if we should only notify on change
          if (
            this.get("notifications.notifyOnlyOnChange", true) &&
            invisiblePlayers === this.lastInvisiblePlayers
          ) {
            return;
          }

          const message = `Found <strong>${invisiblePlayers}</strong> potentially invisible player${
            invisiblePlayers > 1 ? "s" : ""
          }`;

          // Show notification via logger
          this.logger.log(
            message,
            {
              console: false,
              desktop: true,
              xsoverlay: true,
              ovrtoolkit: true,
            },
            "warning"
          );
        }

        this.lastInvisiblePlayers = invisiblePlayers;
      } else {
        // Reset counter when no invisible players
        this.lastInvisiblePlayers = 0;
      }
    } catch (error) {
      this.logger.error("Error handling instance data:", error);
    }
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  /**
   * Get the last detected invisible player count
   * @returns {number} Number of invisible players
   */
  getLastInvisiblePlayersCount() {
    return this.lastInvisiblePlayers;
  }

  /**
   * Manually trigger instance check (for testing)
   */
  async triggerCheck() {
    this.logger.log("Manual instance check triggered");
    // The check will happen automatically on next getInstance call
  }
}

// Export plugin class for PluginLoader
window.customjs.__LAST_PLUGIN_CLASS__ = InvisiblePlayersMonitorPlugin;
