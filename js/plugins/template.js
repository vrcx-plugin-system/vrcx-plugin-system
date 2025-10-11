// ============================================================================
// TEMPLATE PLUGIN - Example Plugin Structure
// Version: 1.0.0
// Build: 1728668400
// ============================================================================

/**
 * This is a comprehensive template showing the complete plugin structure.
 * Copy this file to create your own plugin!
 *
 * IMPORTANT: Plugins should NOT auto-initialize themselves.
 * The PluginLoader handles instantiation, loading, and starting.
 *
 * Simply define your plugin class extending Plugin, and export it.
 */
class TemplatePlugin extends Plugin {
  constructor() {
    // Call parent constructor with metadata
    super({
      id: "template",
      name: "Template Plugin",
      description:
        "Example plugin demonstrating all available features and lifecycle events",
      author: "Bluscream",
      version: "1.0.0",
      build: "1728668400",
      dependencies: [
        // Always include Plugin.js as first dependency
        "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/Plugin.js",
        // List URLs of other plugins this depends on (optional)
        // "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/plugins/utils.js",
      ],
    });

    // ========================================================================
    // PLUGIN-SPECIFIC PROPERTIES
    // ========================================================================

    this.counter = 0;
    this.timerInterval = null;
    this.exampleData = {
      startTime: null,
      loginTime: null,
      eventsReceived: 0,
    };

    this.log("🔨 Constructor called - Plugin instance created");
  }

  // ============================================================================
  // LIFECYCLE METHODS
  // ============================================================================

  /**
   * Called immediately when plugin loads from URL (Phase 2 of loading)
   * Use for: Setup, register hooks, expose methods to global scope
   * Should NOT start timers or modify DOM - use start() for that
   */
  async load() {
    this.log("📦 load() called - Setting up plugin...");

    // ========================================================================
    // EXPOSE TO GLOBAL SCOPE
    // ========================================================================

    // Expose this plugin to customjs namespace
    window.customjs.template = this;

    // You can also expose specific methods globally if needed
    // window.customjs.templateMethod = () => this.doSomething();

    // ========================================================================
    // REGISTER HOOKS
    // ========================================================================

    // Example: Register a pre-hook to run BEFORE a function
    // this.registerPreHook('AppApi.SendIpc', (args) => {
    //   this.log(`🪝 PRE-HOOK: SendIpc will be called with:`, args);
    //   // You can modify args here if needed
    // });

    // Example: Register a post-hook to run AFTER a function
    // this.registerPostHook('AppApi.SendIpc', (result, args) => {
    //   this.log(`🪝 POST-HOOK: SendIpc returned:`, result);
    // });

    // ========================================================================
    // REGISTER EVENTS
    // ========================================================================

    // Example: Listen to events from other plugins
    // this.on("other-plugin:event-name", (data) => {
    //   this.log("📨 Received event from other-plugin:", data);
    // });

    // Example: Listen to own events
    this.on("example-event", (data) => {
      this.log("📨 Received example-event:", data);
      this.exampleData.eventsReceived++;
    });

    this.loaded = true;
    this.log("✅ load() complete - Plugin ready for start()");
  }

