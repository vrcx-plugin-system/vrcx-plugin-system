/**
 * ConfigManager System
 *
 * Equicord-inspired settings system adapted for VRCX
 *
 * Storage Structure:
 * - Uses localStorage with "customjs" prefix
 * - Settings organized per plugin: "customjs.pluginId.settingKey"
 * - Supports structured settings definitions with metadata
 * - Change listeners for reactive updates
 *
 * Usage in plugins:
 *
 * // Define settings (Equicord-style)
 * const settings = definePluginSettings({
 *   enabled: {
 *     type: SettingType.BOOLEAN,
 *     description: "Enable the plugin",
 *     default: true
 *   },
 *   apiKey: {
 *     type: SettingType.STRING,
 *     description: "API Key",
 *     placeholder: "Enter your key...",
 *     default: ""
 *   },
 *   volume: {
 *     type: SettingType.SLIDER,
 *     description: "Volume",
 *     default: 0.5,
 *     markers: [0, 0.25, 0.5, 0.75, 1]
 *   },
 *   mode: {
 *     type: SettingType.SELECT,
 *     description: "Mode",
 *     options: [
 *       { label: "Auto", value: "auto", default: true },
 *       { label: "Manual", value: "manual" }
 *     ]
 *   },
 *   messageTemplate: {
 *     type: SettingType.STRING,
 *     description: "Message template",
 *     default: "Hello {userName}!",
 *     variables: {
 *       "{userName}": "User's name",
 *       "{now}": "Current time"
 *     }
 *   },
 *   totalRuns: {
 *     type: SettingType.NUMBER,
 *     description: "Run counter (hidden)",
 *     default: 0,
 *     hidden: true
 *   }
 * }, this); // pass plugin instance
 *
 * // Access settings
 * const enabled = settings.store.enabled; // reactive access
 * const volume = settings.plain.volume;   // non-reactive access
 *
 * // Listen to changes
 * settings.onChange("enabled", (newValue) => {
 *   console.log("enabled changed to:", newValue);
 * });
 *
 * // Filter visible/hidden settings
 * const visible = settings.getVisibleSettings(); // Exclude hidden: true
 * const hidden = settings.getHiddenSettings();   // Only hidden: true
 *
 * Global API:
 * - window.customjs.configManager.get(key, defaultValue) - Get value from localStorage
 * - window.customjs.configManager.set(key, value) - Set value in localStorage
 * - window.customjs.SettingType - Enum of setting types
 * - window.customjs.definePluginSettings(def, plugin) - Create settings object
 * - window.customjs.SettingsStore - Settings store class with change tracking
 */

// ============================================================================
// SETTING TYPE ENUM (like Equicord's OptionType)
// ============================================================================

/**
 * Setting type enum - similar to Equicord's OptionType
 */
const SettingType = Object.freeze({
  STRING: "string",
  NUMBER: "number",
  BIGINT: "bigint",
  BOOLEAN: "boolean",
  SELECT: "select",
  SLIDER: "slider",
  COMPONENT: "component", // For future custom UI components
  CUSTOM: "custom", // For arbitrary objects/arrays
});

// ============================================================================
// SETTINGS STORE (Simplified version of Equicord's SettingsStore)
// ============================================================================

/**
 * SettingsStore - Provides proxy-based access to settings with change listeners
 * Simplified version without React - just change notification
 */
class SettingsStore {
  constructor(plain, options = {}) {
    this.plain = plain || {};
    this.options = options;
    this.pathListeners = new Map(); // path -> Set of callbacks
    this.globalListeners = new Set(); // Set of global callbacks

    // Create proxy for reactive access
    this.store = this._makeProxy(this.plain);
  }

