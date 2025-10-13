window.AppApi.ShowDevTools();
window.customjs = {
  version: "2.3.0",
  build: "1728840100",
  // Centralized log colors for different components
  logColors: {
    CustomJS: "#00ff88", // Bright green for main CustomJS
    PluginLoader: "#2196f3", // Blue for PluginLoader
    PluginManager: "#4caf50", // Green for PluginManager
    Plugin: "#888888", // Gray for individual plugins
    Config: "#ff9800", // Orange for config-related
    Utils: "#9c27b0", // Purple for utilities
  },
};

console.log(
  `%c[CJS] Starting Plugin System v${window.customjs.version} (Build: ${window.customjs.build})`,
  `color: ${window.customjs.logColors.CustomJS}`
);
console.log(`%c[CJS] Cache buster: ${Date.now()}`, `color: ${window.customjs.logColors.CustomJS}`);

// ============================================================================
// MODULE BASE CLASSES
// ============================================================================

/**
 * Base Module class - shared functionality for all modules (core and plugins)
 */
class Module {
  constructor(metadata = {}) {
    this.metadata = {
      id: metadata.id || "unknown",
      name: metadata.name || "Unknown Module",
      description: metadata.description || "",
      author: metadata.author || "Unknown",
      version: metadata.version || "1.0.0",
      build: metadata.build || Date.now().toString(),
      url: metadata.url || null,
    };

    this.loaded = false;
    this.started = false;

    // Resource tracking for automatic cleanup
    this.resources = {
      timers: new Set(),
      observers: new Set(),
      listeners: new Map(),
      subscriptions: new Set(),
    };
  }

  /**
   * Called to load/initialize the module
   */
  async load() {
    this.log("load() called - Override this method");
    this.loaded = true;
  }

  /**
   * Called to start the module after all dependencies loaded
   */
  async start() {
    this.log("start() called - Override this method");
    this.started = true;
  }

  /**
   * Called to stop/cleanup the module
   */
  async stop() {
    this.log("stop() called - Override this method");
    this.started = false;
    this.cleanupResources();
  }

  /**
   * Register a timer for automatic cleanup
   */
  registerTimer(timerId) {
    this.resources.timers.add(timerId);
    return timerId;
  }

  /**
   * Register an observer for automatic cleanup
   */
  registerObserver(observer) {
    this.resources.observers.add(observer);
    return observer;
  }

  /**
   * Register an event listener for automatic cleanup
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
   * Register a subscription for automatic cleanup
   */
  registerSubscription(unsubscribe) {
    this.resources.subscriptions.add(unsubscribe);
    return unsubscribe;
  }

  /**
   * Clean up all tracked resources
   */
  cleanupResources() {
    let cleanupCount = 0;

    this.resources.timers.forEach((timerId) => {
      clearInterval(timerId);
      clearTimeout(timerId);
      cleanupCount++;
    });
    this.resources.timers.clear();

    this.resources.observers.forEach((observer) => {
      observer.disconnect();
      cleanupCount++;
    });
    this.resources.observers.clear();

    this.resources.listeners.forEach((listeners, element) => {
      listeners.forEach(({ event, handler, options }) => {
        element.removeEventListener(event, handler, options);
        cleanupCount++;
      });
    });
    this.resources.listeners.clear();

    this.resources.subscriptions.forEach((unsubscribe) => {
      if (typeof unsubscribe === "function") {
        try {
          unsubscribe();
          cleanupCount++;
        } catch (error) {
          this.error(`Error unsubscribing: ${error.message}`);
        }
      }
    });
    this.resources.subscriptions.clear();

    if (cleanupCount > 0) {
      this.log(`✓ Cleaned up ${cleanupCount} resources`);
    }
  }

  /**
   * Logging methods (with fallback if Logger not available)
   */
  log(message, ...args) {
    const color = this.getLogColor ? this.getLogColor() : "#888";
    console.log(
      `%c[CJS|${this.metadata.id}]%c ${message}`,
      `color: ${color}`,
      "color: inherit",
      ...args
    );
  }

  warn(message, ...args) {
    const color = this.getLogColor ? this.getLogColor() : "#888";
    console.warn(
      `%c[CJS|${this.metadata.id}]%c ${message}`,
      `color: ${color}`,
      "color: inherit",
      ...args
    );
  }

