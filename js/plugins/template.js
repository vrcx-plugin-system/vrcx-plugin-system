class TemplatePlugin extends Plugin {
  constructor() {
    // Call parent constructor with metadata
    // Note: ID is auto-derived from filename (template.js -> template)
    super({
      name: "Template Plugin",
      description:
        "Example plugin demonstrating all available features and lifecycle events",
      author: "Bluscream",
      version: "2.0.0",
      build: "1728778800",
      dependencies: [
        // Always include plugin.js as first dependency
        // List URLs of other plugins this depends on (optional)
        // "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/plugins/utils.js",
      ],
    });

    this.counter = 0;
    this.timerInterval = null;
    this.exampleData = {
      startTime: null,
      loginTime: null,
      eventsReceived: 0,
    };

    this.logger.log("🔨 Constructor called - Plugin instance created");
  }

  /**
   * Called immediately when plugin loads from URL (Phase 2 of loading)
   * Use for: Setup, register hooks, expose methods to global scope
   * Should NOT start timers or modify DOM - use start() for that
   */
  async load() {
    this.logger.log("📦 load() called - Setting up plugin...");

    // ⚠️ OLD WAY (Not Recommended): Expose plugin directly
    // window.customjs.template = this;

    // ✅ NEW WAY (Recommended): Access plugins via PluginManager
    // Other plugins should use: window.customjs.pluginManager.getPlugin("template")

    // You can still expose specific utility methods if really needed
    // window.customjs.templateMethod = () => this.doSomething();

    // ✅ NEW: Simplified settings with get/set (auto-saved to localStorage)
    // Use dot notation for categories: "category.key"
    // Settings are automatically saved when you call this.set()

    // Example: Get settings with defaults
    const enableFeature = this.get("general.enableFeature", true);
    const updateInterval = this.get("general.updateInterval", 60000);
    const username = this.get("general.username", "Guest");
    const showDesktop = this.get("notifications.showDesktop", false);
    const soundEnabled = this.get("notifications.soundEnabled", true);

    this.logger.log(`⚙️ Feature enabled: ${enableFeature}`);
    this.logger.log(`⚙️ Update interval: ${updateInterval}ms`);
    this.logger.log(`⚙️ Username: ${username}`);
    this.logger.log(`⚙️ Desktop notifications: ${showDesktop}`);
    this.logger.log(`⚙️ Sound enabled: ${soundEnabled}`);

    // Example: Set a setting (instantly saved to localStorage)
    // this.set("general.enableFeature", false);
    // this.set("general.username", "Bluscream");

    // Example: Get all settings for this plugin as an object
    // const allSettings = this.getAllSettings();
    // this.logger.log("All settings:", allSettings);

    // Example: Register a pre-hook to run BEFORE a function
    // this.registerPreHook('AppApi.SendIpc', (args) => {
    //   this.logger.log(`🪝 PRE-HOOK: SendIpc will be called with:`, args);
    //   // You can modify args here if needed
    // });

    // Example: Register a post-hook to run AFTER a function
    // this.registerPostHook('AppApi.SendIpc', (result, args) => {
    //   this.logger.log(`🪝 POST-HOOK: SendIpc returned:`, result);
    // });

    // Example: Register a void-hook to completely prevent function execution
    // this.registerVoidHook('AppApi.SendIpc', (args) => {
    //   this.logger.log(`🪝 VOID-HOOK: SendIpc was voided:`, args);
    //   // Original function will NOT be called
    // });

    // Example: Register a replace-hook to replace a function (chainable with other plugins)
    // this.registerReplaceHook('AppApi.SendIpc', function(originalFunc, ...args) {
    //   this.logger.log(`🪝 REPLACE-HOOK: Replacing SendIpc`);
    //   // You can call the original or return your own result
    //   const result = originalFunc(...args); // Optional
    //   return result; // Or return your own value
    // });

    // Example: Listen to events from other plugins
    // this.on("other-plugin:event-name", (data) => {
    //   this.logger.log("📨 Received event from other-plugin:", data);
    // });

    // Example: Listen to own events
    this.on("example-event", (data) => {
      this.logger.log("📨 Received example-event:", data);
      this.exampleData.eventsReceived++;
    });

    this.loaded = true;
    this.logger.log("✅ load() complete - Plugin ready for start()");
  }

  /**
   * Called after all plugins have loaded (Phase 3 of loading)
   * Use for: Setup that depends on other plugins, start timers, modify DOM
   */
  async start() {
    this.logger.log("▶️ start() called - Starting plugin operations...");

    // Setup utils shortcut
    this.utils = window.customjs.utils;

    // Wait for dependencies
    this.contextMenuApi = await window.customjs.pluginManager.waitForPlugin(
      "context-menu-api"
    );
    this.navMenuApi = await window.customjs.pluginManager.waitForPlugin(
      "nav-menu-api"
    );

    this.exampleData.startTime = Date.now();

    this.setupUI();

    // Example: Use settings to control behavior
    const interval = this.get("general.updateInterval", 60000);

    // Example: Register a timer with auto-cleanup when plugin stops
    this.timerInterval = this.registerTimer(
      setInterval(() => {
        // Only run if feature is enabled
        if (this.get("general.enableFeature", true)) {
          this.counter++;
          this.logger.log(`⏱️ Timer tick #${this.counter}`);

          // Example: Emit an event for other plugins
          this.emit("timer-tick", {
            count: this.counter,
            timestamp: Date.now(),
          });
        }
      }, interval) // Use setting for interval
    );

    // Example: Setup mutation observer with auto-cleanup
    const observer = new MutationObserver((mutations) => {
      this.logger.log(`👁️ DOM mutation detected: ${mutations.length} changes`);
    });
    this.registerObserver(observer);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: false, // Set to true to watch attribute changes
    });

    // Example: Use utils functions
    if (this.utils) {
      const timestamp = this.utils.getTimestamp();
      this.logger.log(`🕐 Current timestamp: ${timestamp}`);
    }

    this.started = true;
    this.logger.log("✅ start() complete - Plugin running");
  }

  /**
   * Called after user logs into VRChat (happens after start)
   * @param {object} currentUser - Current user object from $pinia.user.currentUser
   */
  async onLogin(currentUser) {
    this.logger.log(
      `🔐 onLogin() called - User: ${currentUser?.displayName || "Unknown"}`
    );

    this.exampleData.loginTime = Date.now();

    const userId = currentUser?.id;
    const displayName = currentUser?.displayName;
    const trustLevel = currentUser?.$trustLevel;
    const friendCount = currentUser?.friends?.length || 0;

    this.logger.log(`👤 User ID: ${userId}`);
    this.logger.log(`👤 Display Name: ${displayName}`);
    this.logger.log(`👤 Trust Level: ${trustLevel}`);
    this.logger.log(`👤 Friends: ${friendCount}`);

    // Example: Access location data
    const location = window.$pinia?.location?.lastLocation?.location;
    this.logger.log(`📍 Current location: ${location || "Unknown"}`);

    // Example: Access friend data
    const friendsStore = window.$pinia?.friends;
    if (friendsStore) {
      this.logger.log(
        `👥 Online friends: ${friendsStore.onlineFriends?.length || 0}`
      );
    }

    // Example: Get global config values (not plugin settings)
    const steamId = this.getConfig("steam.id", "not-set");
    this.logger.log(`⚙️ Steam ID from config: ${steamId}`);

    // Example: Set global config values (not plugin settings)
    this.setConfig("template.lastLogin", Date.now());

    // Example: Update plugin settings (instantly saved)
    this.set("general.username", displayName || "Unknown");
    this.logger.log(`⚙️ Updated username to: ${this.get("general.username")}`);
    // Settings are now instantly saved to localStorage!
    this.logger.log("💾 Setting automatically saved to localStorage");

    // Example: Make authenticated API calls
    // const response = await window.request.userRequest.getUser({ userId });
    // this.logger.log('API response:', response);

    this.logger.log("✅ onLogin() complete");
  }

  /**
   * Called when plugin is stopped, disabled, or unloaded
   */
  async stop() {
    this.logger.log("⏹️ stop() called - Cleaning up...");

    this.removeUI();

    // Add any custom cleanup here
    // (Timers, observers, listeners are auto-cleaned by parent class)
    this.exampleData = {
      startTime: null,
      loginTime: null,
      eventsReceived: 0,
    };

    // This will automatically clean up:
    // - All timers (setInterval/setTimeout)
    // - All observers (MutationObserver, etc.)
    // - All event listeners
    // - All Pinia subscriptions
    await super.stop();

    this.logger.log("✅ stop() complete - Plugin stopped");
  }

  setupUI() {
    this.logger.log("🎨 Setting up UI...");

    // Example: Add a context menu item (requires context-menu-api plugin)
    if (this.contextMenuApi) {
      this.contextMenuApi.addUserItem("template-action", {
        text: "🔧 Template Action",
        icon: "el-icon-star",
        onClick: (userData) => this.handleUserClick(userData),
      });
      this.logger.log("📝 Added context menu item");
    }

    // Example: Add a navigation menu item (requires nav-menu-api plugin)
    if (this.navMenuApi) {
      this.navMenuApi.addItem("template", {
        label: "Template",
        icon: "ri-file-code-line",
        content: this.createContent(),
      });
      this.logger.log("📝 Added navigation menu item");
    }

    // Example: Register event listener with auto-cleanup
    const button = document.querySelector(".some-button-selector");
    if (button) {
      this.registerListener(
        button,
        "click",
        () => this.logger.log("🖱️ Button clicked!"),
        { once: false }
      );
      this.logger.log("🔘 Registered button click listener");
    }

    // Example: Subscribe to Pinia store with auto-cleanup
    if (window.$pinia?.user?.$subscribe) {
      const unsubscribe = window.$pinia.user.$subscribe((mutation, state) => {
        this.logger.log(
          `📊 User store changed: ${state.currentUser?.displayName}`
        );
      });
      this.registerSubscription(unsubscribe);
      this.logger.log("📊 Subscribed to user store changes");
    }

    this.logger.log("✅ UI setup complete");
  }

  removeUI() {
    this.logger.log("🗑️ Removing UI...");

    // Remove context menu items
    if (this.contextMenuApi) {
      this.contextMenuApi.removeUserItem("template-action");
    }

    // Remove navigation menu items
    if (this.navMenuApi) {
      this.navMenuApi.removeItem("template");
    }

    // Event listeners are automatically removed by cleanupResources()

    this.logger.log("✅ UI removed");
  }

  createContent() {
    const container = document.createElement("div");
    container.style.padding = "20px";
    container.innerHTML = `
      <h2>🔧 Template Plugin</h2>
      <p>This is example content for the navigation tab.</p>
      <p><strong>Counter:</strong> <span id="template-counter">0</span></p>
      <p><strong>Events Received:</strong> <span id="template-events">0</span></p>
      <hr>
      <h3>⚙️ Settings</h3>
      <p><strong>Feature Enabled:</strong> ${this.get(
        "general.enableFeature",
        true
      )}</p>
      <p><strong>Update Interval:</strong> ${this.get(
        "general.updateInterval",
        60000
      )}ms</p>
      <p><strong>Username:</strong> ${this.get("general.username", "Guest")}</p>
      <p><strong>Desktop Notifications:</strong> ${this.get(
        "notifications.showDesktop",
        false
      )}</p>
      <hr>
      <button id="template-test-btn" class="el-button el-button--primary">
        🧪 Test Button
      </button>
      <button id="template-emit-btn" class="el-button el-button--success">
        📡 Emit Event
      </button>
      <button id="template-toggle-btn" class="el-button el-button--warning">
        🔄 Toggle Feature
      </button>
      <button id="template-save-btn" class="el-button el-button--info">
        💾 Save Settings
      </button>
    `;

    // Register button clicks with auto-cleanup
    setTimeout(() => {
      const testBtn = container.querySelector("#template-test-btn");
      if (testBtn) {
        this.registerListener(testBtn, "click", () => {
          this.logger.log("🧪 Test button clicked!");
          this.emit("button-clicked", { timestamp: Date.now() });

          if (this.utils) {
            this.logger.showSuccess("Template plugin test button clicked!");
          }
        });
      }

      const emitBtn = container.querySelector("#template-emit-btn");
      if (emitBtn) {
        this.registerListener(emitBtn, "click", () => {
          this.logger.log("📡 Emit button clicked - emitting example-event");
          this.emit("example-event", {
            message: "Hello from template!",
            timestamp: Date.now(),
          });
        });
      }

      const toggleBtn = container.querySelector("#template-toggle-btn");
      if (toggleBtn) {
        this.registerListener(toggleBtn, "click", () => {
          const newValue = !this.get("general.enableFeature", true);
          this.set("general.enableFeature", newValue);
          this.logger.log(`🔄 Feature toggled: ${newValue}`);
          if (this.utils) {
            this.logger.showSuccess(
              `Feature ${newValue ? "enabled" : "disabled"}`
            );
          }
        });
      }

      const saveBtn = container.querySelector("#template-save-btn");
      if (saveBtn) {
        this.registerListener(saveBtn, "click", async () => {
          // Settings are now auto-saved to localStorage instantly!
          this.logger.log("💾 Settings are auto-saved!");
          if (this.utils) {
            this.logger.showSuccess("All settings are automatically saved");
          }
        });
      }
    }, 0);

    return container;
  }

  handleUserClick(userData) {
    this.logger.log("👤 User context menu clicked:", userData);

    if (this.utils) {
      this.logger.showInfo(`Template action for: ${userData.displayName}`);
    }

    // Example: Emit event for other plugins
    this.emit("user-clicked", userData);
  }

  /**
   * Example helper method showing how to do something
   * @param {string} param - Parameter description
   * @returns {string} Return value description
   */
  doSomething(param) {
    this.logger.log(`🔧 doSomething() called with: ${param}`);

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

// Make plugin class available for PluginLoader to instantiate
window.customjs.__LAST_PLUGIN_CLASS__ = TemplatePlugin;
