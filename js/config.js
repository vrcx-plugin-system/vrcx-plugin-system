/**
 * ConfigManager System
 *
 * A centralized configuration management system for VRCX custom plugins.
 *
 * Config Structure:
 * vrcx.customjs:
 *   - loader: {} - Loader configuration (plugins { url: enabled }, loadTimeout)
 *   - settings: {} - Plugin settings (pluginId -> category -> setting)
 *   - logger: {} - Logger settings (webhook, etc.)
 *   - [other general categories]: {} - Non-plugin settings
 *
 * Features:
 * - Store plugin settings in VRChat's config.json under vrcx.customjs.settings
 * - Store general settings (logger, etc.) in vrcx.customjs.*
 * - Settings are stored in plugin instances (plugin.config.category.setting)
 * - Proxied to global namespace (window.customjs.config.settings.pluginId.category.setting)
 * - Only non-default settings are saved to disk
 * - Automatic type validation
 * - Category organization for settings
 *
 * Usage in plugins:
 *
 * // In plugin's load() method:
 * this.registerSettingCategory("general", "General Settings", "Basic configuration");
 * this.registerSetting("general", "enabled", "Enable Feature", "boolean", true, "Enable main feature");
 *
 * // Access settings:
 * console.log(this.config.general.enabled.value);  // From plugin instance (PluginSetting object)
 * console.log(this.config.general.enabled.defaultValue);  // Access metadata
 * console.log(window.customjs.config.settings.myplugin.general.enabled);  // Direct value from global
 *
 * // Modify settings:
 * this.config.general.enabled.value = false;
 *
 * // Save to disk (only modified settings):
 * await this.saveSettings();
 *
 * Usage for general settings (not tied to a plugin):
 *
 * // Register general category and setting:
 * window.customjs.configManager.registerGeneralCategory("logger", "Logger Settings", "Configuration for logging");
 * window.customjs.configManager.registerGeneralSetting("logger", "webhook", "Webhook URL", "string", "http://...", "Webhook URL");
 *
 * // Access general settings:
 * console.log(window.customjs.config.logger.webhook);
 *
 * Global API:
 * - window.customjs.configManager.save() - Save all settings to disk
 * - window.customjs.configManager.load() - Load settings from disk
 * - window.customjs.configManager.reset(pluginId?) - Reset to defaults
 * - window.customjs.configManager.debug() - Get full config structure
 */

class PluginSetting {
  /**
   * Create a new plugin setting
   * @param {string} pluginId - Plugin ID this setting belongs to
   * @param {string} category - Category key
   * @param {string} key - Setting key
   * @param {string} name - Display name
   * @param {string} type - Type (string, number, boolean, object, array)
   * @param {any} defaultValue - Default value
   * @param {string} description - Optional description
   */
  constructor(
    pluginId,
    category,
    key,
    name,
    type,
    defaultValue,
    description = ""
  ) {
    this.pluginId = pluginId;
    this.category = category;
    this.key = key;
    this.name = name;
    this.type = type;
    this.defaultValue = defaultValue;
    this.description = description;
    this._value = defaultValue;
  }

  get value() {
    return this._value;
  }

  set value(newValue) {
    // Type validation
    const actualType = Array.isArray(newValue) ? "array" : typeof newValue;
    if (
      actualType !== this.type &&
      newValue !== null &&
      newValue !== undefined
    ) {
      console.warn(
        `[CJS|ConfigManager] Type mismatch for ${this.pluginId}.${this.category}.${this.key}: expected ${this.type}, got ${actualType}`
      );
    }
    this._value = newValue;

    // Note: No need to call _updateProxy here because the proxy getter
    // already reads directly from setting.value, so they're automatically synced.
    // Calling _updateProxy would cause infinite recursion.
  }

  /**
   * Check if value is different from default
   * @returns {boolean}
   */
  isModified() {
    return JSON.stringify(this._value) !== JSON.stringify(this.defaultValue);
  }

