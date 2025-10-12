/**
 * Config Proxy Plugin
 *
 * Provides backward-compatible proxy access to ConfigManager settings via window.customjs.config
 *
 * Usage:
 * - Access plugin settings: window.customjs.config.settings.pluginId.category.setting
 * - Access general settings: window.customjs.config.categoryKey.settingKey
 * - Modify settings: window.customjs.config.settings.pluginId.category.setting = value
 *
 * This plugin is optional and can be disabled if you don't need the proxy interface.
 * Plugins can access their settings directly via this.config.category.setting.value
 */

class ConfigProxyPlugin extends Plugin {
  constructor() {
    super({
      name: "Config Proxy",
      description:
        "Provides backward-compatible proxy access to ConfigManager settings",
      author: "Bluscream",
      version: "1.0.0",
      build: "1760486400",
    });
  }

  async load() {
    this.log("Loading Config Proxy plugin...");

    // Setup proxies will happen in start() after all plugins have registered their settings

    this.loaded = true;
    this.log("✓ Config Proxy plugin loaded");
  }

  async start() {
    this.log("Starting Config Proxy plugin...");

    // Setup proxies for all registered settings
    this.setupProxies();

    this.started = true;
    this.log("✓ Config Proxy plugin started - proxies active");
  }

  /**
   * Setup proxy for all registered settings at window.customjs.config
   */
  setupProxies() {
    if (!window.customjs?.configManager) {
      this.error("ConfigManager not available");
      return;
    }

    const configManager = window.customjs.configManager;

    // Initialize proxy structure
    window.customjs.config = window.customjs.config || {};
    window.customjs.config.settings = window.customjs.config.settings || {};

    // Setup proxies for plugin settings
    configManager.settings.forEach((categories, pluginId) => {
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
    configManager.generalSettings.forEach((settings, categoryKey) => {
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

    this.log(
      `✓ Setup proxies for ${configManager.settings.size} plugins and ${configManager.generalSettings.size} general categories`
    );
  }

  async stop() {
    this.log("Stopping Config Proxy plugin...");

    // Note: We don't clean up the proxies on stop because that would break existing code
    // The proxies are lightweight and don't need cleanup

    await super.stop();
    this.log("✓ Config Proxy plugin stopped");
  }
}

// Auto-register plugin
if (typeof window !== "undefined") {
  window.customjs.__LAST_PLUGIN_CLASS__ = ConfigProxyPlugin;
}
