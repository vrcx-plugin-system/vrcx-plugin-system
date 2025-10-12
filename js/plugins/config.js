// ============================================================================
// CONFIGURATION PLUGIN
// Version: 2.0.0
// Build: 1728668400
// ============================================================================

class ConfigPlugin extends Plugin {
  constructor() {
    super({
      name: "Config Plugin",
      description: "Configuration management and metadata access",
      author: "Bluscream",
      version: "2.0.0",
      build: "1728668400",
      dependencies: [
        "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/Plugin.js",
      ],
    });
  }

  async load() {
    // Configuration is already available at window.customjs.config
    // This plugin just provides helper methods for accessing it

    this.log("Configuration management ready");
    this.loaded = true;
  }

  async start() {
    this.enabled = true;
    this.started = true;
    this.log("Configuration plugin started");
  }

  async onLogin(user) {
    // No login-specific logic needed for config plugin
  }

  /**
   * Get a config value by path
   * @param {string} path - Dot-notation path (e.g., "steam.id")
   * @param {any} defaultValue - Default if not found
   * @returns {any} Config value or default
   */
  get(path, defaultValue = null) {
    return this.getConfig(path, defaultValue);
  }

  /**
   * Set a config value
   * @param {string} path - Dot-notation path
   * @param {any} value - Value to set
   */
  set(path, value) {
    this.setConfig(path, value);
    this.log(`Config updated: ${path} = ${JSON.stringify(value)}`);

    // Emit event for config changes
    this.emit("config-changed", { path, value });
  }

  /**
   * Get entire config object
   * @returns {object} Full config object
   */
  getAll() {
    return window.customjs.config;
  }

  /**
   * Check if config path exists
   * @param {string} path - Dot-notation path
   * @returns {boolean} True if path exists
   */
  has(path) {
    const keys = path.split(".");
    let value = window.customjs.config;

    for (const key of keys) {
      if (value === undefined || value === null) return false;
      value = value[key];
    }

    return value !== undefined;
  }

  /**
   * Delete a config value
   * @param {string} path - Dot-notation path
   * @returns {boolean} True if deleted
   */
  delete(path) {
    const keys = path.split(".");
    const lastKey = keys.pop();
    let target = window.customjs.config;

    for (const key of keys) {
      target = target?.[key];
      if (!target) return false;
    }

    if (lastKey in target) {
      delete target[lastKey];
      this.log(`Config deleted: ${path}`);
      this.emit("config-deleted", { path });
      return true;
    }

    return false;
  }
}

// Export plugin class for PluginLoader
window.__LAST_PLUGIN_CLASS__ = ConfigPlugin;