  /**
   * Reset to default value
   */
  reset() {
    this._value = this.defaultValue;
  }

  /**
   * Get serializable object (only non-default values)
   * @returns {any|null}
   */
  toJSON() {
    return this.isModified() ? this._value : null;
  }
}

class ConfigManager {
  constructor() {
    this.version = "1.6.1";
    this.build = "1760486400";

    // Store setting definitions and categories
    this.categories = new Map(); // pluginId -> Map(categoryKey -> {name, description})
    this.settings = new Map(); // pluginId -> Map(categoryKey -> Map(settingKey -> PluginSetting))

    // Store general (non-plugin) settings
    this.generalCategories = new Map(); // categoryKey -> {name, description}
    this.generalSettings = new Map(); // categoryKey -> Map(settingKey -> PluginSetting)

    // Store plugin configuration (url -> enabled)
    this.pluginConfig = null;

    // Saving state
    this.isSaving = false;
    this.saveQueued = false;

    console.log(
      `[CJS|ConfigManager] ConfigManager v${this.version} (${this.build}) initialized`
    );
  }

  /**
   * Initialize config manager - load from disk
   * @returns {Promise<void>}
   */
  async init() {
    try {
      await this.load();
      this._setupProxies();
      console.log("[CJS|ConfigManager] ✓ Initialized and loaded config");
    } catch (error) {
      console.error("[CJS|ConfigManager] Error initializing:", error);
    }
  }

  /**
   * Register a general (non-plugin) setting category
   * @param {string} key - Category key (e.g., "logger")
   * @param {string} name - Display name
   * @param {string} description - Description
   */
  registerGeneralCategory(key, name, description = "") {
    this.generalCategories.set(key, { name, description });
    console.log(
      `[CJS|ConfigManager] Registered general category: ${key} (${name})`
    );
  }

  /**
   * Register a general (non-plugin) setting
   * @param {string} categoryKey - Category key
   * @param {string} key - Setting key
   * @param {string} name - Display name
   * @param {string} type - Type (string, number, boolean, object, array)
   * @param {any} defaultValue - Default value
   * @param {string} description - Optional description
   */
  registerGeneralSetting(
    categoryKey,
    key,
    name,
    type,
    defaultValue,
    description = ""
  ) {
    // Ensure category exists
    if (!this.generalSettings.has(categoryKey)) {
      this.generalSettings.set(categoryKey, new Map());
    }

    // Create setting (use null as pluginId for general settings)
    const setting = new PluginSetting(
      null,
      categoryKey,
      key,
      name,
      type,
      defaultValue,
      description
    );

    this.generalSettings.get(categoryKey).set(key, setting);

    // Initialize in global config and set up proxy
    window.customjs.config = window.customjs.config || {};
    if (!window.customjs.config[categoryKey]) {
      window.customjs.config[categoryKey] = {};
    }

    Object.defineProperty(window.customjs.config[categoryKey], key, {
      get: () => setting.value,
      set: (newValue) => {
        setting.value = newValue;
      },
      enumerable: true,
      configurable: true,
    });

    console.log(
      `[CJS|ConfigManager] Registered general setting: ${categoryKey}.${key} (${type})`
    );
  }

  /**
   * Register a setting category for a plugin
   * @param {object} plugin - Plugin instance
   * @param {string} key - Category key
   * @param {string} name - Display name
   * @param {string} description - Description
   */
  registerPluginSettingCategory(plugin, key, name, description = "") {
    // Get plugin ID from plugin instance
    const pluginId = plugin?.metadata?.id;
    if (!pluginId) {
      console.error(
        "[CJS|ConfigManager] Invalid plugin instance passed to registerPluginSettingCategory"
      );
      return;
    }

    if (!this.categories.has(pluginId)) {
      this.categories.set(pluginId, new Map());
    }

    this.categories.get(pluginId).set(key, { name, description });
    console.log(
      `[CJS|ConfigManager] Registered category: ${pluginId}.${key} (${name})`
    );
  }

