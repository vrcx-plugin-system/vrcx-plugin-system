console.log(
  `custom.js START - Version {VERSION} - Build: {BUILD} - Cache Buster: ${Date.now()}`
);

// ============================================================================
// USER CONFIGURATION
// ============================================================================

// User-configurable settings
const USER_CONFIG = {
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
    // Registry settings to apply/override
    // Can be simple key-value pairs or objects with value and events
    VRC_ALLOW_UNTRUSTED_URL: {
      value: 0,
      events: [
        "VRCX_START",
        "GAME_START",
        "INSTANCE_SWITCH_PUBLIC",
        "INSTANCE_SWITCH_PRIVATE",
      ],
    },
    // Simple format (applies on all events):
    // VRC_SOME_OTHER_SETTING: 1,
    // VRC_ANOTHER_STRING_SETTING: "value"
  },
  tags: {
    // URLs to JSON files containing custom tags
    // Each JSON file should contain user objects with tags arrays
    urls: [
      "https://github.com/Bluscream/FewTags/raw/refs/heads/main/usertags.json",
    ],
    // Update interval in milliseconds (default: 1 hour)
    updateInterval: 3600000,
    // Initial delay before first fetch (default: 5 seconds)
    initialDelay: 5000,
  },
  webhook: "http://homeassistant.local:8123/api/webhook/vrcx", // Example: "http://homeassistant.local:8123/api/webhook/vrcx_notifications"
};

// ============================================================================
// MODULE LOADER & LIFECYCLE MANAGEMENT
// ============================================================================

/**
 * Plugin Lifecycle Hooks:
 *
 * on_startup() - Called immediately when the module loads (before login)
 *   Use for: Setting up overrides, UI modifications, event listeners
 *   Examples: context-menu, protocol-links, managers
 *   Signature: () => void
 *
 * on_login(currentUser) - Called after successful VRChat login
 *   Use for: Loading user data, API calls requiring authentication
 *   Examples: bio-updater, tag-manager
 *   Signature: (currentUser) => void
 *   Parameters:
 *     - currentUser: The logged-in user object from window.$pinia.user.currentUser
 *
 * Usage in your module:
 *   window.on_startup(() => {
 *       console.log('Module starting...');
 *   });
 *
 *   window.on_login((currentUser) => {
 *       console.log(`User ${currentUser.displayName} logged in!`);
 *   });
 */

// Configuration for module loading
const MODULE_CONFIG = {
  // GitHub URLs for modules (loaded in dependency order)
  modules: [
    "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/config.js",
    "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/utils.js",
    "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/api-helpers.js",
    "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/context-menu.js",
    "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/protocol-links.js",
    "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/registry-overrides.js",
    "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/tag-manager.js",
    "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/bio-updater.js",
    "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/auto-invite.js",
    "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/managers.js",
    // Uncomment below to enable comprehensive debug logging:
    // "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/debug.js",
  ],
  // Load timeout in milliseconds
  loadTimeout: 10000,
};

// Lifecycle manager for plugin hooks
class LifecycleManager {
  constructor() {
    this.startupCallbacks = [];
    this.loginCallbacks = [];
    this.isLoggedIn = false;
    this.hasTriggeredLogin = false;
  }

  onStartup(callback) {
    this.startupCallbacks.push(callback);
  }

  onLogin(callback) {
    if (this.isLoggedIn && this.hasTriggeredLogin) {
      // Already logged in, execute immediately with current user
      try {
        const currentUser = window.$pinia?.user?.currentUser;
        callback(currentUser);
      } catch (error) {
        console.error("Error in login callback:", error);
      }
    } else {
      this.loginCallbacks.push(callback);
    }
  }

  triggerStartup() {
    for (const callback of this.startupCallbacks) {
      try {
        callback();
      } catch (error) {
        console.error("Error in startup callback:", error);
      }
    }
  }

  triggerLogin(currentUser) {
    if (this.hasTriggeredLogin) return; // Only trigger once

    this.hasTriggeredLogin = true;
    this.isLoggedIn = true;

    // Get current user if not provided
    const user = currentUser || window.$pinia?.user?.currentUser;
    console.log(`✓ User logged in: ${user?.displayName || "Unknown"}`);

    for (const callback of this.loginCallbacks) {
      try {
        callback(user);
      } catch (error) {
        console.error("Error in login callback:", error);
      }
    }
  }

