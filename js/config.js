/**
 * ConfigManager System
 *
 * A simplified localStorage wrapper for VRCX custom plugins.
 *
 * Storage Structure:
 * - Each setting is stored as individual localStorage key/value pair
 * - Plugin settings: "customjs.pluginId.key" → value
 * - General settings: "customjs.category.key" → value
 * - Plugin config: "customjs.plugins" → {url: enabled}
 *
 * Usage in plugins:
 *
 * // Simple usage (auto-prepends plugin ID):
 * const message = this.get("message", "default value");
 * this.set("message", "new value");
 *
 * // With PluginSetting for metadata:
 * this.config.myMessage = new PluginSetting({
 *   key: "message",
 *   category: "general",
 *   name: "Custom Message",
 *   description: "Message to display",
 *   type: "string",
 *   defaultValue: "Hello"
 * });
 * const message = this.config.myMessage.get();
 * this.config.myMessage.set("New value");
 *
 * Global API:
 * - window.customjs.configManager.get(key, defaultValue) - Get value from localStorage
 * - window.customjs.configManager.set(key, value) - Set value in localStorage
 * - window.customjs.configManager.delete(key) - Delete value from localStorage
 * - window.customjs.configManager.clear(prefix) - Clear all keys with prefix
 */

// ============================================================================
// PLUGIN SETTING CLASS
// ============================================================================

/**
 * PluginSetting - Metadata wrapper for plugin settings
 * Stores metadata and provides get/set methods that use ConfigManager
 */
class PluginSetting {
  /**
   * Create a new plugin setting
   * @param {object} options - Setting configuration
   * @param {string} options.key - Setting key
   * @param {string} options.category - Category (e.g., "general", "notifications")
   * @param {string} options.name - Display name
   * @param {string} options.description - Description text
   * @param {string} options.type - Type (string, number, boolean, object, array)
   * @param {any} options.defaultValue - Default value
   * @param {Plugin} options.plugin - Plugin instance (required for get/set)
   */
  constructor(options = {}) {
    this.key = options.key || "unknown";
    this.category = options.category || "";
    this.name = options.name || this.key;
    this.description = options.description || "";
    this.type = options.type || "string";
    this.defaultValue = options.defaultValue;
    this.plugin = options.plugin;

    if (!this.plugin) {
      console.warn(
        "[PluginSetting] No plugin instance provided - get/set will not work"
      );
    }
  }

  /**
   * Get the full storage key (category.key format)
   * @returns {string} Full key for use with ConfigManager
   */
  toKey() {
    return this.category ? `${this.category}.${this.key}` : this.key;
  }

  /**
   * Get the current value from localStorage
   * @returns {any} Current value or default
   */
  get() {
    if (!this.plugin) {
      console.error("[PluginSetting] Cannot get() - no plugin instance");
      return this.defaultValue;
    }
    return this.plugin.get(this.toKey(), this.defaultValue);
  }

  /**
   * Set the value in localStorage
   * @param {any} value - Value to set
   * @returns {boolean} Success status
   */
  set(value) {
    if (!this.plugin) {
      console.error("[PluginSetting] Cannot set() - no plugin instance");
      return false;
    }
    return this.plugin.set(this.toKey(), value);
  }

  /**
   * Check if this setting has been modified from default
   * @returns {boolean} True if modified
   */
  isModified() {
    const current = this.get();
    return JSON.stringify(current) !== JSON.stringify(this.defaultValue);
  }

  /**
   * Reset to default value
   */
  reset() {
    return this.set(this.defaultValue);
  }

  /**
   * Delete this setting from storage
   */
  delete() {
    if (!this.plugin) {
      console.error("[PluginSetting] Cannot delete() - no plugin instance");
      return false;
    }
    return this.plugin.deleteSetting(this.toKey());
  }

  /**
   * Get metadata about this setting
   * @returns {object} Setting metadata
   */
  getMetadata() {
    return {
      key: this.key,
      category: this.category,
      fullKey: this.toKey(),
      name: this.name,
      description: this.description,
      type: this.type,
      defaultValue: this.defaultValue,
      currentValue: this.get(),
      isModified: this.isModified(),
    };
  }
}

