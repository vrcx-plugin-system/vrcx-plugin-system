class Plugin extends Module {
  constructor(metadata = {}) {
    // Get URL from metadata or from global scope (set by PluginManager)
    const pluginUrl =
      metadata.url || window.customjs?.__currentPluginUrl || null;

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

    // Call Module constructor
    super({
      id: pluginId,
      name: metadata.name || pluginId,
      description: metadata.description || "",
      author: metadata.author || "Unknown",
      version: metadata.version || "1.0.0",
      build: metadata.build || Date.now().toString(),
      url: pluginUrl,
    });

    this.enabled = false;
    this.dependencies = metadata.dependencies || [];

    // Create personal logger instance for this plugin
    this.logger = new window.customjs.Logger(this.metadata.id);

    // Add hooks tracking to resources
    this.resources.hooks = new Set();

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

    // Call parent stop (which handles resource cleanup)
    await super.stop();

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
   * Register a Pinia subscription or any unsubscribe function for automatic cleanup
   * Uses centralized tracking via PluginManager and local tracking for cleanup
   * @param {function} unsubscribe - Unsubscribe function returned by $subscribe or similar
   * @returns {function} The unsubscribe function (for chaining)
   */
  registerSubscription(unsubscribe) {
    // Call parent method to track locally
    super.registerSubscription(unsubscribe);

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
   * Subscribe to VRCX system events (Pinia stores)
   * Automatically sets up Pinia subscriptions and handles cleanup
   * @param {string} eventType - Event type: "LOCATION", "USER", "GAME", "GAMELOG", "FRIENDS", "UI"
   * @param {function} callback - Callback(data) with event-specific data
   * @returns {function|null} Unsubscribe function or null if failed
   * @example
   * // Location changes
   * this.subscribe("LOCATION", ({ location, lastLocation }) => {
   *   console.log("Location changed:", location.location);
   * });
   *
   * // User changes
   * this.subscribe("USER", ({ currentUser }) => {
   *   console.log("User changed:", currentUser?.displayName);
   * });
   *
   * // Game state changes
   * this.subscribe("GAME", ({ isGameRunning, isGameNoVR }) => {
   *   console.log("Game running:", isGameRunning);
   * });
   */
  subscribe(eventType, callback) {
    if (!window.customjs?.pluginManager) {
      this.error("Plugin manager not available for subscriptions");
      return null;
    }

    return window.customjs.pluginManager.subscribeToEvent(
      eventType,
      callback,
      this
    );
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
   * Define plugin settings using Equicord-style settings system
   * @param {object} definition - Settings definition
   * @returns {object} Settings object with store, plain, def, and helper methods
   * @example
   * const settings = this.defineSettings({
   *   enabled: {
   *     type: window.customjs.SettingType.BOOLEAN,
   *     description: "Enable the plugin",
   *     category: "general",
   *     default: true
   *   },
   *   apiKey: {
   *     type: window.customjs.SettingType.STRING,
   *     description: "API Key",
   *     category: "authentication",
   *     placeholder: "Enter your key...",
   *     default: ""
   *   }
   * });
   *
   * // Access settings
   * const enabled = settings.store.enabled;
   * settings.store.apiKey = "new-key"; // auto-saves
   */
  defineSettings(definition) {
    if (!window.customjs?.definePluginSettings) {
      this.warn("definePluginSettings function not available");
      return null;
    }

    return window.customjs.definePluginSettings(definition, this);
  }

  /**
   * Define category metadata for settings
   * @param {object} categories - Category definitions
   * @returns {object} Categories object
   * @example
   * this.categories = this.defineSettingsCategories({
   *   general: {
   *     name: "General Settings",
   *     description: "Basic plugin configuration"
   *   },
   *   notifications: {
   *     name: "Notifications",
   *     description: "Configure notification settings"
   *   }
   * });
   */
  defineSettingsCategories(categories) {
    return categories;
  }

  /**
   * Get setting value (auto-prepends plugin ID)
   * @param {string} key - Setting key (can use dot notation for categories)
   * @param {any} defaultValue - Default value if not found
   * @returns {any} Setting value or default
   * @example
   * // Simple key
   * const message = this.get("message", "default");
   *
   * // With category
   * const enabled = this.get("general.enabled", true);
   */
  get(key, defaultValue = null) {
    if (!window.customjs?.configManager) {
      this.warn("ConfigManager not available");
      return defaultValue;
    }

    const fullKey = `${this.metadata.id}.${key}`;
    return window.customjs.configManager.get(fullKey, defaultValue);
  }

  /**
   * Set setting value (auto-prepends plugin ID)
   * @param {string} key - Setting key (can use dot notation for categories)
   * @param {any} value - Value to store
   * @returns {boolean} Success status
   * @example
   * // Simple key
   * this.set("message", "Hello World");
   *
   * // With category
   * this.set("general.enabled", false);
   */
  set(key, value) {
    if (!window.customjs?.configManager) {
      this.warn("ConfigManager not available");
      return false;
    }

    const fullKey = `${this.metadata.id}.${key}`;
    return window.customjs.configManager.set(fullKey, value);
  }

  /**
   * Delete setting (auto-prepends plugin ID)
   * @param {string} key - Setting key
   * @returns {boolean} Success status
   */
  deleteSetting(key) {
    if (!window.customjs?.configManager) {
      this.warn("ConfigManager not available");
      return false;
    }

    const fullKey = `${this.metadata.id}.${key}`;
    return window.customjs.configManager.delete(fullKey);
  }

  /**
   * Check if setting exists (auto-prepends plugin ID)
   * @param {string} key - Setting key
   * @returns {boolean} True if setting exists
   */
  hasSetting(key) {
    if (!window.customjs?.configManager) {
      this.warn("ConfigManager not available");
      return false;
    }

    const fullKey = `${this.metadata.id}.${key}`;
    return window.customjs.configManager.has(fullKey);
  }

  /**
   * Get all settings keys for this plugin
   * @returns {string[]} Array of setting keys (without plugin ID prefix)
   */
  getAllSettingKeys() {
    if (!window.customjs?.configManager) {
      this.warn("ConfigManager not available");
      return [];
    }

    return window.customjs.configManager.keys(this.metadata.id);
  }

  /**
   * Get all settings for this plugin as a nested object
   * @returns {object} All settings for this plugin
   * @example
   * const settings = this.getAllSettings();
   * // Returns: { general: { enabled: true }, notifications: { ... } }
   */
  getAllSettings() {
    if (!window.customjs?.configManager) {
      this.warn("ConfigManager not available");
      return {};
    }

    return window.customjs.configManager.getPluginConfig(this.metadata.id);
  }

  /**
   * Clear all settings for this plugin
   */
  clearAllSettings() {
    if (!window.customjs?.configManager) {
      this.warn("ConfigManager not available");
      return;
    }

    window.customjs.configManager.clear(this.metadata.id);
    this.log("✓ Cleared all settings");
  }
}

// ============================================================================
// PLUGIN LOADER
// ============================================================================

/**
 * PluginLoader class - handles loading plugins (inherits from ModuleLoader)
 */
class PluginLoader extends ModuleLoader {
  constructor(pluginManager) {
    super();
    this.pluginManager = pluginManager;

    // Default plugin configuration
    this.defaultPlugins = [
      {
        url: "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/plugins/config-proxy.js",
        enabled: true,
      },
      {
        url: "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/plugins/context-menu-api.js",
        enabled: true,
      },
      {
        url: "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/plugins/nav-menu-api.js",
        enabled: true,
      },
      {
        url: "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/plugins/invite-message-api.js",
        enabled: true,
      },
      {
        url: "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/plugins/protocol-links.js",
        enabled: true,
      },
      {
        url: "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/plugins/auto-disable-untrusted-urls.js",
        enabled: true,
      },
      {
        url: "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/plugins/registry-overrides.js",
        enabled: false,
      },
      {
        url: "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/plugins/tag-manager.js",
        enabled: true,
      },
      {
        url: "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/plugins/yoinker-detector.js",
        enabled: true,
      },
      {
        url: "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/plugins/auto-invite.js",
        enabled: true,
      },
      {
        url: "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/plugins/auto-follow.js",
        enabled: true,
      },
      {
        url: "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/plugins/bio-updater.js",
        enabled: false,
      },
      {
        url: "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/plugins/plugin-manager-ui.js",
        enabled: true,
      },
      {
        url: "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/plugins/monitor-invisibleplayers.js",
        enabled: false,
      },
      {
        url: "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/plugins/selfinvite-onblockedplayer.js",
        enabled: false,
      },
      {
        url: "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/plugins/avatar-log.js",
        enabled: true,
      },
      {
        url: "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/plugins/debug.js",
        enabled: false,
      },
      {
        url: "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/plugins/template.js",
        enabled: false,
      },
    ];
  }

  /**
   * Load plugin code from URL (overrides base method for plugin-specific logic)
   * @param {string} pluginUrl - URL to load
   * @param {number} timeout - Load timeout in ms
   * @returns {Promise<boolean>} Success status
   */
  async loadPluginCode(pluginUrl, timeout = 10000) {
    const attempts = this.retryAttempts.get(pluginUrl) || 0;

    try {
      const url = pluginUrl + "?v=" + Date.now();
      this.log(`Loading plugin: ${pluginUrl}`);

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const pluginCode = await response.text();

      // Store the number of plugins before loading
      const pluginCountBefore = window.customjs.plugins.length;

      // Wrap in IIFE to isolate scope
      const wrappedCode = `(function() { 
        window.customjs = window.customjs || {};
        window.customjs.__currentPluginUrl = "${pluginUrl}";
        
        ${pluginCode}
        
        // Auto-instantiate plugin if class was defined
        if (typeof window.customjs.__LAST_PLUGIN_CLASS__  !== 'undefined') {
          try {
            const PluginClass = window.customjs.__LAST_PLUGIN_CLASS__ ;
            const pluginInstance = new PluginClass();
            console.log(\`[CJS|PluginLoader] ✓ Instantiated plugin: \${pluginInstance.metadata.name}\`);
            delete window.customjs.__LAST_PLUGIN_CLASS__ ;
            delete window.customjs.__currentPluginUrl;
          } catch (e) {
            console.error('%c[CJS|PluginLoader]%c Error instantiating plugin:', "color: #2196f3", "color: inherit", e);
            delete window.customjs.__currentPluginUrl;
          }
        }
      })();`;

      // Inject code
      const script = document.createElement("script");
      script.type = "text/javascript";
      script.textContent = wrappedCode;
      script.dataset.pluginUrl = pluginUrl;

      const loadPromise = new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error(`Plugin load timeout: ${pluginUrl}`));
        }, timeout);

        script.onerror = () => {
          clearTimeout(timeoutId);
          reject(new Error(`Script error loading plugin`));
        };

        setTimeout(() => {
          clearTimeout(timeoutId);
          const pluginCountAfter = window.customjs.plugins.length;
          if (pluginCountAfter > pluginCountBefore) {
            const newPlugin = window.customjs.plugins[pluginCountAfter - 1];
            this.log(
              `✓ Loaded ${newPlugin.metadata.name} v${newPlugin.metadata.version}`
            );
          }
          resolve();
        }, 100);
      });

      document.head.appendChild(script);
      await loadPromise;

      this.loadedUrls.add(pluginUrl);
      this.retryAttempts.delete(pluginUrl);
      return true;
    } catch (error) {
      this.retryAttempts.set(pluginUrl, attempts + 1);

      if (attempts + 1 >= this.maxRetries) {
        this.failedUrls.add(pluginUrl);
        this.error(
          `✗ Failed to load plugin after ${this.maxRetries} attempts: ${pluginUrl}`,
          error
        );
        return false;
      } else {
        this.warn(
          `⚠ Retry ${attempts + 1}/${this.maxRetries} for: ${pluginUrl}`
        );
        await new Promise((resolve) =>
          setTimeout(resolve, 1000 * (attempts + 1))
        );
        return await this.loadPluginCode(pluginUrl, timeout);
      }
    }
  }

  log(message, ...args) {
    console.log(`[CJS|PluginLoader] ${message}`, ...args);
  }

  warn(message, ...args) {
    console.warn(`[CJS|PluginLoader] ${message}`, ...args);
  }

  error(message, ...args) {
    console.error(
      `%c[CJS|PluginLoader]%c ${message}`,
      "color: #2196f3",
      "color: inherit",
      ...args
    );
  }
}