  /**
   * Register a setting for a plugin
   * @param {object} plugin - Plugin instance
   * @param {string} categoryKey - Category key
   * @param {string} key - Setting key
   * @param {string} name - Display name
   * @param {string} type - Type (string, number, boolean, object, array)
   * @param {any} defaultValue - Default value
   * @param {string} description - Optional description
   */
  registerPluginSetting(
    plugin,
    categoryKey,
    key,
    name,
    type,
    defaultValue,
    description = ""
  ) {
    // Get plugin ID and instance
    const pluginId = plugin?.metadata?.id;
    const pluginInstance = plugin;

    if (!pluginId) {
      console.error(
        "[CJS|ConfigManager] Invalid plugin instance passed to registerPluginSetting"
      );
      return;
    }

    // Ensure plugin has settings storage
    if (!this.settings.has(pluginId)) {
      this.settings.set(pluginId, new Map());
    }
    if (!this.settings.get(pluginId).has(categoryKey)) {
      this.settings.get(pluginId).set(categoryKey, new Map());
    }

    // Create setting
    const setting = new PluginSetting(
      pluginId,
      categoryKey,
      key,
      name,
      type,
      defaultValue,
      description
    );

    this.settings.get(pluginId).get(categoryKey).set(key, setting);

    // Initialize plugin.config if needed
    if (!pluginInstance.config) {
      pluginInstance.config = {};
    }
    if (!pluginInstance.config[categoryKey]) {
      pluginInstance.config[categoryKey] = {};
    }

    // Store reference to the PluginSetting object (not just the value)
    // This allows access to metadata like .defaultValue, .isModified(), etc.
    pluginInstance.config[categoryKey][key] = setting;

    // Set up global proxy immediately
    window.customjs.config = window.customjs.config || {};
    window.customjs.config.settings = window.customjs.config.settings || {};
    window.customjs.config.settings[pluginId] =
      window.customjs.config.settings[pluginId] || {};
    window.customjs.config.settings[pluginId][categoryKey] =
      window.customjs.config.settings[pluginId][categoryKey] || {};

    Object.defineProperty(
      window.customjs.config.settings[pluginId][categoryKey],
      key,
      {
        get: () => setting.value,
        set: (newValue) => {
          setting.value = newValue;
        },
        enumerable: true,
        configurable: true,
      }
    );

    console.log(
      `[CJS|ConfigManager] Registered setting: ${pluginId}.${categoryKey}.${key} (${type})`
    );
  }

  /**
   * Update the proxy at window.customjs.config when a setting value changes
   * @param {PluginSetting} setting - The setting that changed
   * @private
   * @deprecated Currently unused - proxy getters read directly from setting.value
   * Kept for potential future use, but calling this causes infinite recursion
   */
  _updateProxy(setting) {
    const { pluginId, category, key, value } = setting;

    window.customjs.config = window.customjs.config || {};

    // General settings (no pluginId)
    if (!pluginId) {
      window.customjs.config[category] = window.customjs.config[category] || {};
      window.customjs.config[category][key] = value;
      return;
    }

    // Plugin settings
    window.customjs.config.settings = window.customjs.config.settings || {};
    window.customjs.config.settings[pluginId] =
      window.customjs.config.settings[pluginId] || {};
    window.customjs.config.settings[pluginId][category] =
      window.customjs.config.settings[pluginId][category] || {};

    // Update value
    window.customjs.config.settings[pluginId][category][key] = value;
  }

