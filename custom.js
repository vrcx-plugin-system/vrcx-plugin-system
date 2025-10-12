window.AppApi.ShowDevTools();
window.customjs = {
  version: "2.0.0",
  build: "1760486400",
};

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
    console.log(`[CJS|${this.metadata.id}] ${message}`, ...args);
  }

  warn(message, ...args) {
    console.warn(`[CJS|${this.metadata.id}] ${message}`, ...args);
  }

  error(message, ...args) {
    console.error(`[CJS|${this.metadata.id}] ${message}`, ...args);
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
          `VRCX Custom: Failed to load core module "${moduleName}" after ${this.maxRetries} attempts. The plugin system cannot continue.`
        );
        throw new Error(`Critical module load failure: ${moduleUrl}`);
      }
    }

    return true;
  }

  log(message, ...args) {
    console.log(`[CJS|ModuleLoader] ${message}`, ...args);
  }

  warn(message, ...args) {
    console.warn(`[CJS|ModuleLoader] ${message}`, ...args);
  }

  error(message, ...args) {
    console.error(`[CJS|ModuleLoader] ${message}`, ...args);
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

// Wait for DOM ready, then instantiate PluginManager from plugin.js
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    const manager = new window.customjs.PluginManager();
    manager.loadAllPlugins();
  });
} else {
  const manager = new window.customjs.PluginManager();
  manager.loadAllPlugins();
}
