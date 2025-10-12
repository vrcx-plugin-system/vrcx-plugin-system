// ============================================================================
// REGISTRY OVERRIDES PLUGIN
// Version: 2.0.0
// Build: 1728668400
// ============================================================================

/**
 * Registry Overrides Plugin
 * VRChat registry settings management with event-based triggers
 * Allows setting registry keys based on specific events
 */
class RegistryOverridesPlugin extends Plugin {
  constructor() {
    super({
      name: "Registry Overrides",
      description:
        "VRChat registry settings management with event-based triggers",
      author: "Bluscream",
      version: "2.0.0",
      build: "1728668400",
      dependencies: [
        "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/Plugin.js",
        "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/plugins/config.js",
      ],
    });

    // Map of event names to handlers
    this.eventHandlers = new Map();
  }

  async load() {
    // Setup event handlers
    this.setupEventHandlers();

    this.log("Registry Overrides plugin ready");
    this.loaded = true;
  }

  async start() {
    // Apply registry settings on startup
    await this.applyRegistrySettings("VRCX_START");

    // Periodic application for keys that need constant enforcement
    const intervalId = this.registerTimer(
      setInterval(async () => {
        await this.applyRegistrySettings("PERIODIC");
      }, 2500)
    );

    this.enabled = true;
    this.started = true;
    this.log("Registry Overrides plugin started, periodic updates enabled");
  }

  async onLogin(user) {
    // No login-specific logic needed for registry overrides plugin
  }

  async stop() {
    this.log("Stopping Registry Overrides plugin");

    // Parent cleanup will stop the timer automatically
    await super.stop();
  }

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  setupEventHandlers() {
    // Set up event handlers for different VRCX events
    this.eventHandlers.set("VRCX_START", () =>
      this.applyRegistrySettings("VRCX_START")
    );
    this.eventHandlers.set("GAME_START", () =>
      this.applyRegistrySettings("GAME_START")
    );
    this.eventHandlers.set("INSTANCE_SWITCH_PUBLIC", () =>
      this.applyRegistrySettings("INSTANCE_SWITCH_PUBLIC")
    );
    this.eventHandlers.set("INSTANCE_SWITCH_PRIVATE", () =>
      this.applyRegistrySettings("INSTANCE_SWITCH_PRIVATE")
    );

    this.log("Event handlers registered");
  }

  /**
   * Trigger registry updates for specific events
   * @param {string} eventName - Event name (VRCX_START, GAME_START, etc.)
   */
  triggerEvent(eventName) {
    const handler = this.eventHandlers.get(eventName);
    if (handler) {
      this.log(`Triggering event: ${eventName}`);
      handler();
    } else {
      this.warn(`Unknown event: ${eventName}`);
    }
  }

  // ============================================================================
  // REGISTRY MANAGEMENT
  // ============================================================================

  /**
   * Apply registry settings from configuration
   * @param {string} triggerEvent - Event that triggered this (VRCX_START, PERIODIC, etc.)
   */
  async applyRegistrySettings(triggerEvent = "PERIODIC") {
    try {
      // Get config from global namespace
      const config = this.getConfig("registry", {});

      if (Object.keys(config).length === 0) {
        return; // No registry settings configured
      }

      // Apply all registry settings from config
      for (const [key, configValue] of Object.entries(config)) {
        try {
          let value, events;

          // Handle both simple key-value format and object format
          if (
            typeof configValue === "object" &&
            configValue !== null &&
            configValue.value !== undefined
          ) {
            // Object format: { value: X, events: [...] }
            value = configValue.value;
            events = configValue.events || ["PERIODIC"];
          } else {
            // Simple format - apply on all events
            value = configValue;
            events = ["PERIODIC"];
          }

          // Check if this key should be applied for the current event
          if (!events.includes(triggerEvent) && !events.includes("PERIODIC")) {
            continue;
          }

          // Get old value
          const oldVal = await window.AppApi.GetVRChatRegistryKey(key);

          // Skip if value is already correct
          if (oldVal === value) {
            continue;
          }

          this.log(`[${triggerEvent}] ${key}: ${oldVal} → ${value}`);

          // Determine the registry type based on the value type
          let registryType = 3; // Default to REG_DWORD
          if (typeof value === "string") {
            registryType = 1; // REG_SZ for strings
          } else if (typeof value === "number") {
            registryType = 3; // REG_DWORD for numbers
          }

          // Apply registry setting
          await window.AppApi.SetVRChatRegistryKey(key, value, registryType);
        } catch (error) {
          this.error(`Error setting registry key ${key}:`, error);
        }
      }
    } catch (error) {
      this.error("Error applying registry settings:", error);
    }
  }

  /**
   * Get current registry value
   * @param {string} key - Registry key name
   * @returns {Promise<any>} Current value
   */
  async getRegistryValue(key) {
    try {
      return await window.AppApi.GetVRChatRegistryKey(key);
    } catch (error) {
      this.error(`Error getting registry key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set registry value
   * @param {string} key - Registry key name
   * @param {any} value - Value to set
   * @param {number} type - Registry type (1=REG_SZ, 3=REG_DWORD)
   */
  async setRegistryValue(key, value, type = 3) {
    try {
      await window.AppApi.SetVRChatRegistryKey(key, value, type);
      this.log(`Set registry key ${key} = ${value}`);
      return true;
    } catch (error) {
      this.error(`Error setting registry key ${key}:`, error);
      return false;
    }
  }
}

// Export plugin class for PluginLoader
window.__LAST_PLUGIN_CLASS__ = RegistryOverridesPlugin;
