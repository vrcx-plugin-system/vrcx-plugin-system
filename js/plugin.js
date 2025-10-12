class Plugin {
  constructor(metadata = {}) {
    // Get URL from metadata or from global scope (set by PluginManager)
    const pluginUrl = metadata.url || window.__CURRENT_PLUGIN_URL__ || null;

    // Auto-derive ID from URL if not provided
    let pluginId = metadata.id;
    if (!pluginId && pluginUrl) {
      // Extract filename without extension from URL
      const urlParts = pluginUrl.split("/");
      const filename = urlParts[urlParts.length - 1];
      pluginId = filename.replace(/\.js$/, "");
    }

    if (!pluginId) {
      throw new Error(
        "Plugin must be loaded via PluginManager to auto-derive ID, or provide 'id' in metadata"
      );
    }

    this.metadata = {
      id: pluginId,
      name: metadata.name || pluginId,
      description: metadata.description || "",
      author: metadata.author || "Unknown",
      version: metadata.version || "1.0.0",
      build: metadata.build || Date.now().toString(),
      dependencies: metadata.dependencies || [],
      url: pluginUrl,
    };

    this.enabled = false;
    this.loaded = false;
    this.started = false;

    // Create personal logger instance for this plugin
    this.logger = new window.customjs.Logger(this.metadata.id);

    // Initialize config object (will be populated by ConfigManager)
    this.config = {};

    // Resource tracking for automatic cleanup
    this.resources = {
      timers: new Set(),
      observers: new Set(),
      listeners: new Map(), // element -> [{ event, handler, options }, ...]
      hooks: new Set(), // Track hooks registered by this plugin
      subscriptions: new Set(),
    };

    // Automatically register with plugin manager
    if (window.customjs?.pluginManager) {
      window.customjs.pluginManager.registerPlugin(this);
    } else {
      console.warn(
        `[${this.metadata.name}] PluginManager not available, plugin won't be tracked`
      );
    }
  }

  /**
   * Called immediately when plugin code is executed (before loading)
   * Use for: Nothing - this is handled internally
   * @private
   */
  async _construct() {
    // Internal initialization
    this.log("Plugin constructed");
  }

  /**
   * Called immediately after plugin is instantiated
   * Use for: Initial setup, register hooks, expose methods to global scope
   * Should NOT start timers or modify DOM - use start() for that
   * @returns {Promise<void>}
   */
  async load() {
    this.log("load() called - Override this method in your plugin");
    this.loaded = true;
  }

  /**
   * Called after all plugins have finished loading
   * Use for: Setup that depends on other plugins, start timers, modify DOM
   * @returns {Promise<void>}
   */
  async start() {
    this.log("start() called - Override this method in your plugin");
    this.started = true;
  }

  /**
   * Called after successful VRChat login
   * Use for: Loading user data, making authenticated API calls, user-specific setup
   * @param {object} currentUser - Current logged in user object from $pinia.user.currentUser
   * @returns {Promise<void>}
   */
  async onLogin(currentUser) {
    this.log(
      `onLogin(${
        currentUser?.displayName || "Unknown"
      }) called - Override this method`
    );
  }

  /**
   * Called when plugin is disabled or unloaded
   * Use for: Cleanup, remove UI elements, clear custom data
   * @returns {Promise<void>}
   */
  async stop() {
    this.log("stop() called - Override this method in your plugin");
    this.started = false;

    // Clean up local resources
    this.cleanupResources();

    // Clean up global subscriptions via PluginManager
    if (window.customjs?.pluginManager) {
      window.customjs.pluginManager.unregisterSubscriptions(this.metadata.id);
    }
  }

  /**
   * Enable the plugin
   * @returns {boolean} True if enabled, false if already enabled
   */
  async enable() {
    if (this.enabled) {
      this.warn("Already enabled");
      return false;
    }
    this.enabled = true;
    this.log("✓ Plugin enabled");

    // Restart if it was started before
    if (this.loaded && !this.started) {
      await this.start();
    }

    return true;
  }

  /**
   * Disable the plugin (calls stop)
   * @returns {boolean} True if disabled, false if already disabled
   */
  async disable() {
    if (!this.enabled) {
      this.warn("Already disabled");
      return false;
    }
    this.enabled = false;
    await this.stop();
    this.log("✓ Plugin disabled");
    return true;
  }

  /**
   * Toggle plugin enabled state
   * @returns {boolean} New enabled state
   */
  async toggle() {
    return this.enabled ? await this.disable() : await this.enable();
  }

  /**
   * Register a timer (setInterval/setTimeout) for automatic cleanup
   * @param {number} timerId - Timer ID from setInterval/setTimeout
   */
  registerTimer(timerId) {
    this.resources.timers.add(timerId);
    return timerId;
  }

  /**
   * Register an observer (MutationObserver, IntersectionObserver, etc.)
   * @param {object} observer - Observer instance
   */
  registerObserver(observer) {
    this.resources.observers.add(observer);
    return observer;
  }

  /**
   * Register an event listener for automatic cleanup
   * @param {Element} element - DOM element
   * @param {string} event - Event name
   * @param {function} handler - Event handler
   * @param {object} options - Event listener options
   */
  registerListener(element, event, handler, options = {}) {
    element.addEventListener(event, handler, options);

    if (!this.resources.listeners.has(element)) {
      this.resources.listeners.set(element, []);
    }
    this.resources.listeners.get(element).push({ event, handler, options });

    return { element, event, handler };
  }

  /**
   * Register a Pinia subscription or any unsubscribe function for automatic cleanup
   * Uses centralized tracking via PluginManager and local tracking for cleanup
   * @param {function} unsubscribe - Unsubscribe function returned by $subscribe or similar
   * @returns {function} The unsubscribe function (for chaining)
   */
  registerSubscription(unsubscribe) {
    // Track locally for cleanup
    this.resources.subscriptions.add(unsubscribe);

    // Track globally in PluginManager
    if (window.customjs?.pluginManager) {
      window.customjs.pluginManager.registerSubscription(
        this.metadata.id,
        unsubscribe
      );
    }

    return unsubscribe;
  }

  /**
   * Alias for registerSubscription - commonly used in plugins
   * @param {function} unsubscribe - Unsubscribe function
   * @returns {function} The unsubscribe function (for chaining)
   */
  registerResource(unsubscribe) {
    return this.registerSubscription(unsubscribe);
  }

  /**
   * Clean up all tracked resources (timers, observers, listeners)
   * NOTE: Subscriptions are cleaned up centrally via PluginManager.unregisterSubscriptions()
   * Called automatically by stop()
   * @private
   */
  cleanupResources() {
    let cleanupCount = 0;

    // Clear timers
    this.resources.timers.forEach((timerId) => {
      clearInterval(timerId);
      clearTimeout(timerId);
      cleanupCount++;
    });
    this.resources.timers.clear();

    // Disconnect observers
    this.resources.observers.forEach((observer) => {
      observer.disconnect();
      cleanupCount++;
    });
    this.resources.observers.clear();

    // Remove event listeners
    this.resources.listeners.forEach((listeners, element) => {
      listeners.forEach(({ event, handler, options }) => {
        element.removeEventListener(event, handler, options);
        cleanupCount++;
      });
    });
    this.resources.listeners.clear();

    // Clear local subscription tracking (actual unsubscribe is done by PluginManager)
    this.resources.subscriptions.clear();

    // Note: Hooks are not automatically removed as they may be used by other plugins
    // Removing them would require coordination with PluginManager
    this.resources.hooks.clear();

    if (cleanupCount > 0) {
      this.log(`✓ Cleaned up ${cleanupCount} local resources`);
    }
  }

  /**
   * Emit an event that other plugins can listen to
   * @param {string} eventName - Event name
   * @param {any} data - Event data
   */
  emit(eventName, data) {
    const fullEventName = `${this.metadata.id}:${eventName}`;
    if (window.customjs?.events?.[fullEventName]) {
      window.customjs.events[fullEventName].forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          this.error(`Error in event handler for ${fullEventName}:`, error);
        }
      });
    }
  }

  /**
   * Listen to events from this or other plugins
   * @param {string} eventName - Event name (can include plugin:event format)
   * @param {function} callback - Event handler
   */
  on(eventName, callback) {
    // If no plugin prefix, use this plugin's ID
    const fullEventName = eventName.includes(":")
      ? eventName
      : `${this.metadata.id}:${eventName}`;

    window.customjs = window.customjs || {};
    window.customjs.events = window.customjs.events || {};
    window.customjs.events[fullEventName] =
      window.customjs.events[fullEventName] || [];
    window.customjs.events[fullEventName].push(callback);
  }

  /**
   * Register a pre-hook to run before a function
   * @param {string} functionPath - Dot-notation path to function (e.g., "AppApi.SendIpc")
   * @param {function} callback - Callback(args) called before original function
   * @returns {void}
   */
  registerPreHook(functionPath, callback) {
    if (!window.customjs?.pluginManager) {
      this.error("Plugin manager not available for hooks");
      return;
    }
    window.customjs.pluginManager.registerPreHook(functionPath, callback, this);
    this.resources.hooks.add({ type: "pre", functionPath, callback });
  }

  /**
   * Register a post-hook to run after a function
   * @param {string} functionPath - Dot-notation path to function (e.g., "AppApi.SendIpc")
   * @param {function} callback - Callback(result, args) called after original function
   * @returns {void}
   */
  registerPostHook(functionPath, callback) {
    if (!window.customjs?.pluginManager) {
      this.error("Plugin manager not available for hooks");
      return;
    }
    window.customjs.pluginManager.registerPostHook(
      functionPath,
      callback,
      this
    );
    this.resources.hooks.add({ type: "post", functionPath, callback });
  }

  /**
   * Register a void-hook to completely prevent a function from executing
   * @param {string} functionPath - Dot-notation path to function (e.g., "AppApi.SendIpc")
   * @param {function} callback - Callback(args) called instead of the function (receives args for inspection)
   * @returns {void}
   */
  registerVoidHook(functionPath, callback) {
    if (!window.customjs?.pluginManager) {
      this.error("Plugin manager not available for hooks");
      return;
    }
    window.customjs.pluginManager.registerVoidHook(
      functionPath,
      callback,
      this
    );
    this.resources.hooks.add({ type: "void", functionPath, callback });
  }

  /**
   * Register a replace-hook to replace a function with your own implementation
   * Multiple plugins can register replace hooks - they will be chained together
   * @param {string} functionPath - Dot-notation path to function (e.g., "AppApi.SendIpc")
   * @param {function} callback - Callback(originalFunc, ...args) that should call originalFunc or return your own result
   * @returns {void}
   * @example
   * // Replace a function while optionally calling the original
   * this.registerReplaceHook("SomeObject.someMethod", function(originalFunc, arg1, arg2) {
   *   // You can modify args, skip the original call, or wrap it
   *   console.log("Before original");
   *   const result = originalFunc(arg1, arg2); // Call original if needed
   *   console.log("After original");
   *   return result; // Or return your own result
   * });
   */
  registerReplaceHook(functionPath, callback) {
    if (!window.customjs?.pluginManager) {
      this.error("Plugin manager not available for hooks");
      return;
    }
    window.customjs.pluginManager.registerReplaceHook(
      functionPath,
      callback,
      this
    );
    this.resources.hooks.add({ type: "replace", functionPath, callback });
  }

  /**
   * Log info message (uses personal logger instance)
   * @param {string} message - Message to log
   * @param {...any} args - Additional arguments (will be logged separately)
   */
  log(message, ...args) {
    this.logger.logInfo(message);
    if (args.length > 0) {
      console.log(`[${this.metadata.name}]`, ...args); // eslint-disable-line no-console
    }
  }

  /**
   * Log warning message (uses personal logger instance)
   * @param {string} message - Message to log
   * @param {...any} args - Additional arguments (will be logged separately)
   */
  warn(message, ...args) {
    this.logger.logWarn(message);
    if (args.length > 0) {
      console.warn(`[${this.metadata.name}]`, ...args); // eslint-disable-line no-console
    }
  }

  /**
   * Log error message (uses personal logger instance)
   * @param {string} message - Message to log
   * @param {...any} args - Additional arguments (will be logged separately)
   */
  error(message, ...args) {
    this.logger.logError(message);
    if (args.length > 0) {
      console.error(`[${this.metadata.name}]`, ...args); // eslint-disable-line no-console
    }
  }

  /**
   * Get configuration value from customjs.config (global config, not plugin settings)
   * @param {string} path - Dot-notation path (e.g., "steam.id")
   * @param {any} defaultValue - Default value if not found
   */
  getConfig(path, defaultValue = null) {
    const keys = path.split(".");
    let value = window.customjs?.config;

    for (const key of keys) {
      value = value?.[key];
      if (value === undefined) return defaultValue;
    }

    return value;
  }

  /**
   * Set configuration value (global config, not plugin settings)
   * @param {string} path - Dot-notation path
   * @param {any} value - Value to set
   */
  setConfig(path, value) {
    const keys = path.split(".");
    const lastKey = keys.pop();
    let target = window.customjs.config;

    for (const key of keys) {
      target[key] = target[key] || {};
      target = target[key];
    }

    target[lastKey] = value;
  }

  /**
   * Register a setting category for this plugin
   * @param {string} key - Category key
   * @param {string} name - Display name
   * @param {string} description - Description
   */
  registerSettingCategory(key, name, description = "") {
    if (!window.customjs?.configManager) {
      this.warn("ConfigManager not available");
      return;
    }
    window.customjs.configManager.registerPluginSettingCategory(
      this,
      key,
      name,
      description
    );
  }

  /**
   * Register a setting for this plugin
   * @param {string} categoryKey - Category key
   * @param {string} key - Setting key
   * @param {string} name - Display name
   * @param {string} type - Type (string, number, boolean, object, array)
   * @param {any} defaultValue - Default value
   * @param {string} description - Optional description
   */
  registerSetting(
    categoryKey,
    key,
    name,
    type,
    defaultValue,
    description = ""
  ) {
    if (!window.customjs?.configManager) {
      this.warn("ConfigManager not available");
      return;
    }
    window.customjs.configManager.registerPluginSetting(
      this,
      categoryKey,
      key,
      name,
      type,
      defaultValue,
      description
    );
  }

  /**
   * Save plugin settings to disk
   */
  async saveSettings() {
    if (!window.customjs?.configManager) {
      this.warn("ConfigManager not available");
      return;
    }
    await window.customjs.configManager.save();
  }
}

// Export for use by other plugins
if (typeof window !== "undefined") {
  window.Plugin = Plugin;
}
