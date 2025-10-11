// ============================================================================
// AUTO INVITE MANAGEMENT
// ============================================================================

class AutoInviteManager {
  static SCRIPT = {
    name: "Auto Invite Module",
    description: "Automatic user invitation system with location tracking",
    author: "Bluscream",
    version: "1.0.1",
    build: "1760220507",
    dependencies: [
      "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/api-helpers.js",
      "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/context-menu.js",
      "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/utils.js",
    ],
  };
  constructor() {
    this.autoInviteUser = null;
    this.lastInvitedTo = null;
    this.lastJoined = null;
    this.lastDestinationCheck = null;
    this.locationMonitorInterval = null;
    this.gameLogHookRetries = 0;

    // Try to get existing CustomContextMenu instance or create new one
    if (window.customjs?.contextMenu) {
      this.customMenu = window.customjs.contextMenu;
      window.Logger?.log(
        "Using existing CustomContextMenu instance",
        { console: true },
        "info"
      );
    } else if (window.CustomContextMenu) {
      this.customMenu = new window.CustomContextMenu();
      window.Logger?.log(
        "Created new CustomContextMenu instance",
        { console: true },
        "info"
      );
    } else {
      window.Logger?.log(
        "CustomContextMenu not available, will retry later",
        { console: true },
        "warning"
      );
      this.customMenu = null;
    }

    this.autoInviteItem = null;
    this.setupLocationTracking();

    // Listen for context menu ready event as additional fallback
    window.addEventListener("contextMenuReady", (event) => {
      if (!this.customMenu && !this.autoInviteItem) {
        this.customMenu = event.detail.contextMenu;
        window.Logger?.log(
          "Context menu received via event, setting up user button",
          { console: true },
          "info"
        );
        this.setupUserButton();
      }
    });

    this.setupUserButton();
  }

  setupLocationTracking() {
    // Store original functions if not already stored
    if (typeof window.bak === "undefined") {
      window.bak = {};
    }

    // Hook into the game log system for better location detection
    this.setupGameLogHook();

    // Also hook setCurrentUserLocation as fallback for API-based updates
    this.setupLocationAPIHook();

    // Monitor location store changes directly
    this.setupLocationStoreMonitor();
  }

  setupGameLogHook() {
    // Try to access VRCX Pinia stores through different paths
    let gameLogStore = null;
    let locationStore = null;

    const possiblePaths = [
      // Try window.$pinia (exposed in App.vue)
      () => window.$pinia?.gameLog,
      // Try global $app if it exists
      () => $app?.data?.gameLog,
      () => $app?.gameLog,
      // Try direct access patterns
      () => window.$app?.data?.gameLog,
      () => window.$app?.gameLog,
      () => window.gameLog,
    ];

    for (const pathFn of possiblePaths) {
      try {
        const store = pathFn();
        if (store && typeof store === "object") {
          gameLogStore = store;
          window.Logger?.log(
            `Found gameLog store via Pinia`,
            { console: true },
            "info"
          );
          break;
        }
      } catch (error) {
        // Continue to next path
      }
    }

    // Since addGameLogEntry is internal to the store, we need to hook into the location store changes instead
    // The location-destination processing happens in addGameLogEntry and sets locationStore.lastLocationDestination
    if (gameLogStore || window.$pinia?.location) {
      window.Logger?.log(
        "Using location store monitoring for travel detection",
        { console: true },
        "success"
      );
    } else {
      window.Logger?.log(
        "Pinia stores not found, will retry in 3 seconds and rely on polling",
        { console: true },
        "warning"
      );

      // Retry after a delay in case VRCX isn't fully loaded yet (max 3 retries)
      if (this.gameLogHookRetries < 3) {
        this.gameLogHookRetries++;
        setTimeout(() => {
          window.Logger?.log(
            `Retrying store access (attempt ${this.gameLogHookRetries}/3)...`,
            { console: true },
            "info"
          );
          this.setupGameLogHook();
        }, 3000);
      } else {
        window.Logger?.log(
          "Max retries reached, relying on location store polling only",
          { console: true },
          "warning"
        );
      }
    }
  }

  setupLocationAPIHook() {
    // Keep the API hook as fallback
    if (!window.bak.setCurrentUserLocation && $app.setCurrentUserLocation) {
      window.bak.setCurrentUserLocation = $app.setCurrentUserLocation;

      $app.setCurrentUserLocation = (location, travelingToLocation) => {
        window.Logger?.log(
          `API Location change detected: ${location} (traveling to: ${travelingToLocation})`,
          { console: true },
          "info"
        );

        // Call original function with all parameters
        window.bak.setCurrentUserLocation(location, travelingToLocation);

        // Process location change
        setTimeout(async () => {
          await this.onCurrentUserLocationChanged(
            location,
            travelingToLocation
          );
        }, 1000);
      };
    }
  }

  setupLocationStoreMonitor() {
    // Monitor location store changes by polling
    this.locationMonitorInterval = setInterval(() => {
      this.checkLocationStoreChanges();
    }, 1000);
  }