  _makeProxy(target, path = "") {
    const self = this;

    return new Proxy(target, {
      get(obj, key) {
        const value = obj[key];
        const fullPath = path ? `${path}.${key}` : key;

        // Check for default value
        if (value === undefined && self.options.getDefaultValue) {
          const defaultValue = self.options.getDefaultValue({
            target: obj,
            key,
            path: fullPath,
          });
          if (defaultValue !== undefined) {
            obj[key] = defaultValue;
            return defaultValue;
          }
        }

        // Recursively proxy nested objects
        if (value && typeof value === "object" && !Array.isArray(value)) {
          return self._makeProxy(value, fullPath);
        }

        return value;
      },

      set(obj, key, value) {
        const oldValue = obj[key];
        if (oldValue === value) return true;

        obj[key] = value;
        const fullPath = path ? `${path}.${key}` : key;

        // Notify listeners
        self._notifyListeners(fullPath, value);

        return true;
      },
    });
  }

  _notifyListeners(path, value) {
    // Notify global listeners
    this.globalListeners.forEach((callback) => {
      try {
        callback(this.plain, path);
      } catch (error) {
        console.error("[SettingsStore] Error in global listener:", error);
      }
    });

    // Notify path-specific listeners
    const listeners = this.pathListeners.get(path);
    if (listeners) {
      listeners.forEach((callback) => {
        try {
          callback(value);
        } catch (error) {
          console.error(
            `[SettingsStore] Error in listener for ${path}:`,
            error
          );
        }
      });
    }
  }

  addChangeListener(path, callback) {
    if (!this.pathListeners.has(path)) {
      this.pathListeners.set(path, new Set());
    }
    this.pathListeners.get(path).add(callback);
  }

  removeChangeListener(path, callback) {
    const listeners = this.pathListeners.get(path);
    if (listeners) {
      listeners.delete(callback);
      if (listeners.size === 0) {
        this.pathListeners.delete(path);
      }
    }
  }

  addGlobalChangeListener(callback) {
    this.globalListeners.add(callback);
  }

  removeGlobalChangeListener(callback) {
    this.globalListeners.delete(callback);
  }

  markAsChanged() {
    this.globalListeners.forEach((cb) => cb(this.plain, ""));
  }
}

// ============================================================================
// DEFINED SETTINGS (like Equicord's definePluginSettings)
// ============================================================================

/**
 * definePluginSettings - Create a settings object with metadata and reactive access
 * @param {object} definition - Settings definition (key -> { type, description, default, hidden, variables, ... })
 * @param {Plugin} plugin - Plugin instance
 * @returns {object} Settings object with store, plain, def, and helper methods
 *
 * Setting Definition Properties:
 * - type: SettingType - Required setting type
 * - description: string - Required description
 * - default: any - Default value
 * - placeholder: string - Placeholder text (STRING only)
 * - markers: number[] - Slider markers (SLIDER only)
 * - options: array - Dropdown options (SELECT only)
 * - hidden: boolean - Hide from UI (still stored)
 * - variables: object - Template variables dict (for STRING templates)
 *   Example: { "{userId}": "The user's ID", "{userName}": "The user's display name" }
 */
