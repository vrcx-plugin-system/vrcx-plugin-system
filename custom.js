// ============================================================================
// VRCX CUSTOM PLUGINS SYSTEM v2.2.1
// Build: 1760196000
// ============================================================================

// DO NOT REPLACE THESE VALUES - THEY ARE REPLACED BY THE UPDATE SCRIPT
window.customjs = {
  version: "{VERSION}",
  build: "{BUILD}",
};

// ============================================================================
// USER CONFIGURATION
// ============================================================================

window.customjs.config = {
  steam: {
    id: "{env:STEAM_ID64}",
    key: "{env:STEAM_API_KEY}",
  },
  bio: {
    updateInterval: 7200000, // 2 hours
    initialDelay: 20000, // 20 seconds
    template: `
-
Relationship: {partners} <3
Auto Accept: {autojoin}
Auto Invite: {autoinvite}

Real Rank: {rank}
Friends: {friends} | Blocked: {blocked} | Muted: {muted}
Time played: {playtime}
Date joined: {date_joined}
Last updated: {now} (every 2h)
Tags loaded: {tags_loaded}

User ID: {userId}
Steam ID: {steamId}
Oculus ID: {oculusId}`,
  },
  registry: {
    VRC_ALLOW_UNTRUSTED_URL: {
      value: 0,
      events: [
        "VRCX_START",
        "GAME_START",
        "INSTANCE_SWITCH_PUBLIC",
        "INSTANCE_SWITCH_PRIVATE",
      ],
    },
  },
  tags: {
    urls: [
      "https://github.com/Bluscream/FewTags/raw/refs/heads/main/usertags.json",
    ],
    updateInterval: 3600000,
    initialDelay: 5000,
  },
  webhook: "http://homeassistant.local:8123/api/webhook/vrcx",
};

// ============================================================================
// PLUGIN CONFIGURATION - List of plugins to load
// ============================================================================

window.customjs.pluginConfig = {
  plugins: [
    // Logger must be loaded first (before Plugin base class)
    "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/logger.js",
    // Base Plugin class must be loaded second
    "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/plugin.js",
    // Core plugins
    "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/plugins/config.js",
    "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/plugins/utils.js",
    "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/plugins/api-helpers.js",
    // UI plugins
    "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/plugins/context-menu-api.js",
    "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/plugins/nav-menu-api.js",
    // Feature plugins
    "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/plugins/protocol-links.js",
    "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/plugins/registry-overrides.js",
    "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/plugins/tag-manager.js",
    // "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/plugins/bio-updater.js",
    "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/plugins/auto-invite.js",
    "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/plugins/managers.js",
    "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/plugins/plugin-manager-ui.js",
    // Optional/Debug plugins (uncomment to enable)
    // "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/plugins/debug.js",
    // "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/plugins/template.js",
  ],
  loadTimeout: 10000,
};

