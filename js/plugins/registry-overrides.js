class RegistryOverridesPlugin extends Plugin {
  constructor() {
    super({
      name: "Registry Overrides",
      description:
        "VRChat registry settings management with event-based triggers (disabled by default)",
      author: "Bluscream",
      version: "3.2.0",
      build: "1760363253",
      dependencies: [],
    });

    // Map of event names to handlers
    this.eventHandlers = new Map();
  }

  async load() {
    const SettingType = window.customjs.SettingType;

    // Define settings using new system
    // VRC_ALLOW_UNTRUSTED_URL has been moved to auto-disable-untrusted-urls.js
    const defaultOverrides = {};

    this.settings = this.defineSettings({
      enabled: {
        type: SettingType.BOOLEAN,
        description: "Enable the registry overrides plugin",
        default: false,
      },
      overrides: {
        type: SettingType.CUSTOM,
        description:
          "Dictionary of registry key overrides with their values and trigger events",
        default: defaultOverrides,
      },
    });

    this.logger.log(
      `⚙️ Loaded ${
        Object.keys(this.settings.store.overrides).length
      } registry overrides`
    );

    // Setup event handlers
    this.setupEventHandlers();

    this.logger.log("Registry Overrides plugin ready");
    this.loaded = true;
  }

  async start() {
    if (!this.settings.store.enabled) {
      this.logger.log("Registry Overrides plugin disabled in settings");
      return;
    }

    // Apply registry settings on startup
    await this.applyRegistrySettings("VRCX_START");

    // Setup game state monitoring
    this.setupGameStateMonitoring();

    // Periodic application for keys that need constant enforcement
    const intervalId = this.registerTimer(
      setInterval(async () => {
        if (this.settings.store.enabled) {
          await this.applyRegistrySettings("PERIODIC");
        }
      }, 2500)
    );

    this.enabled = true;
    this.started = true;
    this.logger.log(
      "Registry Overrides plugin started, periodic updates and game monitoring enabled"
    );
  }

  async onLogin(user) {
    // No login-specific logic needed for registry overrides plugin
  }

  async stop() {
    this.logger.log("Stopping Registry Overrides plugin");

    // Cleanup is handled automatically by parent class via subscriptions
    // Parent cleanup will stop the timer and unregister subscriptions automatically
    await super.stop();
  }

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

    this.logger.log("Event handlers registered");
  }

  setupGameStateMonitoring() {
    // Subscribe to game state changes
    this.subscribe("GAME", ({ isGameRunning }) => {
      // Check if game started (changed to true)
      if (isGameRunning && !this._lastGameRunning) {
        this.logger.log("Game started detected");
        this.triggerEvent("GAME_START");
      }

      // Track previous state
      this._lastGameRunning = isGameRunning;
    });
  }

  /**
   * Trigger registry updates for specific events
   * @param {string} eventName - Event name (VRCX_START, GAME_START, etc.)
   */
  triggerEvent(eventName) {
    const handler = this.eventHandlers.get(eventName);
    if (handler) {
      this.logger.log(`Triggering event: ${eventName}`);
      handler();
    } else {
      this.logger.warn(`Unknown event: ${eventName}`);
    }
  }

  /**
   * Apply registry settings from configuration
   * @param {string} triggerEvent - Event that triggered this (VRCX_START, PERIODIC, etc.)
   */
  async applyRegistrySettings(triggerEvent = "PERIODIC") {
    try {
      // Get config from ConfigManager
      const config = this.settings.store.overrides;

      if (!config || Object.keys(config).length === 0) {
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

          this.logger.log(`[${triggerEvent}] ${key}: ${oldVal} → ${value}`);

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
      this.logger.log(`Set registry key ${key} = ${value}`);
      return true;
    } catch (error) {
      this.logger.error(`Error setting registry key ${key}:`, error);
      return false;
    }
  }
}

// Export plugin class for PluginLoader
window.customjs.__LAST_PLUGIN_CLASS__ = RegistryOverridesPlugin;
