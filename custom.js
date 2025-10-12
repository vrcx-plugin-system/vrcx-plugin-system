window.AppApi.ShowDevTools();
window.customjs = {
  version: "1.6.0",
  build: "1760406000",
};
window.customjs.config = {};

// Core modules that are not actual plugins
window.customjs.core_modules = [
  "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/logger.js",
  "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/config.js",
  "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/utils.js",
  "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/plugin.js",
];

// Default plugin configuration
window.customjs.default_plugins = [
  {
    url: "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/plugins/context-menu-api.js",
    enabled: true,
  },
  {
    url: "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/plugins/nav-menu-api.js",
    enabled: true,
  },
  {
    url: "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/plugins/protocol-links.js",
    enabled: true,
  },
  {
    url: "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/plugins/registry-overrides.js",
    enabled: true,
  },
  {
    url: "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/plugins/tag-manager.js",
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
    url: "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/plugins/plugin-manager-ui.js",
    enabled: false,
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
    url: "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/plugins/debug.js",
    enabled: false,
  },
  {
    url: "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/plugins/template.js",
    enabled: false,
  },
];

console.log(
  `%c[VRCX Custom] %cStarting Plugin System v${window.customjs.version} (Build: ${window.customjs.build})`,
  "font-weight: bold; color: #00ff00",
  "color: #888"
);
console.log(
  `%c[VRCX Custom] %cCache buster: ${Date.now()}`,
  "font-weight: bold; color: #00ff00",
  "color: #888"
);

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
      console.error("[CJS|[PluginManager] Invalid plugin registration");
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
    console.log(
      `[CJS|PluginManager] Registered plugin: ${plugin.metadata.name} v${plugin.metadata.version}`
    );
    return true;
  }

  unregisterPlugin(pluginId) {
    const index = window.customjs.plugins.findIndex(
      (p) => p.metadata.id === pluginId
    );
    if (index === -1) return false;

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
      "font-weight: bold; color: #ff9900",
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
      "font-weight: bold; color: #ff9900",
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
        console.error("[CJS|[PluginManager] Error in login callback:", error);
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
        console.error("[CJS|[PluginManager] Error in login callback:", error);
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

    console.log(`[CJS|[PluginManager] ✓ Wrapped function: ${functionPath}`);
    return true;
  }

  /**
   * Get plugin configuration (merge defaults with loaded config)
   * @returns {object} - { url: enabled } mapping
   */
  getPluginConfig() {
    // Start with defaults
    const config = {};
    window.customjs.default_plugins.forEach((plugin) => {
      config[plugin.url] = plugin.enabled;
    });

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
    // Phase 1: Load core modules first (always)
    console.log(
      `%c[CJS|PluginManager] %cLoading ${window.customjs.core_modules.length} core modules...`,
      "font-weight: bold; color: #00aaff",
      "color: #888"
    );

    for (const moduleUrl of window.customjs.core_modules) {
      await this.loadPluginCode(moduleUrl);
    }

    console.log(
      `%c[CJS|PluginManager] %cCore modules loaded`,
      "font-weight: bold; color: #00aaff",
      "color: #888"
    );

    // Phase 2: Initialize ConfigManager
    if (window.customjs?.configManager) {
      console.log(
        `%c[CJS|PluginManager] %cInitializing ConfigManager...`,
        "font-weight: bold; color: #00aaff",
        "color: #888"
      );
      try {
        await window.customjs.configManager.init();

        // Register loader settings (after init, before loading plugins)
        window.customjs.configManager.registerGeneralCategory(
          "loader",
          "Loader Settings",
          "Configuration for the plugin loader"
        );
        window.customjs.configManager.registerGeneralSetting(
          "loader",
          "loadTimeout",
          "Load Timeout",
          "number",
          10000,
          "Plugin load timeout in milliseconds"
        );

        console.log("[CJS|PluginManager] ✓ Loader settings registered");
      } catch (error) {
        console.error(
          "[CJS|PluginManager] ✗ Error initializing ConfigManager:",
          error
        );
      }
    }

    // Phase 3: Get plugin list from config (merge with defaults)
    const pluginConfig = this.getPluginConfig();
    const enabledPlugins = Object.entries(pluginConfig)
      .filter(([url, enabled]) => enabled)
      .map(([url]) => url);

    console.log(
      `%c[CJS|PluginManager] %cLoading ${enabledPlugins.length} plugins from config...`,
      "font-weight: bold; color: #00aaff",
      "color: #888"
    );

    if (window.$app?.playNoty) {
      window.$app.playNoty({
        message: `Loading ${enabledPlugins.length} plugins...`,
        type: "info",
      });
    }

    // Phase 4: Load enabled plugins
    for (const pluginUrl of enabledPlugins) {
      await this.loadPluginCode(pluginUrl);
    }

    console.log(
      `%c[CJS|PluginManager] %cPlugin code loading complete. Loaded: ${this.loadedUrls.size}, Failed: ${this.failedUrls.size}`,
      "font-weight: bold; color: #00aaff",
      "color: #888"
    );

    // Phase 5: Call load() on all plugins
    console.log(
      `%c[CJS|PluginManager] %cCalling load() on ${window.customjs.plugins.length} plugins...`,
      "font-weight: bold; color: #00aaff",
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

    // Phase 6: Setup config proxies (after all plugins have registered settings)
    if (window.customjs?.configManager) {
      window.customjs.configManager._setupProxies();
    }

    // Phase 7: Call start() on all plugins
    await this.startAllPlugins();

    // Phase 8: Start login monitoring
    this.startLoginMonitoring();

    // Phase 9: Save plugin config to disk
    this.savePluginConfig(pluginConfig);
    if (window.customjs?.configManager) {
      await window.customjs.configManager.save();
    }

    console.log(
      `%c[CJS|PluginManager] %c✓ Plugin system ready!`,
      "font-weight: bold; color: #00ff00",
      "color: #0f0"
    );

    if (window.$app?.playNoty) {
      window.$app.playNoty({
        text: `Loaded <strong>${pluginUrls.length}</strong> plugins...`,
        type: "success",
      });
    }
  }

  async loadPluginCode(pluginUrl) {
    try {
      const url = pluginUrl + "?v=" + Date.now();
      console.log(`[CJS|[PluginManager] Loading plugin code: ${pluginUrl}`);

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const pluginCode = await response.text();

      // Store the number of plugins before loading
      const pluginCountBefore = window.customjs.plugins.length;

      // Check if this is a core module (utility files, not plugins)
      const isUtilityFile = window.customjs.core_modules.some(
        (moduleUrl) => pluginUrl === moduleUrl
      );

      // Wrap in IIFE to isolate scope, but don't auto-execute plugin initialization
      const wrappedCode = `(function() { 
        // Store the plugin URL for auto-ID derivation
        window.__CURRENT_PLUGIN_URL__ = "${pluginUrl}";
        
        ${pluginCode}
        
        // After plugin class is defined, try to detect it and instantiate
        // (Skip for logger and base Plugin class)
        if (!${isUtilityFile} && typeof window.__LAST_PLUGIN_CLASS__ !== 'undefined') {
          try {
            const PluginClass = window.__LAST_PLUGIN_CLASS__;
            const pluginInstance = new PluginClass();
            console.log(\`[CJS|PluginManager] ✓ Instantiated plugin: \${pluginInstance.metadata.name} (\${pluginInstance.metadata.id})\`);
            delete window.__LAST_PLUGIN_CLASS__;
            delete window.__CURRENT_PLUGIN_URL__;
          } catch (e) {
            console.error('[CJS|[PluginManager] Error instantiating plugin:', e);
            delete window.__CURRENT_PLUGIN_URL__;
          }
        }
      })();`;

      // Inject code
      const script = document.createElement("script");
      script.type = "text/javascript";
      script.textContent = wrappedCode;
      script.dataset.pluginUrl = pluginUrl;

      const loadPromise = new Promise((resolve, reject) => {
        // Get loadTimeout from config or use default
        const loadTimeout = window.customjs?.config?.loader?.loadTimeout || 10000;
        
        const timeout = setTimeout(() => {
          reject(new Error(`Plugin load timeout: ${pluginUrl}`));
        }, loadTimeout);

        script.onerror = () => {
          clearTimeout(timeout);
          reject(new Error(`Script error loading plugin`));
        };

        // Give the script time to execute and register
        setTimeout(() => {
          clearTimeout(timeout);

          // Check if a new plugin was registered (skip check for utility files)
          if (!isUtilityFile) {
            const pluginCountAfter = window.customjs.plugins.length;
            if (pluginCountAfter > pluginCountBefore) {
              const newPlugin = window.customjs.plugins[pluginCountAfter - 1];
              console.log(
                `[CJS|PluginManager] ✓ Loaded ${newPlugin.metadata.name} v${newPlugin.metadata.version} (${newPlugin.metadata.build})`
              );
            } else {
              console.warn(
                `[CJS|PluginManager] ⚠ No plugin registered from ${pluginUrl}`
              );
            }
          } else {
            // Core module loaded
            const moduleName = pluginUrl.split("/").pop();
            const displayName = moduleName
              ? moduleName.replace(".js", "")
              : "unknown";
            console.log(
              `[CJS|PluginManager] ✓ Loaded core module: ${displayName}`
            );
          }

          this.loadedUrls.add(pluginUrl);
          resolve();
        }, 100);
      });

      document.head.appendChild(script);
      await loadPromise;
    } catch (error) {
      console.error(
        `[CJS|PluginManager] ✗ Error loading plugin ${pluginUrl}:`,
        error
      );
      this.failedUrls.add(pluginUrl);
    }
  }

  async addPlugin(url) {
    if (this.loadedUrls.has(url)) {
      console.warn(`[CJS|[PluginManager] Already loaded: ${url}`);
      return { success: false, message: "Already loaded" };
    }

    try {
      // Load plugin code (this will instantiate it)
      await this.loadPluginCode(url);

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
          `[CJS|[PluginManager] ⚠ Plugin loaded but not found: ${url}`
        );
      }

      // Add to plugin config and save
      const config = this.getPluginConfig();
      config[url] = true;
      this.savePluginConfig(config);
      if (window.customjs?.configManager) {
        await window.customjs.configManager.save();
      }

      return { success: true, message: "Loaded successfully" };
    } catch (error) {
      console.error(`[CJS|[PluginManager] ✗ Failed to load: ${url}`, error);
      return { success: false, message: error.message };
    }
  }

  async removePlugin(url) {
    const plugin = this.findPluginByUrl(url);
    if (!plugin) {
      console.warn(`[CJS|[PluginManager] Plugin not found for URL: ${url}`);
      return { success: false, message: "Not found" };
    }

    await plugin.stop();
    this.unregisterPlugin(plugin.metadata.id);
    this.loadedUrls.delete(url);

    // Remove from plugin config and save
    const config = this.getPluginConfig();
    delete config[url];
    this.savePluginConfig(config);
    if (window.customjs?.configManager) {
      await window.customjs.configManager.save();
    }

    console.log(`[CJS|[PluginManager] ✓ Removed: ${plugin.metadata.name}`);
    console.warn(
      `[CJS|PluginManager] Note: Code remains in memory. Refresh VRCX for full removal.`
    );
    return {
      success: true,
      message: "Removed (refresh to fully unload code)",
    };
  }

  async reloadPlugin(url) {
    console.log(`[CJS|[PluginManager] Reloading: ${url}`);
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

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    const manager = new PluginManager();
    manager.loadAllPlugins();
  });
} else {
  const manager = new PluginManager();
  manager.loadAllPlugins();
}