function definePluginSettings(definition, plugin) {
  if (!plugin) {
    throw new Error("definePluginSettings requires a plugin instance");
  }

  const pluginId = plugin.metadata?.id || "unknown";

  // Get default values from definition
  const getDefaultValue = ({ key }) => {
    const setting = definition[key];
    if (!setting) return undefined;

    // Check for explicit default
    if ("default" in setting) {
      return setting.default;
    }

    // Check for SELECT type with default option
    if (setting.type === SettingType.SELECT && setting.options) {
      const defaultOption = setting.options.find((opt) => opt.default);
      return defaultOption?.value;
    }

    return undefined;
  };

  // Load existing settings from localStorage
  const loadSettings = () => {
    const settings = {};
    for (const key in definition) {
      const defaultValue = getDefaultValue({ key });
      const storedValue = plugin.get(key, defaultValue);
      settings[key] = storedValue;
    }
    return settings;
  };

  const plainSettings = loadSettings();

  // Create settings store with change listener that saves to localStorage
  const settingsStore = new SettingsStore(plainSettings, {
    getDefaultValue,
  });

  // Auto-save to localStorage on any change
  settingsStore.addGlobalChangeListener((data, path) => {
    // Extract the setting key from the path
    const key = path.split(".")[0];
    if (key && definition[key]) {
      plugin.set(key, data[key]);
    }
  });

  const definedSettings = {
    // Reactive store access
    get store() {
      return settingsStore.store;
    },

    // Non-reactive plain access
    get plain() {
      return settingsStore.plain;
    },

    // Definition metadata
    def: definition,

    // Plugin reference
    pluginName: pluginId,

    // Add change listener
    onChange(key, callback) {
      settingsStore.addChangeListener(key, callback);
    },

    // Remove change listener
    offChange(key, callback) {
      settingsStore.removeChangeListener(key, callback);
    },

    // Reset a setting to default
    reset(key) {
      const defaultValue = getDefaultValue({ key });
      if (defaultValue !== undefined) {
        settingsStore.store[key] = defaultValue;
      }
    },

    // Reset all settings to defaults
    resetAll() {
      for (const key in definition) {
        this.reset(key);
      }
    },

    // Get visible settings (exclude hidden ones)
    getVisibleSettings() {
      const visible = {};
      for (const key in definition) {
        if (!definition[key].hidden) {
          visible[key] = definition[key];
        }
      }
      return visible;
    },

    // Get hidden settings
    getHiddenSettings() {
      const hidden = {};
      for (const key in definition) {
        if (definition[key].hidden) {
          hidden[key] = definition[key];
        }
      }
      return hidden;
    },
  };

  return definedSettings;
}

// ============================================================================
// LEGACY PLUGIN SETTING CLASS (for backward compatibility)
// ============================================================================

