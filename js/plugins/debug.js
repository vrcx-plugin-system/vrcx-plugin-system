// ============================================================================
// DEBUG PLUGIN
// Version: 1.0.0
// Build: 1728668400
// ============================================================================

/**
 * Debug plugin for testing and development
 * Provides debug utilities and console commands
 */
class DebugPlugin extends Plugin {
  constructor() {
    super({
      name: "Debug Plugin",
      description: "Debug utilities and console commands for development",
      author: "Bluscream",
      version: "1.0.0",
      build: "1728668400",
      dependencies: [
        "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/plugin.js",
      ],
    });
  }

  async load() {
    this.logger.log("Debug utilities ready");
    this.loaded = true;
  }

  async start() {
    this.enabled = true;
    this.started = true;
    this.logger.log("Debug plugin started");

    // Print debug info
    this.printDebugInfo();
  }

  printDebugInfo() {
    this.logger.log("=== DEBUG INFO ===");
    this.logger.log(`Plugins loaded: ${window.customjs.plugins.length}`);
    this.logger.log(
      `Events registered: ${Object.keys(window.customjs.events).length}`
    );
    this.logger.log(
      `Hooks registered: pre=${
        Object.keys(window.customjs.hooks.pre).length
      }, post=${Object.keys(window.customjs.hooks.post).length}`
    );
    this.logger.log(
      `Functions backed up: ${Object.keys(window.customjs.functions).length}`
    );

    // List all plugins
    window.customjs.plugins.forEach((plugin) => {
      this.logger.log(
        `  - ${plugin.metadata.name} v${plugin.metadata.version} (${
          plugin.enabled ? "enabled" : "disabled"
        }, ${plugin.loaded ? "loaded" : "not loaded"}, ${
          plugin.started ? "started" : "not started"
        })`
      );
    });
  }

  /**
   * List all registered plugins
   */
  listPlugins() {
    return window.customjs.plugins.map((p) => ({
      id: p.metadata.id,
      name: p.metadata.name,
      version: p.metadata.version,
      enabled: p.enabled,
      loaded: p.loaded,
      started: p.started,
    }));
  }

  /**
   * Get plugin by ID
   */
  getPlugin(id) {
    return window.customjs.pluginManager.getPlugin(id);
  }

  /**
   * List all events
   */
  listEvents() {
    return Object.keys(window.customjs.events).map((eventName) => ({
      event: eventName,
      listeners: window.customjs.events[eventName].length,
    }));
  }

  /**
   * List all hooks
   */
  listHooks() {
    return {
      pre: Object.keys(window.customjs.hooks.pre).map((fn) => ({
        function: fn,
        hooks: window.customjs.hooks.pre[fn].length,
      })),
      post: Object.keys(window.customjs.hooks.post).map((fn) => ({
        function: fn,
        hooks: window.customjs.hooks.post[fn].length,
      })),
    };
  }

  /**
   * Test event emission
   */
  testEvent(eventName, data) {
    this.emit(eventName, data);
    this.logger.log(`Emitted event: ${eventName}`, data);
  }
}

// Export plugin class for PluginLoader
window.__LAST_PLUGIN_CLASS__ = DebugPlugin;