  checkLocationStoreChanges() {
    try {
      // Try multiple paths to find the location store (Pinia-based)
      let locationStore = null;
      const possiblePaths = [
        // Try window.$pinia (primary method)
        () => window.$pinia?.location,
        // Try legacy paths as fallback
        () => $app?.data?.location,
        () => $app?.location,
        () => window.$app?.data?.location,
        () => window.$app?.location,
        () => window.location,
      ];

      for (const pathFn of possiblePaths) {
        try {
          const store = pathFn();
          if (store && store.lastLocation !== undefined) {
            locationStore = store;
            break;
          }
        } catch (error) {
          // Continue to next path
        }
      }

      if (!locationStore) return;

      const currentLocation = locationStore.lastLocation?.location;
      const destination = locationStore.lastLocationDestination;

      // Check if we're traveling and have a destination
      if (
        currentLocation === "traveling" &&
        destination &&
        destination !== this.lastDestinationCheck
      ) {
        window.Logger?.log(
          `Location store traveling detected: ${destination}`,
          { console: true },
          "info"
        );
        this.lastDestinationCheck = destination;
        this.onLocationDestinationDetected(destination);
      }
    } catch (error) {
      // Silently handle errors in polling - don't spam console
    }
  }

  setupUserButton() {
    try {
      // Don't setup if already done
      if (this.autoInviteItem) {
        window.Logger?.log(
          "Auto Invite user button already setup, skipping",
          { console: true },
          "info"
        );
        return true;
      }

      window.Logger?.log(
        "Setting up Auto Invite user button...",
        { console: true },
        "info"
      );

      // Try to get the context menu if we don't have it yet
      if (!this.customMenu) {
        if (window.customjs?.contextMenu) {
          this.customMenu = window.customjs.contextMenu;
          window.Logger?.log(
            "Found CustomContextMenu instance on retry",
            { console: true },
            "info"
          );
        } else if (window.CustomContextMenu) {
          this.customMenu = new window.CustomContextMenu();
          window.Logger?.log(
            "Created new CustomContextMenu instance on retry",
            { console: true },
            "info"
          );
        } else {
          throw new Error("CustomContextMenu still not available");
        }
      }

      this.autoInviteItem = this.customMenu.addUserItem("autoInvite", {
        text: "Auto Invite",
        icon: "el-icon-message",
        onClick: (user) => this.toggleAutoInvite(user),
      });

      window.Logger?.log(
        "Auto Invite user button setup completed",
        { console: true },
        "info"
      );
      return true;
    } catch (error) {
      window.Logger?.log(
        `Error setting up Auto Invite user button: ${error.message}`,
        { console: true },
        "error"
      );
      console.error("Auto Invite setup error:", error);

      // Retry after a delay if the context menu isn't ready yet (but only if we haven't already succeeded)
      if (!this.autoInviteItem) {
        setTimeout(() => {
          window.Logger?.log(
            "Retrying Auto Invite user button setup...",
            { console: true },
            "info"
          );
          this.setupUserButton();
        }, 2000);
      }

      return false;
    }
  }

  async onLocationDestinationDetected(destination) {
    window.Logger?.log(
      `Processing location destination: ${destination}`,
      { console: true },
      "info"
    );

    if (!Utils.isEmpty(this.autoInviteUser) && !Utils.isEmpty(destination)) {
      // Only invite if we haven't already invited to this location
      if (this.lastInvitedTo !== destination) {
        const userName = `"${
          this.autoInviteUser?.displayName ?? this.autoInviteUser
        }"`;

        // Parse the destination
        let instanceId = destination;
        let worldId = destination;
        let worldName = "";

        // Try to get world name from VRCX
        try {
          worldName = await $app.getWorldName(worldId.split(":")[0]);
        } catch (error) {
          window.Logger?.log(
            `Failed to get world name: ${error.message}`,
            { console: true },
            "warning"
          );
          worldName = "Unknown World";
        }
        window.Logger?.log(
          `Inviting user ${userName} to "${worldName}" (${instanceId})`,
          { console: true },
          "info"
        );

        try {
          API.sendInvite(
            {
              instanceId: instanceId,
              worldId: worldId.split(":")[0],
              worldName: worldName,
            },
            this.autoInviteUser.id
          );

          this.lastInvitedTo = destination;
          window.Logger?.log(
            `Successfully sent invite to ${userName}`,
            { console: true },
            "success"
          );
        } catch (error) {
          window.Logger?.log(
            `Failed to send invite: ${error.message}`,
            { console: true },
            "error"
          );
        }
      } else {
        window.Logger?.log(
          `Already invited user to this location: ${destination}`,
          { console: true },
          "info"
        );
      }
    } else if (Utils.isEmpty(this.autoInviteUser)) {
      window.Logger?.log(
        `No auto invite user selected`,
        { console: true },
        "info"
      );
    } else if (Utils.isEmpty(destination)) {
      window.Logger?.log(
        `No destination provided`,
        { console: true },
        "warning"
      );
    }
  }

