/**
 * Config Proxy Plugin
 *
 * NOTE: This plugin is now deprecated with the simplified ConfigManager.
 *
 * The new system uses direct localStorage access via:
 * - Plugins: this.get(key, default) / this.set(key, value)
 * - ConfigManager: window.customjs.configManager.get(key, default) / set(key, value)
 *
 * This plugin is kept for backward compatibility but does nothing.
 * You can safely disable it in your plugin configuration.
 */

class ConfigProxyPlugin extends Plugin {
  constructor() {
    super({
      name: "Config Proxy",
      description:
        "[DEPRECATED] No longer needed with simplified ConfigManager - safe to disable",
      author: "Bluscream",
      version: "2.0.0",
      build: "1728778800",
    });
  }

  async load() {
    this.log("Loading Config Proxy plugin...");
    this.log(
      "⚠️ This plugin is deprecated and does nothing (ConfigManager is now simplified)"
    );
    this.loaded = true;
    this.log("✓ Config Proxy plugin loaded (no-op)");
  }

  async start() {
    this.log("Starting Config Proxy plugin...");
    this.log("ℹ️ You can safely disable this plugin in your configuration");
    this.started = true;
    this.log("✓ Config Proxy plugin started (no-op)");
  }

  async stop() {
    this.log("Stopping Config Proxy plugin...");
    await super.stop();
    this.log("✓ Config Proxy plugin stopped");
  }
}

// Auto-register plugin
if (typeof window !== "undefined") {
  window.customjs.__LAST_PLUGIN_CLASS__ = ConfigProxyPlugin;
}