  error(message, ...args) {
    const color = this.getLogColor ? this.getLogColor() : "#888";
    console.error(
      `%c[CJS|${this.metadata.id}]%c ${message}`,
      `color: ${color}`,
      "color: inherit",
      ...args
    );
  }
}

/**
 * CoreModule class - for core system modules (logger, config, etc.)
 */
class CoreModule extends Module {
  constructor(metadata = {}) {
    super(metadata);
    this.isCoreModule = true;

    // Register core module globally
    if (!window.customjs.coreModules) {
      window.customjs.coreModules = new Map();
    }
    window.customjs.coreModules.set(this.metadata.id, this);
  }

  /**
   * Get color for this core module
   */
  getLogColor() {
    const colors = {
      logger: "#00bcd4", // cyan
      utils: "#ff9800", // orange
      config: "#e91e63", // magenta
      plugin: "#ffc107", // yellow
    };
    return colors[this.metadata.id] || "#888";
  }

  /**
   * Get value from localStorage (direct access, no ConfigManager needed)
   * @param {string} key - Key to get (will be prefixed with "customjs.")
   * @param {any} defaultValue - Default value if not found
   * @returns {any} Value from storage or default
   */
  get(key, defaultValue = null) {
    try {
      const fullKey = `customjs.${key}`;
      const stored = localStorage.getItem(fullKey);

      if (stored === null) {
        return defaultValue;
      }

      // Try to parse as JSON
      try {
        return JSON.parse(stored);
      } catch {
        // If not JSON, return as string
        return stored;
      }
    } catch (error) {
      this.error(`Error getting ${key}: ${error.message}`);
      return defaultValue;
    }
  }

  /**
   * Set value in localStorage (direct access, no ConfigManager needed)
   * @param {string} key - Key to set (will be prefixed with "customjs.")
   * @param {any} value - Value to store
   * @returns {boolean} Success status
   */
  set(key, value) {
    try {
      const fullKey = `customjs.${key}`;
      const jsonValue = JSON.stringify(value);
      localStorage.setItem(fullKey, jsonValue);
      return true;
    } catch (error) {
      this.error(`Error setting ${key}: ${error.message}`);
      return false;
    }
  }

  /**
   * Delete value from localStorage (direct access, no ConfigManager needed)
   * @param {string} key - Key to delete (will be prefixed with "customjs.")
   * @returns {boolean} Success status
   */
  delete(key) {
    try {
      const fullKey = `customjs.${key}`;
      localStorage.removeItem(fullKey);
      return true;
    } catch (error) {
      this.error(`Error deleting ${key}: ${error.message}`);
      return false;
    }
  }

  /**
   * Check if key exists in localStorage (direct access, no ConfigManager needed)
   * @param {string} key - Key to check (will be prefixed with "customjs.")
   * @returns {boolean} True if key exists
   */
  has(key) {
    const fullKey = `customjs.${key}`;
    return localStorage.getItem(fullKey) !== null;
  }
}

// ============================================================================
// MODULE LOADER BASE CLASS
// ============================================================================

/**
 * Base ModuleLoader class - handles loading and retry logic
 */
class ModuleLoader {
  constructor() {
    this.loadedUrls = new Set();
    this.failedUrls = new Set();
    this.retryAttempts = new Map(); // url -> attempt count
    this.maxRetries = 3;

    // Core modules to load (can be overridden in subclasses)
    this.coreModules = [
      "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/logger.js",
      "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/utils.js",
      "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/config.js",
      "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/plugin.js",
    ];
  }