// ============================================================================
// PLUGIN MANAGER
// ============================================================================

class PluginManager {
  constructor() {
    // Login tracking
    this.loginCallbacks = [];
    this.isLoggedIn = false;
    this.hasTriggeredLogin = false;

    // Plugin loading tracking
    this.loadedUrls = new Set();
    this.failedUrls = new Set();

    // Initialize global customjs structures if not exists
    if (!window.customjs.plugins) {
      window.customjs.plugins = [];
    }
    if (!window.customjs.subscriptions) {
      window.customjs.subscriptions = new Map(); // pluginId -> Set of unsubscribe functions
    }
    if (!window.customjs.hooks) {
      window.customjs.hooks = {
        pre: {},
        post: {},
        void: {},
        replace: {},
      };
    }
    if (!window.customjs.functions) {
      window.customjs.functions = {};
    }
    if (!window.customjs.events) {
      window.customjs.events = {};
    }

    // Register in global namespace
    window.customjs.pluginManager = this;
  }

  registerPlugin(plugin) {
    if (!plugin || !plugin.metadata) {
      console.error(
        "%c[CJS|PluginManager]%c Invalid plugin registration",
        "color: #4caf50",
        "color: inherit"
      );
      return false;
    }

    // Check if already registered
    const existing = window.customjs.plugins.find(
      (p) => p.metadata.id === plugin.metadata.id
    );
    if (existing) {
      console.warn(
        `[CJS|PluginManager] Plugin already registered: ${plugin.metadata.id}`
      );
      return false;
    }

    window.customjs.plugins.push(plugin);

    // Initialize subscription tracking for this plugin
    if (!window.customjs.subscriptions.has(plugin.metadata.id)) {
      window.customjs.subscriptions.set(plugin.metadata.id, new Set());
    }

    console.log(
      `[CJS|PluginManager] Registered plugin: ${plugin.metadata.name} v${plugin.metadata.version}`
    );
    return true;
  }