// ============================================================================
// CONFIG MANAGER
// ============================================================================

class ConfigManager {
  constructor() {
    this.version = "3.2.0";
    this.build = "1728778800";

    // localStorage key prefix
    this.keyPrefix = "customjs";

    console.log(
      `[CJS|ConfigManager] ConfigManager v${this.version} (${this.build}) initialized (localStorage wrapper)`
    );
  }

  /**
   * Initialize config manager
   * @returns {Promise<void>}
   */
  async init() {
    console.log("[CJS|ConfigManager] ✓ Initialized (localStorage ready)");
  }

  /**
   * Build full localStorage key
   * @param {string} key - Key to store
   * @returns {string} Full key with prefix
   * @private
   */
  _buildKey(key) {
    return `${this.keyPrefix}.${key}`;
  }

  /**
   * Get value from localStorage
   * @param {string} key - Key to get
   * @param {any} defaultValue - Default value if not found
   * @returns {any} Value from storage or default
   */
  get(key, defaultValue = null) {
    try {
      const fullKey = this._buildKey(key);
      const stored = localStorage.getItem(fullKey);

      if (stored === null) {
        return defaultValue;
      }

      // Try to parse as JSON
      try {
        return JSON.parse(stored);
      } catch {
        // If not JSON, return as string
        return stored;
      }
    } catch (error) {
      console.error(`[CJS|ConfigManager] Error getting ${key}:`, error);
      return defaultValue;
    }
  }

  /**
   * Set value in localStorage
   * @param {string} key - Key to set
   * @param {any} value - Value to store
   * @returns {boolean} Success status
   */
  set(key, value) {
    try {
      const fullKey = this._buildKey(key);

      // Store as JSON
      const jsonValue = JSON.stringify(value);
      localStorage.setItem(fullKey, jsonValue);

      return true;
    } catch (error) {
      console.error(`[CJS|ConfigManager] Error setting ${key}:`, error);
      return false;
    }
  }

  /**
   * Delete value from localStorage
   * @param {string} key - Key to delete
   * @returns {boolean} Success status
   */
  delete(key) {
    try {
      const fullKey = this._buildKey(key);
      localStorage.removeItem(fullKey);
      return true;
    } catch (error) {
      console.error(`[CJS|ConfigManager] Error deleting ${key}:`, error);
      return false;
    }
  }

  /**
   * Check if key exists
   * @param {string} key - Key to check
   * @returns {boolean} True if key exists
   */
  has(key) {
    const fullKey = this._buildKey(key);
    return localStorage.getItem(fullKey) !== null;
  }

  /**
   * Clear all keys with a prefix
   * @param {string} prefix - Prefix to match (without "customjs.")
   */
  clear(prefix = "") {
    const searchKey = prefix ? this._buildKey(prefix) : this.keyPrefix;
    const keysToDelete = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(searchKey)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach((key) => localStorage.removeItem(key));
    console.log(
      `[CJS|ConfigManager] Cleared ${keysToDelete.length} keys with prefix: ${searchKey}`
    );
  }