  /**
   * Load module code from URL with retry logic
   * @param {string} moduleUrl - URL to load
   * @param {number} timeout - Load timeout in ms
   * @returns {Promise<boolean>} Success status
   */
  async loadModuleCode(moduleUrl, timeout = 10000) {
    const attempts = this.retryAttempts.get(moduleUrl) || 0;

    try {
      const url = moduleUrl + "?v=" + Date.now();
      this.log(
        `Loading module: ${moduleUrl} (attempt ${attempts + 1}/${
          this.maxRetries
        })`
      );

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const code = await response.text();

      // Inject code
      const script = document.createElement("script");
      script.type = "text/javascript";
      script.textContent = code;
      script.dataset.moduleUrl = moduleUrl;

      const loadPromise = new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error(`Module load timeout: ${moduleUrl}`));
        }, timeout);

        script.onerror = () => {
          clearTimeout(timeoutId);
          reject(new Error(`Script error loading module`));
        };

        setTimeout(() => {
          clearTimeout(timeoutId);
          resolve();
        }, 100);
      });

      document.head.appendChild(script);
      await loadPromise;

      this.loadedUrls.add(moduleUrl);
      this.retryAttempts.delete(moduleUrl);
      this.log(`✓ Loaded module: ${moduleUrl}`);
      return true;
    } catch (error) {
      this.retryAttempts.set(moduleUrl, attempts + 1);

      if (attempts + 1 >= this.maxRetries) {
        this.failedUrls.add(moduleUrl);
        this.error(
          `✗ Failed to load module after ${this.maxRetries} attempts: ${moduleUrl}`,
          error
        );
        return false;
      } else {
        this.warn(
          `⚠ Retry ${attempts + 1}/${this.maxRetries} for: ${moduleUrl}`
        );
        // Retry
        await new Promise((resolve) =>
          setTimeout(resolve, 1000 * (attempts + 1))
        );
        return await this.loadModuleCode(moduleUrl, timeout);
      }
    }
  }

  /**
   * Load multiple modules with retry logic
   * @param {string[]} moduleUrls - URLs to load
   * @param {number} initialDelay - Delay before loading first module (ms)
   * @returns {Promise<boolean>} True if all succeeded
   */
  async loadModules(moduleUrls, initialDelay = 0) {
    if (initialDelay > 0) {
      this.log(`Waiting ${initialDelay}ms before loading modules...`);
      await new Promise((resolve) => setTimeout(resolve, initialDelay));
    }

    for (const moduleUrl of moduleUrls) {
      const success = await this.loadModuleCode(moduleUrl);
      if (!success) {
        const moduleName = moduleUrl.split("/").pop();
        alert(
          `CustomJS: Failed to load core module "${moduleName}" after ${this.maxRetries} attempts. The plugin system cannot continue.`
        );
        throw new Error(`Critical module load failure: ${moduleUrl}`);
      }
    }

    return true;
  }

  log(message, ...args) {
    console.log(
      `%c[CJS|ModuleLoader]%c ${message}`,
      "color: #2196f3",
      "color: inherit",
      ...args
    );
  }

  warn(message, ...args) {
    console.warn(
      `%c[CJS|ModuleLoader]%c ${message}`,
      "color: #2196f3",
      "color: inherit",
      ...args
    );
  }

  error(message, ...args) {
    console.error(
      `%c[CJS|ModuleLoader]%c ${message}`,
      "color: #2196f3",
      "color: inherit",
      ...args
    );
  }
}

// Export base classes globally under window.customjs
if (typeof window !== "undefined") {
  window.customjs.Module = Module;
  window.customjs.CoreModule = CoreModule;
  window.customjs.ModuleLoader = ModuleLoader;
}

// ============================================================================
// BOOTSTRAP
// ============================================================================

// Bootstrap function: Load core modules, then start plugin system
async function bootstrapPluginSystem() {
  try {
    // Step 1: Use ModuleLoader to load core modules (including plugin.js)
    const moduleLoader = new window.customjs.ModuleLoader();

    console.log(
      `%c[CJS] %cLoading ${moduleLoader.coreModules.length} core modules...`,
      "font-weight: bold; color: #00ff88",
      "color: #888"
    );

    await moduleLoader.loadModules(moduleLoader.coreModules, 3000);

    // Step 2: Verify PluginManager is now available (loaded from plugin.js)
    if (!window.customjs.PluginManager) {
      throw new Error("PluginManager not available after loading core modules");
    }

    console.log(
      `%c[CJS] %cCore modules loaded, initializing plugin system...`,
      "font-weight: bold; color: #00ff88",
      "color: #888"
    );

    // Step 3: Instantiate PluginManager and load plugins
    const manager = new window.customjs.PluginManager();
    await manager.loadAllPlugins();
  } catch (error) {
    console.error("[CJS] Bootstrap failed:", error);
    alert(
      `CustomJS: Failed to initialize plugin system.\n\n${error.message}\n\nCheck console for details.`
    );
  }
}

// Wait for DOM ready, then bootstrap
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootstrapPluginSystem);
} else {
  bootstrapPluginSystem();
}