  /**
   * Register a subscription for a plugin (centralized tracking)
   * @param {string} pluginId - Plugin ID
   * @param {function} unsubscribe - Unsubscribe function
   * @returns {function} The unsubscribe function (for chaining)
   */
  registerSubscription(pluginId, unsubscribe) {
    if (!window.customjs.subscriptions.has(pluginId)) {
      window.customjs.subscriptions.set(pluginId, new Set());
    }

    window.customjs.subscriptions.get(pluginId).add(unsubscribe);
    return unsubscribe;
  }

  /**
   * Unregister all subscriptions for a plugin
   * @param {string} pluginId - Plugin ID
   */
  unregisterSubscriptions(pluginId) {
    const subscriptions = window.customjs.subscriptions.get(pluginId);
    if (!subscriptions) return;

    let count = 0;
    subscriptions.forEach((unsubscribe) => {
      if (typeof unsubscribe === "function") {
        try {
          unsubscribe();
          count++;
        } catch (error) {
          console.error(
            `[CJS|PluginManager] Error unsubscribing for ${pluginId}:`,
            error
          );
        }
      }
    });

    subscriptions.clear();
    console.log(
      `[CJS|PluginManager] Unregistered ${count} subscriptions for ${pluginId}`
    );
  }

  /**
   * Subscribe to VRCX system events via Pinia stores
   * @param {string} eventType - Event type (LOCATION, USER, GAME, GAMELOG, FRIENDS, UI)
   * @param {function} callback - Callback function
   * @param {Plugin} plugin - Plugin instance
   * @returns {function|null} Unsubscribe function
   */
  subscribeToEvent(eventType, callback, plugin) {
    const setupSubscription = () => {
      let storeSubscription = null;
      let unsubscribe = null;

      switch (eventType.toUpperCase()) {
        case "LOCATION":
          if (window.$pinia?.location?.$subscribe) {
            storeSubscription = window.$pinia.location.$subscribe(
              (mutation, state) => {
                try {
                  callback({
                    location: state.location,
                    lastLocation: state.lastLocation,
                    lastLocationDestination: state.lastLocationDestination,
                  });
                } catch (error) {
                  plugin.error(`Error in LOCATION subscription:`, error);
                }
              }
            );
          }
          break;

        case "USER":
          if (window.$pinia?.user?.$subscribe) {
            storeSubscription = window.$pinia.user.$subscribe(
              (mutation, state) => {
                try {
                  callback({
                    currentUser: state.currentUser,
                    isLogin: state.isLogin,
                  });
                } catch (error) {
                  plugin.error(`Error in USER subscription:`, error);
                }
              }
            );
          }
          break;

        case "GAME":
          if (window.$pinia?.game?.$subscribe) {
            storeSubscription = window.$pinia.game.$subscribe(
              (mutation, state) => {
                try {
                  callback({
                    isGameRunning: state.isGameRunning,
                    isGameNoVR: state.isGameNoVR,
                  });
                } catch (error) {
                  plugin.error(`Error in GAME subscription:`, error);
                }
              }
            );
          }
          break;

        case "GAMELOG":
          if (window.$pinia?.gameLog?.$subscribe) {
            storeSubscription = window.$pinia.gameLog.$subscribe(
              (mutation, state) => {
                try {
                  callback({
                    gameLogSessionTable: state.gameLogSessionTable,
                    gameLogTable: state.gameLogTable,
                  });
                } catch (error) {
                  plugin.error(`Error in GAMELOG subscription:`, error);
                }
              }
            );
          }
          break;

        case "FRIENDS":
          if (window.$pinia?.friends?.$subscribe) {
            storeSubscription = window.$pinia.friends.$subscribe(
              (mutation, state) => {
                try {
                  callback({
                    friends: state.friends,
                    offlineFriends: state.offlineFriends,
                  });
                } catch (error) {
                  plugin.error(`Error in FRIENDS subscription:`, error);
                }
              }
            );
          }
          break;

        case "UI":
          if (window.$pinia?.ui?.$subscribe) {
            storeSubscription = window.$pinia.ui.$subscribe(
              (mutation, state) => {
                try {
                  callback({
                    menuActiveIndex: state.menuActiveIndex,
                  });
                } catch (error) {
                  plugin.error(`Error in UI subscription:`, error);
                }
              }
            );
          }
          break;

        default:
          plugin.error(`Unknown event type: ${eventType}`);
          return null;
      }

      if (storeSubscription) {
        // Wrap the Pinia unsubscribe to also remove from tracking
        unsubscribe = () => {
          if (storeSubscription && typeof storeSubscription === "function") {
            storeSubscription();
          }
        };

        // Register with plugin for automatic cleanup
        plugin.registerSubscription(unsubscribe);

        return unsubscribe;
      } else {
        // Store not available yet, retry
        setTimeout(() => {
          const result = setupSubscription();
          if (result) {
            plugin.logger?.log?.(
              `Successfully subscribed to ${eventType} after retry`
            );
          }
        }, 500);
        return null;
      }
    };

    return setupSubscription();
  }