/**
 * PluginSetting - Legacy class for backward compatibility
 * Stores metadata and provides get/set methods that use ConfigManager
 * @deprecated Use definePluginSettings instead
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
    this.version = "4.1.1";
    this.build = "1729027200";

    // localStorage key prefix
    this.keyPrefix = "customjs";

    // VRChat config path (fallback)
    this.vrchatConfigPath = "%LOCALAPPDATA%\\VRChat\\VRChat\\config.json";

    console.log(
      `[CJS|ConfigManager] ConfigManager v${this.version} (${this.build}) initialized - Equicord-inspired settings system`
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

  /**
   * Export all settings to VRChat config.json
   * Stores under vrcx.customjs path
   * @returns {Promise<boolean>} Success status
   */
  async exportToVRChatConfig() {
    try {
      console.log("[CJS|ConfigManager] Exporting to VRChat config.json...");

      // Get all customjs settings from localStorage
      const customjsData = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.keyPrefix + ".")) {
          const shortKey = key.substring(this.keyPrefix.length + 1);
          customjsData[shortKey] = this.get(shortKey);
        }
      }

      // Build nested structure for vrcx.customjs
      const vrcxCustomjs = {
        loader: {
          plugins: customjsData.plugins || {},
          loadTimeout: customjsData.loadTimeout || 10000,
        },
        settings: {},
      };

      // Organize plugin settings
      Object.keys(customjsData).forEach((key) => {
        if (key === "plugins" || key === "loadTimeout") {
          return; // Already handled
        }

        // Check if it's a plugin setting (has a dot for plugin.category.setting)
        const parts = key.split(".");
        if (parts.length >= 2) {
          const pluginId = parts[0];
          const settingPath = parts.slice(1).join(".");

          if (!vrcxCustomjs.settings[pluginId]) {
            vrcxCustomjs.settings[pluginId] = {};
          }

          // Build nested structure
          const settingParts = settingPath.split(".");
          let current = vrcxCustomjs.settings[pluginId];

          for (let i = 0; i < settingParts.length - 1; i++) {
            const part = settingParts[i];
            if (!current[part]) {
              current[part] = {};
            }
            current = current[part];
          }

          current[settingParts[settingParts.length - 1]] = customjsData[key];
        }
      });

      // Read current VRChat config
      const currentConfigJson = await window.AppApi.ReadConfigFileSafe();
      const currentConfig = currentConfigJson
        ? JSON.parse(currentConfigJson)
        : {};

      // Merge with vrcx.customjs
      if (!currentConfig.vrcx) {
        currentConfig.vrcx = {};
      }
      currentConfig.vrcx.customjs = vrcxCustomjs;

      // Save back to VRChat config
      await window.AppApi.WriteConfigFile(
        JSON.stringify(currentConfig, null, 2)
      );

      console.log(
        `[CJS|ConfigManager] ✓ Exported ${
          Object.keys(customjsData).length
        } settings to VRChat config.json`
      );
      return {
        success: true,
        settingsCount: Object.keys(customjsData).length,
        filePath: this.vrchatConfigPath,
      };
    } catch (error) {
      console.error(
        "[CJS|ConfigManager] Error exporting to VRChat config:",
        error
      );
      return { success: false, settingsCount: 0, filePath: null };
    }
  }

  /**
   * Import settings from VRChat config.json
   * Reads from vrcx.customjs path
   * @returns {Promise<boolean>} Success status
   */
  async importFromVRChatConfig() {
    try {
      console.log("[CJS|ConfigManager] Importing from VRChat config.json...");

      // Read VRChat config
      const configJson = await window.AppApi.ReadConfigFileSafe();
      if (!configJson) {
        console.warn("[CJS|ConfigManager] VRChat config.json is empty");
        return { success: false, importCount: 0 };
      }

      const config = JSON.parse(configJson);
      const vrcxCustomjs = config?.vrcx?.customjs;

      if (!vrcxCustomjs) {
        console.warn(
          "[CJS|ConfigManager] No vrcx.customjs section in VRChat config"
        );
        return { success: true, importCount: 0 };
      }

      let importCount = 0;

      // Import loader settings
      if (vrcxCustomjs.loader) {
        if (vrcxCustomjs.loader.plugins) {
          this.set("plugins", vrcxCustomjs.loader.plugins);
          importCount++;
        }
        if (vrcxCustomjs.loader.loadTimeout) {
          this.set("loadTimeout", vrcxCustomjs.loader.loadTimeout);
          importCount++;
        }
      }

      // Import plugin settings
      if (vrcxCustomjs.settings) {
        const flattenSettings = (obj, prefix = "") => {
          for (const [key, value] of Object.entries(obj)) {
            const fullKey = prefix ? `${prefix}.${key}` : key;

            if (
              value &&
              typeof value === "object" &&
              !Array.isArray(value) &&
              Object.keys(value).length > 0
            ) {
              // Check if all values are primitives (leaf node)
              const allPrimitives = Object.values(value).every(
                (v) => v === null || typeof v !== "object" || Array.isArray(v)
              );

              if (allPrimitives) {
                // This is a leaf object, store it as-is
                this.set(fullKey, value);
                importCount++;
              } else {
                // Recurse deeper
                flattenSettings(value, fullKey);
              }
            } else {
              // Primitive value, store it
              this.set(fullKey, value);
              importCount++;
            }
          }
        };

        flattenSettings(vrcxCustomjs.settings);
      }

      console.log(
        `[CJS|ConfigManager] ✓ Imported ${importCount} settings from VRChat config.json`
      );
      return { success: true, importCount: importCount };
    } catch (error) {
      console.error(
        "[CJS|ConfigManager] Error importing from VRChat config:",
        error
      );
      return { success: false, importCount: 0 };
    }
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
      description:
        "Equicord-inspired configuration management system for VRCX Custom",
      author: "Bluscream",
      version: "4.1.1",
      build: "1729027200",
    });
  }

  async load() {
    this.log("Loading ConfigManager module...");

    // Export classes and functions globally
    window.customjs = window.customjs || {};

    // New Equicord-style API
    window.customjs.SettingType = SettingType;
    window.customjs.SettingsStore = SettingsStore;
    window.customjs.definePluginSettings = definePluginSettings;

    // Legacy API (backward compatibility)
    window.customjs.PluginSetting = PluginSetting;
    window.customjs.ConfigManager = ConfigManager;
    window.customjs.configManager = new ConfigManager();

    this.loaded = true;
    this.log("✓ ConfigManager v4.0 loaded with Equicord-style settings system");
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
