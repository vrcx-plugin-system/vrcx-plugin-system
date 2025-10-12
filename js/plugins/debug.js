class DebugPlugin extends Plugin {
  constructor() {
    super({
      name: "Debug Plugin",
      description:
        "Debug utilities, IPC logging, global scope search, and console commands for development",
      author: "Bluscream",
      version: "{VERSION}",
      build: "{BUILD}",
      dependencies: [],
    });
  }

  async load() {
    // Expose all debug functions globally via window.customjs.debug
    window.customjs.debug = {
      // Plugin system debug functions
      printDebugInfo: () => this.printDebugInfo(),
      listPlugins: () => this.listPlugins(),
      getPlugin: (id) => this.getPlugin(id),
      listEvents: () => this.listEvents(),
      listHooks: () => this.listHooks(),
      testEvent: (eventName, data) => this.testEvent(eventName, data),

      // VRCX state access functions
      getCurrentUser: () => window.$pinia?.user?.currentUser,
      getCurrentLocation: () => window.$app?.lastLocation,
      getFriends: () => window.$pinia?.user?.currentUser?.friends,
      getCustomTags: () => window.$pinia?.user?.customUserTags,
      getStores: () => window.$pinia,

      // Plugin helper functions
      getUserTag: (userId) =>
        window.customjs.pluginManager
          .getPlugin("tag-manager")
          ?.getUserTag(userId),
      clearProcessedMenus: () =>
        window.customjs.pluginManager
          .getPlugin("context-menu-api")
          ?.clearProcessedMenus(),
      triggerRegistryEvent: (event) =>
        window.customjs.pluginManager
          .getPlugin("registry-overrides")
          ?.triggerEvent(event),
      refreshTags: () =>
        window.customjs.pluginManager.getPlugin("tag-manager")?.refreshTags(),
      getLoadedTagsCount: () =>
        window.customjs.pluginManager
          .getPlugin("tag-manager")
          ?.getLoadedTagsCount(),
      getActiveTagsCount: () =>
        window.customjs.pluginManager
          .getPlugin("tag-manager")
          ?.getActiveTagsCount(),
      getPluginManager: () => window.customjs?.pluginManager,
      getPluginList: () => window.customjs?.pluginManager?.getPluginList(),

      // Advanced inspection functions
      inspectPlugin: (id) => this.inspectPlugin(id),

      // Global scope search
      searchVariable: (searchTerm, options) =>
        this.searchVariable(searchTerm, options),
    };

    this.logger.log("Debug utilities ready");
    this.loaded = true;
  }

  async start() {
    // Setup IPC logging hook
    this.setupIPCLogging();

    this.enabled = true;
    this.started = true;
    this.logger.log("Debug plugin started (access via window.customjs.debug)");

    // Print debug info
    this.printDebugInfo();
  }

  setupIPCLogging() {
    // Use PRE-HOOK to log IPC calls
    this.registerPreHook("AppApi.SendIpc", (args) => {
      console.log(`[IPC OUT]`, args); // eslint-disable-line no-console - Intentional debug output for IPC monitoring
    });

    this.logger.log(
      "IPC logging hook registered (will activate when function available)"
    );
  }

  async stop() {
    this.logger.log("Stopping Debug plugin");

    // Clean up global namespace
    if (window.customjs?.debug) {
      delete window.customjs.debug;
    }

    await super.stop();
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
   * List all events (opens DevTools and logs to console)
   */
  listEvents() {
    // Open devtools for debugging
    if (window.AppApi?.ShowDevTools) {
      window.AppApi.ShowDevTools();
    }

    const events = window.customjs?.events || {};
    // Intentional console output for debug listing
    console.group("Custom Events"); // eslint-disable-line no-console
    Object.keys(events).forEach((eventName) => {
      console.log(`${eventName}: ${events[eventName].length} listeners`); // eslint-disable-line no-console
    });
    console.groupEnd(); // eslint-disable-line no-console
    return events;
  }

  /**
   * List all hooks (opens DevTools and logs to console)
   */
  listHooks() {
    // Open devtools for debugging
    if (window.AppApi?.ShowDevTools) {
      window.AppApi.ShowDevTools();
    }

    // Intentional console output for debug listing
    console.group("Registered Hooks"); // eslint-disable-line no-console
    console.log("Pre-hooks:"); // eslint-disable-line no-console
    console.dir(Object.keys(window.customjs?.hooks?.pre || {})); // eslint-disable-line no-console
    console.log("Post-hooks:"); // eslint-disable-line no-console
    console.dir(Object.keys(window.customjs?.hooks?.post || {})); // eslint-disable-line no-console
    console.log("Void-hooks:"); // eslint-disable-line no-console
    console.dir(Object.keys(window.customjs?.hooks?.void || {})); // eslint-disable-line no-console
    console.log("Replace-hooks:"); // eslint-disable-line no-console
    console.dir(Object.keys(window.customjs?.hooks?.replace || {})); // eslint-disable-line no-console
    console.groupEnd(); // eslint-disable-line no-console
    return window.customjs?.hooks;
  }

  /**
   * Test event emission
   */
  testEvent(eventName, data) {
    this.emit(eventName, data);
    this.logger.log(`Emitted event: ${eventName}`, data);
  }

  /**
   * Inspect a plugin in detail (opens DevTools and logs to console)
   */
  inspectPlugin(id) {
    // Open devtools for debugging
    if (window.AppApi?.ShowDevTools) {
      window.AppApi.ShowDevTools();
    }

    const plugin = window.customjs?.plugins?.find((p) => p.metadata.id === id);
    if (plugin) {
      // Intentional console output for debug inspection
      console.group(`Plugin: ${plugin.metadata.name}`); // eslint-disable-line no-console
      console.log("Metadata:"); // eslint-disable-line no-console
      console.dir(plugin.metadata); // eslint-disable-line no-console
      console.table({
        // eslint-disable-line no-console
        enabled: plugin.enabled,
        loaded: plugin.loaded,
        started: plugin.started,
      });
      console.log("Resources:"); // eslint-disable-line no-console
      console.dir(plugin.resources); // eslint-disable-line no-console
      console.groupEnd(); // eslint-disable-line no-console
    } else {
      console.warn(`Plugin not found: ${id}`); // eslint-disable-line no-console
    }
    return plugin;
  }

  /**
   * Search for properties/functions in the global scope by name
   * @param {string} searchTerm - Term to search for (case-insensitive)
   * @param {object} options - Search options
   * @param {number} options.maxDepth - Maximum depth to search (default: 5)
   * @param {boolean} options.caseSensitive - Case-sensitive search (default: false)
   * @param {boolean} options.exactMatch - Exact match only (default: false)
   * @param {object} options.root - Root object to search (default: window)
   * @returns {Array} Array of results with path and value
   */
  searchVariable(searchTerm, options = {}) {
    const {
      maxDepth = 5,
      caseSensitive = false,
      exactMatch = false,
      root = window,
    } = options;

    const results = [];
    const visited = new WeakSet();
    const searchPattern = caseSensitive ? searchTerm : searchTerm.toLowerCase();

    const search = (obj, path, depth) => {
      if (depth > maxDepth) return;
      if (obj === null || obj === undefined) return;
      if (typeof obj !== "object" && typeof obj !== "function") return;

      // Prevent circular references
      if (visited.has(obj)) return;
      visited.add(obj);

      try {
        const keys = Object.getOwnPropertyNames(obj);

        for (const key of keys) {
          try {
            const currentPath = path ? `${path}.${key}` : key;
            const keyToCheck = caseSensitive ? key : key.toLowerCase();

            // Check if key matches search term
            const matches = exactMatch
              ? keyToCheck === searchPattern
              : keyToCheck.includes(searchPattern);

            if (matches) {
              let value;
              let type;
              try {
                // Get the property descriptor to check if it's a getter
                const descriptor = Object.getOwnPropertyDescriptor(obj, key);
                if (descriptor && descriptor.get && !descriptor.set) {
                  // It's a getter-only property, might throw on access
                  value = "[Getter]";
                  type = "getter";
                } else {
                  value = obj[key];
                  type = typeof value;
                }
              } catch (e) {
                // Silently skip properties that throw errors
                value = "[Access Error]";
                type = "error";
              }

              results.push({
                path: currentPath,
                key: key,
                type: type,
                value: value,
              });
            }

            // Recursively search nested objects
            if (depth < maxDepth) {
              try {
                const nestedValue = obj[key];
                if (
                  nestedValue &&
                  (typeof nestedValue === "object" ||
                    typeof nestedValue === "function")
                ) {
                  search(nestedValue, currentPath, depth + 1);
                }
              } catch (e) {
                // Skip properties that throw errors when accessed
              }
            }
          } catch (e) {
            // Skip problematic keys entirely
          }
        }
      } catch (e) {
        // Skip objects that don't allow property enumeration
      }
    };

    this.logger.log(
      `Searching for "${searchTerm}" (max depth: ${maxDepth})...`
    );
    search(root, "", 0);

    // Log results to console
    if (window.AppApi?.ShowDevTools) {
      window.AppApi.ShowDevTools();
    }

    console.group(
      `Search results for "${searchTerm}" (${results.length} matches)`
    ); // eslint-disable-line no-console
    results.forEach((result) => {
      if (result.type === "getter" || result.type === "error") {
        console.log(`${result.path} [${result.type}]`); // eslint-disable-line no-console
      } else {
        console.log(`${result.path} [${result.type}]`, result.value); // eslint-disable-line no-console
      }
    });
    console.groupEnd(); // eslint-disable-line no-console

    this.logger.log(`Found ${results.length} matches for "${searchTerm}"`);
    return results;
  }
}

// Export plugin class for PluginLoader
window.customjs.__LAST_PLUGIN_CLASS__ = DebugPlugin;