  async onCurrentUserLocationChanged(location, travelingToLocation) {
    window.Logger?.log(
      `Processing location change: ${location} (traveling to: ${travelingToLocation})`,
      { console: true },
      "info"
    );

    // Check if user is starting to travel (entering a new instance)
    if (location === "traveling") {
      window.Logger?.log(
        `User is traveling, checking for auto invite...`,
        { console: true },
        "info"
      );

      if (
        !Utils.isEmpty(this.autoInviteUser) &&
        !Utils.isEmpty(travelingToLocation)
      ) {
        // Only invite if we haven't already invited to this location
        if (this.lastInvitedTo !== travelingToLocation) {
          const userName = `"${
            this.autoInviteUser?.displayName ?? this.autoInviteUser
          }"`;

          // Parse the traveling destination
          let instanceId = travelingToLocation;
          let worldId = travelingToLocation;
          let worldName = "";

          // Try to get world name from VRCX
          try {
            worldName = await $app.getWorldName(worldId.split(":")[0]);
          } catch (error) {
            window.Logger?.log(
              `Failed to get world name: ${error.message}`,
              { console: true },
              "warning"
            );
            worldName = "Unknown World";
          }
          window.Logger?.log(
            `Inviting user ${userName} to "${worldName}" (${instanceId})`,
            { console: true },
            "info"
          );

          try {
            API.sendInvite(
              {
                instanceId: instanceId,
                worldId: worldId.split(":")[0],
                worldName: worldName,
              },
              this.autoInviteUser.id
            );

            this.lastInvitedTo = travelingToLocation;
            window.Logger?.log(
              `Successfully sent invite to ${userName}`,
              { console: true },
              "success"
            );
          } catch (error) {
            window.Logger?.log(
              `Failed to send invite: ${error.message}`,
              { console: true },
              "error"
            );
          }
        } else {
          window.Logger?.log(
            `Already invited user to this location: ${travelingToLocation}`,
            { console: true },
            "info"
          );
        }
      } else if (Utils.isEmpty(this.autoInviteUser)) {
        window.Logger?.log(
          `No auto invite user selected`,
          { console: true },
          "info"
        );
      } else if (Utils.isEmpty(travelingToLocation)) {
        window.Logger?.log(
          `No traveling destination provided`,
          { console: true },
          "warning"
        );
      }
    } else if (location && location !== "offline" && location !== "private") {
      // User has arrived at a new location
      this.lastJoined = location;
      window.Logger?.log(
        `User arrived at: ${location}`,
        { console: true },
        "info"
      );

      // Trigger registry overrides for instance switching
      if (window.customjs?.registryOverrides) {
        // Determine if this is a public or private instance
        const isPublic =
          location.includes("~public") || location.includes("~hidden");
        const eventType = isPublic
          ? "INSTANCE_SWITCH_PUBLIC"
          : "INSTANCE_SWITCH_PRIVATE";
        window.customjs.registryOverrides.triggerEvent(eventType);
      }
    }
  }

  toggleAutoInvite(user) {
    if (
      Utils.isEmpty(user) ||
      (!Utils.isEmpty(this.autoInviteUser) &&
        user.id === this.autoInviteUser?.id)
    ) {
      window.Logger?.log(
        `Disabled Auto Invite for user ${this.autoInviteUser.displayName}`,
        { console: true, vrcx: { message: true } },
        "warning"
      );
      this.autoInviteUser = null;
      this.customMenu.updateUserItem("autoInvite", {
        text: "Auto Invite",
        icon: "el-icon-message",
      });
    } else {
      this.autoInviteUser = user;
      window.Logger?.log(
        `Enabled Auto Invite for user ${this.autoInviteUser.displayName}`,
        { console: true, vrcx: { message: true } },
        "success"
      );
      this.customMenu.updateUserItem("autoInvite", {
        text: `Auto Invite: ${this.autoInviteUser.displayName}`,
        icon: "el-icon-message",
      });
    }
  }

  getAutoInviteUser() {
    return this.autoInviteUser;
  }
}

// Auto-initialize the module
(function () {
  // Register this module in the global namespace
  window.customjs = window.customjs || {};
  window.customjs.autoInviteManager = new AutoInviteManager();
  window.customjs.script = window.customjs.script || {};
  window.customjs.script.autoInvite = AutoInviteManager.SCRIPT;

  // Also make AutoInviteManager available globally for backward compatibility
  window.AutoInviteManager = AutoInviteManager;

  // Expose utility functions for console testing
  window.setAutoInviteUser = (userId) => {
    const user = window.$pinia?.user?.cachedUsers?.get(userId);
    if (user) {
      window.customjs.autoInviteManager.setUser(user);
    }
  };
  window.clearAutoInviteUser = () =>
    window.customjs.autoInviteManager.clearUser();

  console.log(
    `✓ Loaded ${AutoInviteManager.SCRIPT.name} v${AutoInviteManager.SCRIPT.version} by ${AutoInviteManager.SCRIPT.author}`
  );
})();