// ============================================================================
// PLUGIN MANAGER - Central plugin management and loading system
// ============================================================================

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

  // ============================================================================
  // PLUGIN REGISTRATION
  // ============================================================================

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

  // ============================================================================
  // LIFECYCLE MANAGEMENT
  // ============================================================================

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

  // ============================================================================
  // LOGIN MONITORING
  // ============================================================================

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

  // ============================================================================
  // HOOK SYSTEM
  // ============================================================================

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

      // Call original function
      const result = originalFunc.apply(this, args);

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

  // ============================================================================
  // PLUGIN LOADING
  // ============================================================================

  async loadAllPlugins() {
    const pluginUrls = window.customjs.pluginConfig.plugins;

    console.log(
      `%c[CJS|PluginManager] %cLoading ${pluginUrls.length} plugins from URLs...`,
      "font-weight: bold; color: #00aaff",
      "color: #888"
    );

    if (window.$app?.playNoty) {
      window.$app.playNoty({
        message: `Loading ${pluginUrls.length} plugins...`,
        type: "info",
      });
    }

    // Phase 1: Load all plugin code (instantiate plugins)
    for (const pluginUrl of pluginUrls) {
      await this.loadPluginCode(pluginUrl);
    }

    console.log(
      `%c[CJS|PluginManager] %cPlugin code loading complete. Loaded: ${this.loadedUrls.size}, Failed: ${this.failedUrls.size}`,
      "font-weight: bold; color: #00aaff",
      "color: #888"
    );

    // Phase 2: Call load() on all plugins
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

    // Phase 3: Call start() on all plugins
    await this.startAllPlugins();

    // Phase 4: Start login monitoring
    this.startLoginMonitoring();

    // Phase 5: Print available commands
    this.printAvailableCommands();

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

      // Check if this is the base Plugin class
      const isBaseClass = pluginUrl.includes("/plugin.js");

      // Wrap in IIFE to isolate scope, but don't auto-execute plugin initialization
      const wrappedCode = `(function() { 
        // Store the plugin URL for auto-ID derivation
        window.__CURRENT_PLUGIN_URL__ = "${pluginUrl}";
        
        ${pluginCode}
        
        // After plugin class is defined, try to detect it and instantiate
        // (Skip for base Plugin class)
        if (!${isBaseClass} && typeof window.__LAST_PLUGIN_CLASS__ !== 'undefined') {
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
        const timeout = setTimeout(() => {
          reject(new Error(`Plugin load timeout: ${pluginUrl}`));
        }, window.customjs.pluginConfig.loadTimeout);

        script.onerror = () => {
          clearTimeout(timeout);
          reject(new Error(`Script error loading plugin`));
        };

        // Give the script time to execute and register
        setTimeout(() => {
          clearTimeout(timeout);

          // Check if a new plugin was registered (skip check for base class)
          if (!isBaseClass) {
            const pluginCountAfter = window.customjs.plugins.length;
            if (pluginCountAfter > pluginCountBefore) {
              const newPlugin = window.customjs.plugins[pluginCountAfter - 1];
              console.log(
                `[CJS|PluginManager] ✓ Loaded ${newPlugin.metadata.name} v${newPlugin.metadata.version}`
              );
            } else {
              console.warn(
                `[CJS|PluginManager] ⚠ No plugin registered from ${pluginUrl}`
              );
            }
          } else {
            console.log(`[CJS|[PluginManager] ✓ Loaded base Plugin class`);
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

  // ============================================================================
  // DYNAMIC PLUGIN MANAGEMENT
  // ============================================================================

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

  printAvailableCommands() {
    console.log(`[CJS|
═══════════════════════════════════════════════════════════
  VRCX Custom Plugins System v${window.customjs.version}
  
  Plugin Access:
  
  customjs.plugins                          - Array of all Plugin instances
  customjs.pluginManager.getPluginList()    - Get detailed plugin info
  customjs.pluginManager.getPlugin(id)      - Get plugin by ID
  customjs.pluginManager.findPluginByUrl(url) - Find plugin by URL
  
  Plugin Loading:
  
  customjs.pluginManager.addPlugin(url)     - Load new plugin
  customjs.pluginManager.removePlugin(url)  - Unload plugin
  customjs.pluginManager.reloadPlugin(url)  - Reload specific plugin
  customjs.pluginManager.reloadAllPlugins() - Reload all plugins
  
  Plugin Control:
  
  customjs.pluginManager.onLogin(callback)  - Register login callback
  customjs.plugins[0].enable()              - Enable a plugin
  customjs.plugins[0].disable()             - Disable a plugin
  customjs.plugins[0].toggle()              - Toggle plugin state
  
  Examples:
    customjs.pluginManager.addPlugin("https://example.com/plugin.js")
    customjs.plugins.find(p => p.metadata.id === "utils").toggle()
    customjs.pluginManager.onLogin((user) => console.log(user.displayName))
═══════════════════════════════════════════════════════════
    `);
  }
}

// Note: All plugin management is now under customjs.pluginManager
// Access plugins via: customjs.plugins (array of Plugin instances)
// Manage plugins via: customjs.pluginManager.addPlugin(), removePlugin(), etc.

// ============================================================================
// INITIALIZATION
// ============================================================================

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    const manager = new PluginManager();
    manager.loadAllPlugins();
  });
} else {
  const manager = new PluginManager();
  manager.loadAllPlugins();
}
