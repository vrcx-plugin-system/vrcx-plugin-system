// ============================================================================
// DEBUG PLUGIN - COMPREHENSIVE LOGGING & MONITORING
// ============================================================================

class DebugPlugin {
  static SCRIPT = {
    name: "Debug Plugin",
    description:
      "Comprehensive debugging plugin with mutation observers, event hooks, and logging",
    author: "Bluscream",
    version: "1.0.3",
    build: "1760221585",
    dependencies: [],
  };

  constructor() {
    this.observers = [];
    this.recentLogs = new Map(); // For deduplication: key -> timestamp
    this.dedupeTimeout = 500; // ms - don't log same thing within this timeframe
    this.on_startup();
  }

  on_startup() {
    console.log(
      "[Debug] Initializing debug plugin - all logs will be saved to AppData\\logs\\VRCX*.log"
    );
    this.setupMutationObservers();
    this.setupEventListeners();
    this.setupPiniaWatchers();
    this.exposeDebugMethods();
    console.log("[Debug] Debug plugin initialized - monitoring started");

    // Log initial state
    setTimeout(() => {
      this.logVRCXState("on_startup");
    }, 1000);

    // Setup login hook
    window.on_login((currentUser) => this.on_login(currentUser));
  }

  on_login(currentUser) {
    this.log("Login", `User logged in: ${currentUser?.displayName}`, {
      userId: currentUser?.id,
      friendCount: currentUser?.friends?.length,
    });

    // Log state after login
    setTimeout(() => {
      this.logVRCXState("on_login");
    }, 2000);
  }

  logVRCXState(trigger = "manual") {
    const state = {
      trigger,
      dialogs: {
        user: {
          visible: window.$pinia?.user?.userDialog?.visible,
          ref: window.$pinia?.user?.userDialog?.ref?.id,
        },
        avatar: {
          visible: window.$pinia?.avatar?.avatarDialog?.visible,
          ref: window.$pinia?.avatar?.avatarDialog?.ref?.id,
        },
        world: {
          visible: window.$pinia?.world?.worldDialog?.visible,
          ref: window.$pinia?.world?.worldDialog?.ref?.id,
        },
        group: {
          visible: window.$pinia?.group?.groupDialog?.visible,
          ref: window.$pinia?.group?.groupDialog?.ref?.id,
        },
      },
      currentUser: {
        id: window.$pinia?.user?.currentUser?.id,
        displayName: window.$pinia?.user?.currentUser?.displayName,
        friends: window.$pinia?.user?.currentUser?.friends?.length,
      },
      location: {
        current: window.$pinia?.location?.lastLocation?.location,
        destination: window.$pinia?.location?.lastLocationDestination,
      },
      customModules: Object.keys(window.customjs || {}),
    };

    console.log(`=== VRCX State (${trigger}) ===`);
    console.log(JSON.stringify(state, null, 2));
    return state;
  }

  log(category, message, data = null) {
    // Deduplication: prevent logging the same thing multiple times in quick succession
    const logKey = `${category}:${message}:${JSON.stringify(data)}`;
    const now = Date.now();
    const lastLogged = this.recentLogs.get(logKey);

    if (lastLogged && now - lastLogged < this.dedupeTimeout) {
      return; // Skip duplicate log
    }

    this.recentLogs.set(logKey, now);

    // Clean up old entries periodically
    if (this.recentLogs.size > 100) {
      const cutoff = now - this.dedupeTimeout;
      for (const [key, timestamp] of this.recentLogs.entries()) {
        if (timestamp < cutoff) {
          this.recentLogs.delete(key);
        }
      }
    }

    const dataStr = data ? ` | ${JSON.stringify(data)}` : "";
    console.log(`[Debug:${category}] ${message}${dataStr}`);
  }

  // ============================================================================
  // MUTATION OBSERVERS
  // ============================================================================

  setupMutationObservers() {
    // Observer for dialog changes
    const dialogObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType !== 1) return;