  startLoginMonitoring() {
    // Delay setup to ensure $app is fully initialized
    setTimeout(() => {
      const setupWatch = () => {
        // Try to use Vue's watch API for reactive login detection
        if (window.$app && typeof window.$app.$watch === "function") {
          // Watch for currentUser changes (indicates login/logout)
          window.$app.$watch(
            () => window.$pinia?.user?.currentUser,
            (currentUser) => {
              if (currentUser && currentUser.id && !this.hasTriggeredLogin) {
                this.triggerLogin(currentUser);
              }
            },
            { immediate: true } // Check immediately in case already logged in
          );
        } else {
          // Fallback to polling if watch API not available
          const checkLogin = () => {
            const currentUser = window.$pinia?.user?.currentUser;
            if (currentUser && currentUser.id && !this.hasTriggeredLogin) {
              this.triggerLogin(currentUser);
            } else {
              setTimeout(checkLogin, 500);
            }
          };

          setTimeout(checkLogin, 500);
        }
      };

      setupWatch();
    }, 100); // Small delay to ensure $app is ready
  }
}

// Module loader class
class ModuleLoader {
  constructor() {
    this.loadedModules = new Set();
    this.failedModules = new Set();
    this.lifecycle = new LifecycleManager();

    // Expose lifecycle hooks IMMEDIATELY before loading any modules
    this.setupLifecycleHooks();
  }

  setupLifecycleHooks() {
    // Create global customjs namespace early
    window.customjs = window.customjs || {};

    // Expose lifecycle manager and hooks BEFORE modules load
    window.customjs.lifecycle = this.lifecycle;
    window.on_startup = this.lifecycle.onStartup.bind(this.lifecycle);
    window.on_login = this.lifecycle.onLogin.bind(this.lifecycle);
  }

  async loadAllModules() {
    console.log("Loading VRCX custom modules from GitHub...");

    // Load GitHub modules
    for (const module of MODULE_CONFIG.modules) {
      await this.loadModule(module);
    }

    console.log(
      `Module loading complete. Loaded: ${this.loadedModules.size}, Failed: ${this.failedModules.size}`
    );

    // Initialize systems after all modules are loaded
    this.initializeSystems();
  }

  async loadModule(modulePath) {
    try {
      // Add cache-busting parameter to force fresh fetch
      const url = modulePath + "?v=" + Date.now();
      console.log(`Loading module: ${modulePath}`);

      // Fetch the module content first to handle MIME type issues
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const moduleCode = await response.text();

      // Wrap the module code in an IIFE to create a separate scope
      const wrappedCode = `(function() {
                ${moduleCode}
            })();`;

      // Create a script element and inject the wrapped code directly
      const script = document.createElement("script");
      script.type = "text/javascript";
      script.textContent = wrappedCode;

      // Set up promise-based loading
      const loadPromise = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error(`Module load timeout: ${modulePath}`));
        }, MODULE_CONFIG.loadTimeout);

        // Since we're injecting code directly, we can resolve immediately
        // but add a small delay to ensure proper execution order
        setTimeout(() => {
          clearTimeout(timeout);
          this.loadedModules.add(modulePath);
          resolve();
        }, 10);
      });

      // Append script to head
      document.head.appendChild(script);

      // Wait for load to complete
      await loadPromise;
    } catch (error) {
      console.error(`Error loading module ${modulePath}:`, error);
      this.failedModules.add(modulePath);
    }
  }

  initializeSystems() {
    try {
      console.log("Initializing VRCX systems...");

      // Pass user config to global namespace (customjs already created in setupLifecycleHooks)
      window.customjs.config = USER_CONFIG;

      // Initialize all systems
      setTimeout(async () => {
        await AppApi.FocusWindow();
      }, 0);

      // Trigger startup hooks
      this.lifecycle.triggerStartup();

      // Start monitoring for login
      this.lifecycle.startLoginMonitoring();

      // Modules are now self-initializing, so we just need to trigger their initialization
      // Each module will register itself in the window.customjs namespace

      console.log("custom.js END - All systems initialized");
    } catch (error) {
      console.error("Error initializing systems:", error);
    }
  }
}

// ============================================================================
// INITIALIZATION
// ============================================================================

// Start loading modules when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    const loader = new ModuleLoader();
    loader.loadAllModules();
  });
} else {
  // DOM is already ready
  const loader = new ModuleLoader();
  loader.loadAllModules();
}