  /**
   * Setup proxy for all registered settings at window.customjs.config
   * @private
   */
  _setupProxies() {
    window.customjs.config = window.customjs.config || {};
    window.customjs.config.settings = window.customjs.config.settings || {};

    // Setup proxies for plugin settings
    this.settings.forEach((categories, pluginId) => {
      window.customjs.config.settings[pluginId] =
        window.customjs.config.settings[pluginId] || {};

      categories.forEach((settings, categoryKey) => {
        window.customjs.config.settings[pluginId][categoryKey] =
          window.customjs.config.settings[pluginId][categoryKey] || {};

        settings.forEach((setting, settingKey) => {
          // Create getter/setter proxy for direct value access
          Object.defineProperty(
            window.customjs.config.settings[pluginId][categoryKey],
            settingKey,
            {
              get: () => setting.value,
              set: (newValue) => {
                // Directly update the setting value
                // Proxy getter reads from setting.value, so they stay in sync
                setting.value = newValue;
              },
              enumerable: true,
              configurable: true,
            }
          );
        });
      });
    });

    // Setup proxies for general settings
    this.generalSettings.forEach((settings, categoryKey) => {
      window.customjs.config[categoryKey] =
        window.customjs.config[categoryKey] || {};

      settings.forEach((setting, settingKey) => {
        Object.defineProperty(window.customjs.config[categoryKey], settingKey, {
          get: () => setting.value,
          set: (newValue) => {
            setting.value = newValue;
          },
          enumerable: true,
          configurable: true,
        });
      });
    });

    console.log("[CJS|ConfigManager] ✓ Setup proxies for all settings");
  }

  /**
   * Get a setting value
   * @param {string} pluginId
   * @param {string} categoryKey
   * @param {string} key
   * @param {any} defaultValue - Fallback if setting not found
   * @returns {any}
   */
  get(pluginId, categoryKey, key, defaultValue = null) {
    const setting = this.settings.get(pluginId)?.get(categoryKey)?.get(key);
    return setting ? setting : defaultValue;
  }

  /**
   * Set a setting value
   * @param {string} pluginId
   * @param {string} categoryKey
   * @param {string} key
   * @param {any} value
   * @returns {boolean} Success
   */
  set(pluginId, categoryKey, key, value) {
    const setting = this.settings.get(pluginId)?.get(categoryKey)?.get(key);

    if (!setting) {
      console.warn(
        `[CJS|ConfigManager] Setting not found: ${pluginId}.${categoryKey}.${key}`
      );
      return false;
    }

    // Setting the value will automatically update the proxy via the setter
    setting.value = value;

    return true;
  }

  /**
   * Get plugin configuration from memory
   * @returns {object|null} - { url: enabled } mapping
   */
  getPluginConfig() {
    return this.pluginConfig || null;
  }

  /**
   * Set plugin configuration in memory
   * @param {object} config - { url: enabled } mapping
   */
  setPluginConfig(config) {
    this.pluginConfig = config;
  }

  /**
   * Load config from VRChat's config.json
   * @returns {Promise<void>}
   */
  async load() {
    try {
      if (!window.AppApi?.ReadConfigFileSafe) {
        console.warn(
          "[CJS|ConfigManager] AppApi.ReadConfigFileSafe not available"
        );
        return;
      }

      const configJson = await window.AppApi.ReadConfigFileSafe();
      if (!configJson) {
        console.log(
          "[CJS|ConfigManager] No config file found or empty, using defaults"
        );
        return;
      }

      const config = JSON.parse(configJson);
      const customjsRoot = config?.vrcx?.customjs;

      if (!customjsRoot) {
        console.log("[CJS|ConfigManager] No customjs config found in file");
        return;
      }

      let loadedCount = 0;

      // Load plugin settings from vrcx.customjs.settings (new structure)
      const pluginSettings = customjsRoot.settings;
      if (pluginSettings) {
        Object.keys(pluginSettings).forEach((pluginId) => {
          const pluginConfig = pluginSettings[pluginId];
          Object.keys(pluginConfig).forEach((categoryKey) => {
            const categoryConfig = pluginConfig[categoryKey];
            Object.keys(categoryConfig).forEach((settingKey) => {
              const value = categoryConfig[settingKey];
              const setting = this.settings
                .get(pluginId)
                ?.get(categoryKey)
                ?.get(settingKey);

              if (setting) {
                setting.value = value;
                loadedCount++;
              }
            });
          });
        });
      }

      // Load general settings (logger, etc.) from vrcx.customjs.*
      this.generalCategories.forEach((categoryInfo, categoryKey) => {
        const categoryConfig = customjsRoot[categoryKey];
        if (categoryConfig && typeof categoryConfig === "object") {
          const categorySettings = this.generalSettings.get(categoryKey);
          if (categorySettings) {
            Object.keys(categoryConfig).forEach((settingKey) => {
              const value = categoryConfig[settingKey];
              const setting = categorySettings.get(settingKey);
              if (setting) {
                setting.value = value;
                loadedCount++;
              }
            });
          }
        }
      });

      // Load plugin config from vrcx.customjs.loader.plugins (object with url: enabled)
      if (
        customjsRoot.loader?.plugins &&
        typeof customjsRoot.loader.plugins === "object"
      ) {
        this.pluginConfig = customjsRoot.loader.plugins;
        console.log(
          `[CJS|ConfigManager] ✓ Loaded plugin configuration with ${
            Object.keys(customjsRoot.loader.plugins).length
          } entries`
        );
      }

      console.log(
        `[CJS|ConfigManager] ✓ Loaded ${loadedCount} settings from disk`
      );
    } catch (error) {
      console.error("[CJS|ConfigManager] Error loading config:", error);
    }
  }