          // Detect dialog additions
          if (node.classList) {
            if (node.classList.contains("x-user-dialog")) {
              this.log("Dialog", "User dialog added to DOM", { id: node.id });
            }
            if (node.classList.contains("x-avatar-dialog")) {
              this.log("Dialog", "Avatar dialog added to DOM", {
                id: node.id,
              });
            }
            if (node.classList.contains("x-world-dialog")) {
              this.log("Dialog", "World dialog added to DOM", {
                id: node.id,
              });
            }
            if (node.classList.contains("x-group-dialog")) {
              this.log("Dialog", "Group dialog added to DOM", {
                id: node.id,
              });
            }
          }
        });

        mutation.removedNodes.forEach((node) => {
          if (node.nodeType !== 1) return;

          if (node.classList) {
            if (node.classList.contains("x-user-dialog")) {
              this.log("Dialog", "User dialog removed from DOM");
            }
            if (node.classList.contains("x-avatar-dialog")) {
              this.log("Dialog", "Avatar dialog removed from DOM");
            }
            if (node.classList.contains("x-world-dialog")) {
              this.log("Dialog", "World dialog removed from DOM");
            }
            if (node.classList.contains("x-group-dialog")) {
              this.log("Dialog", "Group dialog removed from DOM");
            }
          }
        });
      });
    });

    dialogObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });

    this.observers.push({ name: "DialogObserver", observer: dialogObserver });

    // Observer for dropdown menus
    const dropdownObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        // Watch for attribute changes on poppers
        if (mutation.type === "attributes" && mutation.target) {
          const node = mutation.target;
          if (
            node.classList &&
            node.classList.contains("el-dropdown__popper")
          ) {
            const isVisible =
              node.style.display !== "none" &&
              node.getAttribute("aria-hidden") !== "true";
            const menu = node.querySelector(".el-dropdown-menu");

            if (isVisible && menu) {
              const button = document.querySelector(
                `button[aria-controls="${menu.id}"]`
              );
              const dialog = button?.closest(
                ".x-user-dialog, .x-avatar-dialog, .x-world-dialog, .x-group-dialog"
              );

              let dialogType = "unknown";
              if (dialog) {
                if (dialog.classList.contains("x-user-dialog"))
                  dialogType = "user";
                else if (dialog.classList.contains("x-avatar-dialog"))
                  dialogType = "avatar";
                else if (dialog.classList.contains("x-world-dialog"))
                  dialogType = "world";
                else if (dialog.classList.contains("x-group-dialog"))
                  dialogType = "group";
              }

              this.log("Dropdown", `Dropdown menu shown (${dialogType})`, {
                menuId: menu.id,
                itemCount: menu.querySelectorAll(".el-dropdown-menu__item")
                  .length,
                buttonId: button?.id,
              });
            }
          }
        }

        // Watch for dropdown additions
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType !== 1) return;

          if (node.classList && node.classList.contains("el-dropdown-menu")) {
            this.log("Dropdown", "Dropdown menu added to DOM", {
              menuId: node.id,
              itemCount: node.querySelectorAll(".el-dropdown-menu__item")
                .length,
            });
          }
        });
      });
    });

    dropdownObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
    });

    this.observers.push({
      name: "DropdownObserver",
      observer: dropdownObserver,
    });

    this.log("Init", `Initialized ${this.observers.length} mutation observers`);
  }

  // ============================================================================
  // EVENT LISTENERS
  // ============================================================================

  setupEventListeners() {
    const events = [
      "click",
      "dblclick",
      "contextmenu",
      "keydown",
      "keyup",
      "focus",
      "blur",
      "change",
      "submit",
    ];

    events.forEach((eventName) => {
      const handler = (e) => {
        // Filter noise - only log interesting events
        if (eventName === "click" || eventName === "dblclick") {
          const target = e.target;
          if (
            target.classList &&
            (target.classList.contains("el-button") ||
              target.classList.contains("x-link") ||
              target.classList.contains("dialog-title") ||
              target.closest(".el-dropdown"))
          ) {
            this.log("Event", `${eventName} on ${target.tagName}`, {
              classes: target.classList?.toString(),
              id: target.id,
              ariaControls: target.getAttribute?.("aria-controls"),
            });
          }
        } else if (eventName === "contextmenu") {
          this.log("Event", "Context menu opened", {
            target: e.target.tagName,
            classes: e.target.classList?.toString(),
          });
        }
      };

      document.addEventListener(eventName, handler, true);
    });

    this.log("Init", `Registered ${events.length} event listeners`);
  }

  // ============================================================================
  // PINIA STORE WATCHERS
  // ============================================================================

  setupPiniaWatchers() {
    setTimeout(() => {
      if (!window.$app || typeof window.$app.$watch !== "function") {
        this.log("PiniaWatcher", "Vue $watch not available, skipping");
        return;
      }

      // Watch user dialog visibility
      window.$app.$watch(
        () => window.$pinia?.user?.userDialog?.visible,
        (newVal, oldVal) => {
          if (newVal !== oldVal) {
            this.log(
              "Pinia",
              `userDialog.visible changed: ${oldVal} → ${newVal}`
            );
          }
        }
      );

      // Watch avatar dialog visibility
      window.$app.$watch(
        () => window.$pinia?.avatar?.avatarDialog?.visible,
        (newVal, oldVal) => {
          if (newVal !== oldVal) {
            this.log(
              "Pinia",
              `avatarDialog.visible changed: ${oldVal} → ${newVal}`
            );
          }
        }
      );

      // Watch world dialog visibility
      window.$app.$watch(
        () => window.$pinia?.world?.worldDialog?.visible,
        (newVal, oldVal) => {
          if (newVal !== oldVal) {
            this.log(
              "Pinia",
              `worldDialog.visible changed: ${oldVal} → ${newVal}`
            );
          }
        }
      );

      // Watch group dialog visibility
      window.$app.$watch(
        () => window.$pinia?.group?.groupDialog?.visible,
        (newVal, oldVal) => {
          if (newVal !== oldVal) {
            this.log(
              "Pinia",
              `groupDialog.visible changed: ${oldVal} → ${newVal}`
            );
          }
        }
      );

      // Watch current user location
      window.$app.$watch(
        () => window.$pinia?.location?.lastLocation?.location,
        (newVal, oldVal) => {
          if (newVal !== oldVal) {
            this.log("Pinia", `Location changed: ${oldVal} → ${newVal}`);
          }
        }
      );

      this.log("Init", "Initialized Pinia store watchers");
    }, 500);
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  exposeDebugMethods() {
    // Expose debug instance globally
    window.debugPlugin = this;

    // Expose logVRCXState method
    window.logVRCXState = (trigger) => this.logVRCXState(trigger);

    // Log all DOM elements matching a selector
    window.debugFindElements = (selector) => {
      const elements = document.querySelectorAll(selector);
      console.log(`Found ${elements.length} elements matching "${selector}"`);
      elements.forEach((el, index) => {
        console.log(`  [${index}]`, {
          tag: el.tagName,
          id: el.id,
          classes: el.classList.toString(),
          text: el.textContent?.substring(0, 50),
        });
      });
      return elements;
    };

    // Track a specific element's mutations
    window.debugWatchElement = (selector) => {
      const element = document.querySelector(selector);
      if (!element) {
        console.error(`Element not found: ${selector}`);
        return;
      }

      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          console.log(`[Debug:Element] ${selector}:`, {
            type: mutation.type,
            attributeName: mutation.attributeName,
            oldValue: mutation.oldValue,
            addedNodes: mutation.addedNodes.length,
            removedNodes: mutation.removedNodes.length,
          });
        });
      });

      observer.observe(element, {
        attributes: true,
        childList: true,
        subtree: true,
        attributeOldValue: true,
      });

      console.log(`[Debug] Now watching element: ${selector}`);
      return observer;
    };

    this.log("Init", "Debug methods exposed to window object");
  }

  cleanup() {
    this.observers.forEach(({ observer }) => observer.disconnect());
    this.log(
      "Cleanup",
      `Disconnected ${this.observers.length} observers and removed event listeners`
    );
  }
}

// Auto-initialize the module
(function () {
  window.customjs = window.customjs || {};
  window.customjs.debug = new DebugPlugin();
  window.customjs.script = window.customjs.script || {};
  window.customjs.script.debug = DebugPlugin.SCRIPT;

  console.log(
    `✓ Loaded ${DebugPlugin.SCRIPT.name} v${DebugPlugin.SCRIPT.version} by ${DebugPlugin.SCRIPT.author}`
  );

  // Print available debug commands
  console.log(`
=== Debug Plugin - All logs will be saved to AppData\\logs ===
  window.logVRCXState()                   - Log current VRCX state
  window.debugFindElements(selector)      - Find and log elements
  window.debugWatchElement(selector)      - Watch element mutations
  window.debugPlugin.cleanup()            - Stop all observers
  `);
})();