  unregisterPlugin(pluginId) {
    const index = window.customjs.plugins.findIndex(
      (p) => p.metadata.id === pluginId
    );
    if (index === -1) return false;

    // Clean up subscriptions first
    this.unregisterSubscriptions(pluginId);

    window.customjs.plugins.splice(index, 1);
    return true;
  }

  getPlugin(pluginId) {
    return window.customjs.plugins.find((p) => p.metadata.id === pluginId);
  }

  /**
   * Wait for a plugin to be available
   * @param {string} pluginId - Plugin ID to wait for
   * @param {number} timeout - Timeout in milliseconds (default: 10000)
   * @returns {Promise<Plugin>} - Resolves with plugin instance
   */
  async waitForPlugin(pluginId, timeout = 10000) {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const plugin = this.getPlugin(pluginId);
      if (plugin && plugin.loaded) {
        return plugin;
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    throw new Error(`Timeout waiting for plugin: ${pluginId}`);
  }

  getAllPlugins() {
    return window.customjs.plugins;
  }

  async startAllPlugins() {
    console.log(
      `%c[CJS|PluginManager] %cCalling start() on ${window.customjs.plugins.length} plugins...`,
      "font-weight: bold; color: #4caf50",
      "color: #888"
    );

    for (const plugin of window.customjs.plugins) {
      try {
        // Enable plugin if not already enabled
        if (!plugin.enabled) {
          plugin.enabled = true; // Don't call enable() as it would trigger start()
        }

        // Call start()
        if (!plugin.started) {
          await plugin.start();
          console.log(
            `[CJS|PluginManager] ✓ Started ${plugin.metadata.name} v${plugin.metadata.version}`
          );
        }
      } catch (error) {
        console.error(
          `[CJS|PluginManager] ✗ Error starting ${plugin.metadata.name}:`,
          error
        );
      }
    }

    console.log(
      `%c[CJS|PluginManager] %c✓ All plugins started`,
      "font-weight: bold; color: #4caf50",
      "color: #888"
    );
  }

  async stopAllPlugins() {
    for (const plugin of window.customjs.plugins) {
      try {
        await plugin.stop();
      } catch (error) {
        console.error(
          `[CJS|PluginManager] Error stopping ${plugin.metadata.name}:`,
          error
        );
      }
    }
  }

  onLogin(callback) {
    if (this.isLoggedIn && this.hasTriggeredLogin) {
      const currentUser = window.$pinia?.user?.currentUser;
      try {
        callback(currentUser);
      } catch (error) {
        console.error(
          "%c[CJS|PluginManager]%c Error in login callback:",
          "color: #4caf50",
          "color: inherit",
          error
        );
      }
    } else {
      this.loginCallbacks.push(callback);
    }
  }

  async triggerLogin(currentUser) {
    if (this.hasTriggeredLogin) return;

    this.hasTriggeredLogin = true;
    this.isLoggedIn = true;

    const user = currentUser || window.$pinia?.user?.currentUser;
    console.log(`[CJS|✓ User logged in: ${user?.displayName || "Unknown"}`);

    // Trigger plugin onLogin methods
    for (const plugin of window.customjs.plugins) {
      try {
        if (plugin.enabled && typeof plugin.onLogin === "function") {
          await plugin.onLogin(user);
        }
      } catch (error) {
        console.error(
          `[CJS|PluginManager] Error in ${plugin.metadata.name}.onLogin:`,
          error
        );
      }
    }

    // Trigger registered callbacks
    for (const callback of this.loginCallbacks) {
      try {
        callback(user);
      } catch (error) {
        console.error(
          "%c[CJS|PluginManager]%c Error in login callback:",
          "color: #4caf50",
          "color: inherit",
          error
        );
      }
    }
  }

  startLoginMonitoring() {
    const setupWatch = () => {
      if (window.$pinia?.user?.$subscribe) {
        window.$pinia.user.$subscribe(() => {
          const currentUser = window.$pinia.user.currentUser;
          if (currentUser && currentUser.id && !this.hasTriggeredLogin) {
            this.triggerLogin(currentUser);
          }
        });
      } else {
        setTimeout(setupWatch, 500);
      }
    };

    setTimeout(setupWatch, 100);
  }

  registerPreHook(functionPath, callback, plugin) {
    window.customjs.hooks.pre[functionPath] =
      window.customjs.hooks.pre[functionPath] || [];
    window.customjs.hooks.pre[functionPath].push({ plugin, callback });

    // Try to wrap the function, or wait for it to exist
    this.wrapFunctionWhenReady(functionPath);

    console.log(
      `[CJS|PluginManager] Registered pre-hook for ${functionPath} from ${plugin.metadata.name}`
    );
  }

  registerPostHook(functionPath, callback, plugin) {
    window.customjs.hooks.post[functionPath] =
      window.customjs.hooks.post[functionPath] || [];
    window.customjs.hooks.post[functionPath].push({ plugin, callback });

    // Try to wrap the function, or wait for it to exist
    this.wrapFunctionWhenReady(functionPath);

    console.log(
      `[CJS|PluginManager] Registered post-hook for ${functionPath} from ${plugin.metadata.name}`
    );
  }

  registerVoidHook(functionPath, callback, plugin) {
    window.customjs.hooks.void[functionPath] =
      window.customjs.hooks.void[functionPath] || [];
    window.customjs.hooks.void[functionPath].push({ plugin, callback });

    // Try to wrap the function, or wait for it to exist
    this.wrapFunctionWhenReady(functionPath);

    console.log(
      `[CJS|PluginManager] Registered void-hook for ${functionPath} from ${plugin.metadata.name}`
    );
  }

  registerReplaceHook(functionPath, callback, plugin) {
    window.customjs.hooks.replace[functionPath] =
      window.customjs.hooks.replace[functionPath] || [];
    window.customjs.hooks.replace[functionPath].push({ plugin, callback });

    // Try to wrap the function, or wait for it to exist
    this.wrapFunctionWhenReady(functionPath);

    console.log(
      `[CJS|PluginManager] Registered replace-hook for ${functionPath} from ${plugin.metadata.name}`
    );
  }

  wrapFunctionWhenReady(functionPath, retries = 0, maxRetries = 10) {
    // Try to wrap immediately
    if (this.wrapFunction(functionPath)) {
      return true;
    }

    // If function doesn't exist yet, retry with exponential backoff
    if (retries < maxRetries) {
      const delay = Math.min(500 * Math.pow(1.5, retries), 5000);
      setTimeout(() => {
        console.log(
          `[CJS|PluginManager] Retrying to wrap ${functionPath} (attempt ${
            retries + 1
          }/${maxRetries})...`
        );
        this.wrapFunctionWhenReady(functionPath, retries + 1, maxRetries);
      }, delay);
    } else {
      console.warn(
        `[CJS|PluginManager] Failed to wrap ${functionPath} after ${maxRetries} attempts - function may not exist`
      );
    }

    return false;
  }

  wrapFunction(functionPath) {
    // Skip if already wrapped
    if (window.customjs.functions[functionPath]) {
      return true;
    }

    // Parse the function path (e.g., "AppApi.SendIpc" or "$pinia.notification.playNoty")
    const parts = functionPath.split(".");
    let obj = window;

    for (let i = 0; i < parts.length - 1; i++) {
      obj = obj[parts[i]];
      if (!obj) {
        // Path doesn't exist yet
        return false;
      }
    }

    const funcName = parts[parts.length - 1];
    const originalFunc = obj[funcName];

    if (typeof originalFunc !== "function") {
      // Not a function yet
      return false;
    }

    // Store original
    window.customjs.functions[functionPath] = originalFunc;

    // Create wrapped version
    obj[funcName] = function (...args) {
      // Check for void hooks first - they completely prevent function execution
      const voidHooks = window.customjs.hooks.void[functionPath] || [];
      if (voidHooks.length > 0) {
        for (const { plugin, callback } of voidHooks) {
          try {
            callback.call(plugin, args);
          } catch (error) {
            console.error(
              `[CJS|PluginManager] Error in void-hook for ${functionPath}:`,
              error
            );
          }
        }
        return; // Void the function - don't call original or any other hooks
      }

      // Call pre-hooks
      const preHooks = window.customjs.hooks.pre[functionPath] || [];
      for (const { plugin, callback } of preHooks) {
        try {
          callback.call(plugin, args);
        } catch (error) {
          console.error(
            `[CJS|PluginManager] Error in pre-hook for ${functionPath}:`,
            error
          );
        }
      }

      // Check for replace hooks - they replace the original function
      const replaceHooks = window.customjs.hooks.replace[functionPath] || [];
      let result;

      if (replaceHooks.length > 0) {
        // Chain replace hooks - each one calls the next, ending with the original
        let chainedFunction = originalFunc.bind(this);

        // Build chain from last to first, so first registered hook runs first
        for (let i = replaceHooks.length - 1; i >= 0; i--) {
          const { plugin, callback } = replaceHooks[i];
          const nextFunction = chainedFunction;

          chainedFunction = function (...hookArgs) {
            try {
              return callback.call(plugin, nextFunction, ...hookArgs);
            } catch (error) {
              console.error(
                `[CJS|PluginManager] Error in replace-hook for ${functionPath}:`,
                error
              );
              // On error, call the next function in chain
              return nextFunction.apply(this, hookArgs);
            }
          };
        }

        result = chainedFunction(...args);
      } else {
        // Call original function
        result = originalFunc.apply(this, args);
      }

      // Call post-hooks
      const postHooks = window.customjs.hooks.post[functionPath] || [];
      for (const { plugin, callback } of postHooks) {
        try {
          callback.call(plugin, result, args);
        } catch (error) {
          console.error(
            `[CJS|PluginManager] Error in post-hook for ${functionPath}:`,
            error
          );
        }
      }

      return result;
    };

    console.log(
      `%c[CJS|PluginManager]%c ✓ Wrapped function: ${functionPath}`,
      "color: #4caf50",
      "color: inherit"
    );
    return true;
  }

  /**
   * Setup a fallback logger if the main Logger class failed to load
   */
  setupFallbackLogger() {
    // Minimal Logger implementation for fallback
    window.customjs.Logger = class FallbackLogger {
      constructor(context = "CJS") {
        this.context = context;
      }

      log(msg, options = {}, level = "info") {
        const formattedMsg = `[CJS|${this.context}] ${msg}`;
        if (typeof console[level] === "function") {
          console[level](formattedMsg);
        } else {
          console.log(formattedMsg);
        }
      }

      logInfo(msg) {
        this.log(msg, {}, "info");
      }
      info(msg) {
        this.logInfo(msg);
      }

      logWarn(msg) {
        this.log(msg, {}, "warn");
      }
      warn(msg) {
        this.logWarn(msg);
      }

      logError(msg) {
        this.log(msg, {}, "error");
      }
      error(msg) {
        this.logError(msg);
      }

      logDebug(msg) {
        this.log(msg, {}, "log");
      }
      debug(msg) {
        this.logDebug(msg);
      }

      showInfo(msg) {
        console.log(`[CJS|${this.context}] ${msg}`);
      }
      showSuccess(msg) {
        console.log(`[CJS|${this.context}] ✓ ${msg}`);
      }
      showWarn(msg) {
        console.warn(`[CJS|${this.context}] ${msg}`);
      }
      showError(msg) {
        console.error(
          `%c[CJS|${this.context}]%c ${msg}`,
          "color: #4caf50",
          "color: inherit"
        );
      }

      async notifyDesktop(msg) {
        console.log(`[CJS|${this.context}] [Desktop] ${msg}`);
      }
      async notifyXSOverlay(msg) {
        console.log(`[CJS|${this.context}] [XSOverlay] ${msg}`);
      }
      async notifyOVRToolkit(msg) {
        console.log(`[CJS|${this.context}] [OVRToolkit] ${msg}`);
      }
      async notifyVR(msg) {
        console.log(`[CJS|${this.context}] [VR] ${msg}`);
      }

      logAndShow(msg, level = "info") {
        this.log(msg, {}, level);
      }
      logAndNotifyAll(msg, level = "info") {
        this.log(msg, {}, level);
      }
    };

    console.log(
      "%c[CJS|PluginManager]%c ✓ Fallback Logger class registered",
      "color: #4caf50",
      "color: inherit"
    );
  }

  /**
   * Get plugin configuration (merge defaults with loaded config)
   * @returns {object} - { url: enabled } mapping
   */
  getPluginConfig() {
    // Get defaults from PluginLoader
    const config = {};

    // Use defaultPlugins from PluginLoader if available
    if (window.customjs?.PluginLoader) {
      const tempLoader = new window.customjs.PluginLoader(null);
      tempLoader.defaultPlugins.forEach((plugin) => {
        config[plugin.url] = plugin.enabled;
      });
    }

    // Load from ConfigManager if available
    if (window.customjs?.configManager) {
      const loadedConfig = window.customjs.configManager.getPluginConfig();
      if (loadedConfig && typeof loadedConfig === "object") {
        // Merge loaded config (overrides defaults)
        Object.assign(config, loadedConfig);
      }
    }

    return config;
  }

  /**
   * Save plugin configuration to config system
   * @param {object} config - { url: enabled } mapping
   */
  savePluginConfig(config) {
    if (window.customjs?.configManager) {
      window.customjs.configManager.setPluginConfig(config);
    }
  }

  async loadAllPlugins() {
    // Core modules are already loaded by bootstrap in custom.js
    // Ensure Logger exists (provide fallback if loading failed)
    if (!window.customjs.Logger) {
      console.warn(
        "[CJS|PluginManager] Logger failed to load, using fallback console logger"
      );
      this.setupFallbackLogger();
    }

    // Phase 1: Initialize core modules
    console.log(
      `%c[CJS|PluginManager] %cInitializing core modules...`,
      "font-weight: bold; color: #4caf50",
      "color: #888"
    );

    // Initialize each core module in order
    if (window.customjs?.coreModules) {
      for (const [id, module] of window.customjs.coreModules) {
        try {
          if (typeof module.load === "function") {
            await module.load();
          }
          if (typeof module.start === "function") {
            await module.start();
          }
          console.log(
            `%c[CJS|PluginManager]%c ✓ Initialized core module: ${id}`,
            "color: #4caf50",
            "color: inherit"
          );
        } catch (error) {
          console.error(
            `[CJS|PluginManager] ✗ Error initializing ${id}:`,
            error
          );
        }
      }
    }

    // Phase 2: Get plugin list from config (merge with defaults)
    const pluginConfig = this.getPluginConfig();
    const enabledPlugins = Object.entries(pluginConfig)
      .filter(([url, enabled]) => enabled)
      .map(([url]) => url);

    console.log(
      `%c[CJS|PluginManager] %cLoading ${enabledPlugins.length} plugins from config...`,
      "font-weight: bold; color: #4caf50",
      "color: #888"
    );

    // Phase 3: Load enabled plugins using PluginLoader
    if (window.customjs?.PluginLoader) {
      const pluginLoader = new window.customjs.PluginLoader(this);

      for (const pluginUrl of enabledPlugins) {
        const success = await pluginLoader.loadPluginCode(pluginUrl);
        if (success) {
          this.loadedUrls.add(pluginUrl);
        } else {
          this.failedUrls.add(pluginUrl);
        }
      }

      console.log(
        `%c[CJS|PluginManager] %cPlugin code loading complete. Loaded: ${this.loadedUrls.size}, Failed: ${this.failedUrls.size}`,
        "font-weight: bold; color: #4caf50",
        "color: #888"
      );
    } else {
      console.error(
        "[CJS|PluginManager] PluginLoader not available - cannot load plugins"
      );
    }

    // Phase 4: Call load() on all plugins
    console.log(
      `%c[CJS|PluginManager] %cCalling load() on ${window.customjs.plugins.length} plugins...`,
      "font-weight: bold; color: #4caf50",
      "color: #888"
    );
    for (const plugin of window.customjs.plugins) {
      try {
        await plugin.load();
      } catch (error) {
        console.error(
          `[CJS|PluginManager] ✗ Error loading ${plugin.metadata.name}:`,
          error
        );
      }
    }

    // Phase 5: Call start() on all plugins
    await this.startAllPlugins();

    // Phase 6: Start login monitoring
    this.startLoginMonitoring();

    // Phase 7: Save plugin config
    this.savePluginConfig(pluginConfig);

    console.log(
      `%c[CJS|PluginManager] %c✓ Plugin system ready! Loaded ${enabledPlugins.length} plugins`,
      "font-weight: bold; color: #4caf50",
      "color: #0f0"
    );
  }

  async addPlugin(url) {
    if (this.loadedUrls.has(url)) {
      console.warn(
        `%c[CJS|PluginManager]%c Already loaded: ${url}`,
        "color: #4caf50",
        "color: inherit"
      );
      return { success: false, message: "Already loaded" };
    }

    try {
      // Load plugin code using PluginLoader
      if (!window.customjs?.PluginLoader) {
        throw new Error("PluginLoader not available");
      }

      const pluginLoader = new window.customjs.PluginLoader(this);
      const success = await pluginLoader.loadPluginCode(url);

      if (!success) {
        throw new Error("Failed to load plugin code");
      }

      this.loadedUrls.add(url);

      // Find the newly registered plugin
      const plugin = this.findPluginByUrl(url);
      if (plugin) {
        // Call load(), enable, and start()
        await plugin.load();
        await plugin.enable();
        await plugin.start();

        console.log(
          `[CJS|PluginManager] ✓ Successfully loaded and started: ${plugin.metadata.name}`
        );
      } else {
        console.warn(
          `[CJS|PluginManager] ⚠ Plugin loaded but not found: ${url}`
        );
      }

      // Add to plugin config
      const config = this.getPluginConfig();
      config[url] = true;
      this.savePluginConfig(config);

      return { success: true, message: "Loaded successfully" };
    } catch (error) {
      console.error(
        `%c[CJS|PluginManager]%c ✗ Failed to load: ${url}`,
        "color: #4caf50",
        "color: inherit",
        error
      );
      return { success: false, message: error.message };
    }
  }

  async removePlugin(url) {
    const plugin = this.findPluginByUrl(url);
    if (!plugin) {
      console.warn(
        `%c[CJS|PluginManager]%c Plugin not found for URL: ${url}`,
        "color: #4caf50",
        "color: inherit"
      );
      return { success: false, message: "Not found" };
    }

    await plugin.stop();
    this.unregisterPlugin(plugin.metadata.id);
    this.loadedUrls.delete(url);

    // Remove from plugin config
    const config = this.getPluginConfig();
    delete config[url];
    this.savePluginConfig(config);

    console.log(
      `%c[CJS|PluginManager]%c ✓ Removed: ${plugin.metadata.name}`,
      "color: #4caf50",
      "color: inherit"
    );
    console.warn(
      `%c[CJS|PluginManager]%c Note: Code remains in memory. Refresh VRCX for full removal.`,
      "color: #4caf50",
      "color: inherit"
    );
    return {
      success: true,
      message: "Removed (refresh to fully unload code)",
    };
  }

  async reloadPlugin(url) {
    console.log(
      `%c[CJS|PluginManager]%c Reloading: ${url}`,
      "color: #4caf50",
      "color: inherit"
    );
    await this.removePlugin(url);
    return await this.addPlugin(url);
  }

  async reloadAllPlugins() {
    console.log(
      `[CJS|PluginManager] Reloading all ${this.loadedUrls.size} plugins...`
    );

    const urls = Array.from(this.loadedUrls);
    const results = { success: [], failed: [] };

    for (const url of urls) {
      // Skip plugin.js base class
      if (url.endsWith("/plugin.js")) continue;

      try {
        await this.reloadPlugin(url);
        results.success.push(url);
      } catch (error) {
        results.failed.push({ url, error: error.message });
      }
    }

    console.log(
      `[CJS|PluginManager] Reload complete. Success: ${results.success.length}, Failed: ${results.failed.length}`
    );
    return results;
  }

  findPluginByUrl(url) {
    // Extract plugin ID from URL
    const pluginId = url.split("/").pop().replace(".js", "");
    return window.customjs.plugins.find((p) => p.metadata.id === pluginId);
  }

  getPluginList() {
    return {
      loaded: Array.from(this.loadedUrls),
      failed: Array.from(this.failedUrls),
      plugins: window.customjs.plugins.map((p) => ({
        id: p.metadata.id,
        name: p.metadata.name,
        version: p.metadata.version,
        build: p.metadata.build,
        enabled: p.enabled,
        loaded: p.loaded,
      })),
    };
  }
}

// Export for use by other plugins under window.customjs
if (typeof window !== "undefined") {
  window.customjs.Plugin = Plugin;
  window.customjs.PluginLoader = PluginLoader;
  window.customjs.PluginManager = PluginManager;
}