  /**
   * Called after all plugins have loaded (Phase 3 of loading)
   * Use for: Setup that depends on other plugins, start timers, modify DOM
   */
  async start() {
    this.log("▶️ start() called - Starting plugin operations...");

    this.exampleData.startTime = Date.now();

    // ========================================================================
    // SETUP UI
    // ========================================================================

    this.setupUI();

    // ========================================================================
    // SETUP TIMERS (with automatic cleanup)
    // ========================================================================

    // Example: Register a timer with auto-cleanup when plugin stops
    this.timerInterval = this.registerTimer(
      setInterval(() => {
        this.counter++;
        this.log(`⏱️ Timer tick #${this.counter}`);

        // Example: Emit an event for other plugins
        this.emit("timer-tick", {
          count: this.counter,
          timestamp: Date.now(),
        });
      }, 60000) // Every minute
    );

    // ========================================================================
    // SETUP OBSERVERS (with automatic cleanup)
    // ========================================================================

    // Example: Setup mutation observer with auto-cleanup
    const observer = new MutationObserver((mutations) => {
      this.log(`👁️ DOM mutation detected: ${mutations.length} changes`);
    });
    this.registerObserver(observer);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: false, // Set to true to watch attribute changes
    });

    // ========================================================================
    // ACCESS OTHER PLUGINS
    // ========================================================================

    // Example: Access other plugins via customjs
    const utilsPlugin = window.customjs.plugins.find(
      (p) => p.metadata.id === "utils"
    );
    if (utilsPlugin) {
      this.log(`🔌 Found utils plugin v${utilsPlugin.metadata.version}`);
    }

    // Example: Use utilities from other plugins
    if (window.customjs.utils) {
      const timestamp = window.customjs.utils.getTimestamp();
      this.log(`🕐 Current timestamp: ${timestamp}`);
    }

    this.started = true;
    this.log("✅ start() complete - Plugin running");
  }

  /**
   * Called after user logs into VRChat (happens after start)
   * @param {object} currentUser - Current user object from $pinia.user.currentUser
   */
  async onLogin(currentUser) {
    this.log(
      `🔐 onLogin() called - User: ${currentUser?.displayName || "Unknown"}`
    );

    this.exampleData.loginTime = Date.now();

    // ========================================================================
    // ACCESS USER DATA
    // ========================================================================

    const userId = currentUser?.id;
    const displayName = currentUser?.displayName;
    const trustLevel = currentUser?.$trustLevel;
    const friendCount = currentUser?.friends?.length || 0;

    this.log(`👤 User ID: ${userId}`);
    this.log(`👤 Display Name: ${displayName}`);
    this.log(`👤 Trust Level: ${trustLevel}`);
    this.log(`👤 Friends: ${friendCount}`);

    // ========================================================================
    // ACCESS PINIA STORES
    // ========================================================================

    // Example: Access location data
    const location = window.$pinia?.location?.lastLocation?.location;
    this.log(`📍 Current location: ${location || "Unknown"}`);

    // Example: Access friend data
    const friendsStore = window.$pinia?.friends;
    if (friendsStore) {
      this.log(`👥 Online friends: ${friendsStore.onlineFriends?.length || 0}`);
    }

    // ========================================================================
    // ACCESS CONFIG
    // ========================================================================

    // Example: Get config values
    const steamId = this.getConfig("steam.id", "not-set");
    this.log(`⚙️ Steam ID from config: ${steamId}`);

    // Example: Set config values
    this.setConfig("template.lastLogin", Date.now());

    // ========================================================================
    // MAKE API CALLS
    // ========================================================================

    // Example: Make authenticated API calls
    // const response = await window.request.userRequest.getUser({ userId });
    // this.log('API response:', response);

    this.log("✅ onLogin() complete");
  }

  /**
   * Called when plugin is stopped, disabled, or unloaded
   */
  async stop() {
    this.log("⏹️ stop() called - Cleaning up...");

    // ========================================================================
    // REMOVE UI ELEMENTS
    // ========================================================================

    this.removeUI();

    // ========================================================================
    // CUSTOM CLEANUP
    // ========================================================================

    // Add any custom cleanup here
    // (Timers, observers, listeners are auto-cleaned by parent class)
    this.exampleData = {
      startTime: null,
      loginTime: null,
      eventsReceived: 0,
    };

    // ========================================================================
    // CALL PARENT CLEANUP
    // ========================================================================

    // This will automatically clean up:
    // - All timers (setInterval/setTimeout)
    // - All observers (MutationObserver, etc.)
    // - All event listeners
    // - All Pinia subscriptions
    await super.stop();

    this.log("✅ stop() complete - Plugin stopped");
  }

  // ============================================================================
  // PLUGIN-SPECIFIC METHODS
  // ============================================================================

  setupUI() {
    this.log("🎨 Setting up UI...");

    // ========================================================================
    // CONTEXT MENU ITEMS
    // ========================================================================

    // Example: Add a context menu item (requires context-menu-api plugin)
    if (window.customjs?.contextMenu) {
      window.customjs.contextMenu.addUserItem("template-action", {
        text: "🔧 Template Action",
        icon: "el-icon-star",
        onClick: (userData) => this.handleUserClick(userData),
      });
      this.log("📝 Added context menu item");
    }

    // ========================================================================
    // NAVIGATION MENU ITEMS
    // ========================================================================

    // Example: Add a navigation menu item (requires nav-menu-api plugin)
    if (window.customjs?.navMenu) {
      window.customjs.navMenu.addItem("template", {
        label: "Template",
        icon: "ri-file-code-line",
        content: this.createContent(),
      });
      this.log("📝 Added navigation menu item");
    }

    // ========================================================================
    // EVENT LISTENERS (with automatic cleanup)
    // ========================================================================

    // Example: Register event listener with auto-cleanup
    const button = document.querySelector(".some-button-selector");
    if (button) {
      this.registerListener(
        button,
        "click",
        () => this.log("🖱️ Button clicked!"),
        { once: false }
      );
      this.log("🔘 Registered button click listener");
    }

    // ========================================================================
    // PINIA SUBSCRIPTIONS (with automatic cleanup)
    // ========================================================================

    // Example: Subscribe to Pinia store with auto-cleanup
    if (window.$pinia?.user?.$subscribe) {
      const unsubscribe = window.$pinia.user.$subscribe((mutation, state) => {
        this.log(`📊 User store changed: ${state.currentUser?.displayName}`);
      });
      this.registerSubscription(unsubscribe);
      this.log("📊 Subscribed to user store changes");
    }

    this.log("✅ UI setup complete");
  }

  removeUI() {
    this.log("🗑️ Removing UI...");

    // Remove context menu items
    if (window.customjs?.contextMenu) {
      window.customjs.contextMenu.removeUserItem("template-action");
    }

    // Remove navigation menu items
    if (window.customjs?.navMenu) {
      window.customjs.navMenu.removeItem("template");
    }

    // Event listeners are automatically removed by cleanupResources()

    this.log("✅ UI removed");
  }

  createContent() {
    const container = document.createElement("div");
    container.style.padding = "20px";
    container.innerHTML = `
      <h2>🔧 Template Plugin</h2>
      <p>This is example content for the navigation tab.</p>
      <p><strong>Counter:</strong> <span id="template-counter">0</span></p>
      <p><strong>Events Received:</strong> <span id="template-events">0</span></p>
      <button id="template-test-btn" class="el-button el-button--primary">
        🧪 Test Button
      </button>
      <button id="template-emit-btn" class="el-button el-button--success">
        📡 Emit Event
      </button>
    `;

    // Register button clicks with auto-cleanup
    setTimeout(() => {
      const testBtn = container.querySelector("#template-test-btn");
      if (testBtn) {
        this.registerListener(testBtn, "click", () => {
          this.log("🧪 Test button clicked!");
          this.emit("button-clicked", { timestamp: Date.now() });

          if (window.customjs?.utils) {
            window.customjs.utils.showSuccess(
              "Template plugin test button clicked!"
            );
          }
        });
      }

      const emitBtn = container.querySelector("#template-emit-btn");
      if (emitBtn) {
        this.registerListener(emitBtn, "click", () => {
          this.log("📡 Emit button clicked - emitting example-event");
          this.emit("example-event", {
            message: "Hello from template!",
            timestamp: Date.now(),
          });
        });
      }
    }, 0);

    return container;
  }

  handleUserClick(userData) {
    this.log("👤 User context menu clicked:", userData);

    if (window.customjs?.utils) {
      window.customjs.utils.showInfo(
        `Template action for: ${userData.displayName}`
      );
    }

    // Example: Emit event for other plugins
    this.emit("user-clicked", userData);
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Example helper method showing how to do something
   * @param {string} param - Parameter description
   * @returns {string} Return value description
   */
  doSomething(param) {
    this.log(`🔧 doSomething() called with: ${param}`);

    // Do some work...
    const result = `Processed: ${param}`;

    return result;
  }

  /**
   * Get plugin statistics
   * @returns {object} Stats object
   */
  getStats() {
    return {
      enabled: this.enabled,
      loaded: this.loaded,
      started: this.started,
      counter: this.counter,
      startTime: this.exampleData.startTime,
      loginTime: this.exampleData.loginTime,
      eventsReceived: this.exampleData.eventsReceived,
      uptime: this.exampleData.startTime
        ? Date.now() - this.exampleData.startTime
        : 0,
    };
  }
}

// ============================================================================
// PLUGIN EXPORT
// ============================================================================

// Make plugin class available for PluginLoader to instantiate
window.__LAST_PLUGIN_CLASS__ = TemplatePlugin;