  /**
   * Save config to VRChat's config.json (only non-default settings)
   * @returns {Promise<void>}
   */
  async save() {
    if (this.isSaving) {
      this.saveQueued = true;
      console.log("[CJS|ConfigManager] Save already in progress, queuing...");
      return;
    }

    this.isSaving = true;

    try {
      if (
        !window.AppApi?.ReadConfigFileSafe ||
        !window.AppApi?.WriteConfigFile
      ) {
        console.error(
          "[CJS|ConfigManager] AppApi methods not available for saving"
        );
        return;
      }

      // Read current config
      const configJson = await window.AppApi.ReadConfigFileSafe();
      const config = configJson ? JSON.parse(configJson) : {};

      // Ensure structure exists
      config.vrcx = config.vrcx || {};
      config.vrcx.customjs = config.vrcx.customjs || {};
      config.vrcx.customjs.loader = config.vrcx.customjs.loader || {};

      // Save plugin configuration (url -> enabled mapping)
      if (this.pluginConfig) {
        config.vrcx.customjs.loader.plugins = this.pluginConfig;
      }

      // Initialize settings section
      config.vrcx.customjs.settings = config.vrcx.customjs.settings || {};

      // Build plugin settings (save only non-default settings)
      let savedCount = 0;
      this.settings.forEach((categories, pluginId) => {
        categories.forEach((settings, categoryKey) => {
          settings.forEach((setting, settingKey) => {
            // Only save modified settings
            if (setting.isModified()) {
              // Ensure structure exists
              config.vrcx.customjs.settings[pluginId] =
                config.vrcx.customjs.settings[pluginId] || {};
              config.vrcx.customjs.settings[pluginId][categoryKey] =
                config.vrcx.customjs.settings[pluginId][categoryKey] || {};

              config.vrcx.customjs.settings[pluginId][categoryKey][settingKey] =
                setting.value;
              savedCount++;
            }
          });
        });
      });

      // Save general settings (logger, loader, etc.) - save only non-default settings
      this.generalSettings.forEach((settings, categoryKey) => {
        settings.forEach((setting, settingKey) => {
          // Only save modified settings
          if (setting.isModified()) {
            // Ensure structure exists
            config.vrcx.customjs[categoryKey] =
              config.vrcx.customjs[categoryKey] || {};

            config.vrcx.customjs[categoryKey][settingKey] = setting.value;
            savedCount++;
          }
        });
      });

      // Write to disk
      const configString = JSON.stringify(config, null, 2);
      await window.AppApi.WriteConfigFile(configString);

      console.log(`[CJS|ConfigManager] ✓ Saved ${savedCount} settings to disk`);
    } catch (error) {
      console.error("[CJS|ConfigManager] Error saving config:", error);
    } finally {
      this.isSaving = false;

      // If save was queued while we were saving, save again
      if (this.saveQueued) {
        this.saveQueued = false;
        setTimeout(() => this.save(), 100);
      }
    }
  }