  /**
   * Get all keys with a prefix
   * @param {string} prefix - Prefix to match (without "customjs.")
   * @returns {string[]} Array of keys (without prefix)
   */
  keys(prefix = "") {
    const searchKey = prefix ? this._buildKey(prefix) : this.keyPrefix;
    const keys = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(searchKey + ".")) {
        // Remove the full prefix to return just the key part
        keys.push(key.substring(searchKey.length + 1));
      }
    }

    return keys;
  }

  /**
   * Get plugin configuration
   * @param {string} pluginId - Optional plugin ID to get all settings for
   * @returns {object} Plugin config (if no ID: url -> enabled mapping, if ID: all settings)
   * @example
   * // Get loader config (which plugins are enabled)
   * const loaderConfig = configManager.getPluginConfig();
   * // Returns: { "http://...plugin1.js": true, "http://...plugin2.js": false }
   *
   * // Get all settings for a specific plugin
   * const settings = configManager.getPluginConfig("yoinker-detector");
   * // Returns: { general: { enabled: true }, notifications: { ... } }
   */
  getPluginConfig(pluginId = null) {
    // If no plugin ID, return loader config (url -> enabled)
    if (!pluginId) {
      return this.get("plugins", {});
    }

    // Get all keys for this plugin and build nested object
    const prefix = `${pluginId}.`;
    const result = {};

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(`${this.keyPrefix}.${prefix}`)) {
        // Remove prefix to get the setting path
        const settingPath = key.substring(`${this.keyPrefix}.${prefix}`.length);

        // Parse the value
        let value;
        try {
          value = JSON.parse(localStorage.getItem(key));
        } catch {
          value = localStorage.getItem(key);
        }

        // Build nested object structure
        const parts = settingPath.split(".");
        let current = result;

        for (let j = 0; j < parts.length - 1; j++) {
          const part = parts[j];
          if (!current[part]) {
            current[part] = {};
          }
          current = current[part];
        }

        current[parts[parts.length - 1]] = value;
      }
    }

    return result;
  }

  /**
   * Set plugin configuration (url -> enabled mapping)
   * @param {object} config - Plugin config
   */
  setPluginConfig(config) {
    this.set("plugins", config);
  }

  /**
   * Export all settings to JSON string
   * @returns {string} JSON string of all settings
   */
  export() {
    const data = {};

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this.keyPrefix + ".")) {
        const shortKey = key.substring(this.keyPrefix.length + 1);
        try {
          data[shortKey] = JSON.parse(localStorage.getItem(key));
        } catch {
          data[shortKey] = localStorage.getItem(key);
        }
      }
    }

    return JSON.stringify(data, null, 2);
  }

  /**
   * Import settings from JSON string
   * @param {string} jsonString - JSON string to import
   * @returns {boolean} Success status
   */
  import(jsonString) {
    try {
      const data = JSON.parse(jsonString);

      Object.entries(data).forEach(([key, value]) => {
        this.set(key, value);
      });

      console.log(
        `[CJS|ConfigManager] Imported ${Object.keys(data).length} settings`
      );
      return true;
    } catch (error) {
      console.error("[CJS|ConfigManager] Error importing settings:", error);
      return false;
    }
  }

  /**
   * Get debug info
   * @returns {object} Debug information
   */
  debug() {
    const keys = [];
    const data = {};

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this.keyPrefix + ".")) {
        keys.push(key);
        const shortKey = key.substring(this.keyPrefix.length + 1);
        try {
          data[shortKey] = JSON.parse(localStorage.getItem(key));
        } catch {
          data[shortKey] = localStorage.getItem(key);
        }
      }
    }

    return {
      version: this.version,
      build: this.build,
      prefix: this.keyPrefix,
      keyCount: keys.length,
      keys: keys,
      data: data,
    };
  }
}

// ============================================================================
// CONFIG CORE MODULE
// ============================================================================

/**
 * ConfigModule - Core module that provides the ConfigManager
 */
class ConfigModule extends window.customjs.CoreModule {
  constructor() {
    super({
      id: "config",
      name: "ConfigManager",
      description: "Configuration management system for VRCX Custom",
      author: "Bluscream",
      version: "3.2.0",
      build: "1728778800",
    });
  }

  async load() {
    this.log("Loading ConfigManager module...");

    // Export classes globally
    window.customjs = window.customjs || {};
    window.customjs.PluginSetting = PluginSetting;
    window.customjs.ConfigManager = ConfigManager;
    window.customjs.configManager = new ConfigManager();

    this.loaded = true;
    this.log(
      "✓ ConfigManager and PluginSetting classes loaded and instance created"
    );
  }

  async start() {
    this.log("Starting ConfigManager module...");

    // Initialize the configManager
    if (window.customjs?.configManager) {
      await window.customjs.configManager.init();
    }

    this.started = true;
    this.log("✓ ConfigManager module started");
  }
}

// Export classes and auto-instantiate core module
if (typeof window !== "undefined") {
  new ConfigModule();
}