  /**
   * Reset all settings to defaults
   * @param {string} pluginId - Optional, reset only this plugin's settings
   */
  reset(pluginId = null) {
    if (pluginId) {
      const categories = this.settings.get(pluginId);
      if (categories) {
        categories.forEach((settings) => {
          settings.forEach((setting) => setting.reset());
        });
        console.log(`[CJS|ConfigManager] ✓ Reset settings for ${pluginId}`);
      }
    } else {
      this.settings.forEach((categories) => {
        categories.forEach((settings) => {
          settings.forEach((setting) => setting.reset());
        });
      });
      console.log("[CJS|ConfigManager] ✓ Reset all settings to defaults");
    }
  }

  /**
   * Get all settings for a plugin
   * @param {string} pluginId
   * @returns {object}
   */
  getPluginSettings(pluginId) {
    const result = {};
    const categories = this.settings.get(pluginId);

    if (!categories) return result;

    categories.forEach((settings, categoryKey) => {
      result[categoryKey] = {};
      settings.forEach((setting, settingKey) => {
        result[categoryKey][settingKey] = {
          name: setting.name,
          type: setting.type,
          value: setting.value,
          defaultValue: setting.defaultValue,
          description: setting.description,
          isModified: setting.isModified(),
        };
      });
    });

    return result;
  }

  /**
   * Get all categories for a plugin
   * @param {string} pluginId
   * @returns {object}
   */
  getPluginCategories(pluginId) {
    const result = {};
    const categories = this.categories.get(pluginId);

    if (!categories) return result;

    categories.forEach((category, key) => {
      result[key] = category;
    });

    return result;
  }

  /**
   * Get complete config structure for debugging
   * @returns {object}
   */
  debug() {
    const result = {
      pluginConfig: this.pluginConfig || {},
      pluginCategories: {},
      pluginSettings: {},
      generalCategories: {},
      generalSettings: {},
      proxies: {
        settings: window.customjs.config.settings,
        general: {},
      },
    };

    // Plugin categories and settings
    this.categories.forEach((categories, pluginId) => {
      result.pluginCategories[pluginId] = {};
      categories.forEach((category, key) => {
        result.pluginCategories[pluginId][key] = category;
      });
    });

    this.settings.forEach((categories, pluginId) => {
      result.pluginSettings[pluginId] = {};
      categories.forEach((settings, categoryKey) => {
        result.pluginSettings[pluginId][categoryKey] = {};
        settings.forEach((setting, settingKey) => {
          result.pluginSettings[pluginId][categoryKey][settingKey] = {
            name: setting.name,
            type: setting.type,
            value: setting.value,
            defaultValue: setting.defaultValue,
            isModified: setting.isModified(),
          };
        });
      });
    });

    // General categories and settings
    this.generalCategories.forEach((category, key) => {
      result.generalCategories[key] = category;
    });

    this.generalSettings.forEach((settings, categoryKey) => {
      result.generalSettings[categoryKey] = {};
      result.proxies.general[categoryKey] = window.customjs.config[categoryKey];

      settings.forEach((setting, settingKey) => {
        result.generalSettings[categoryKey][settingKey] = {
          name: setting.name,
          type: setting.type,
          value: setting.value,
          defaultValue: setting.defaultValue,
          isModified: setting.isModified(),
        };
      });
    });

    return result;
  }
}

// Export classes globally under customjs namespace
if (typeof window !== "undefined") {
  window.customjs = window.customjs || {};
  window.customjs.ConfigManager = ConfigManager;
  window.customjs.PluginSetting = PluginSetting;
  window.customjs.configManager = new ConfigManager();

  console.log(
    "[CJS|ConfigManager] ConfigManager class loaded and instance created"
  );
}
