class YoinkerDetectorPlugin extends Plugin {
  constructor() {
    super({
      name: "Yoinker Detector",
      description:
        "Automatically checks users against yoinker detection database and applies tags + notifications",
      author: "Bluscream",
      version: "3.1.0",
      build: "1728935100",
      dependencies: [],
    });

    // Track processed users to avoid duplicate checks
    this.processedUsers = new Set();
    this.pendingQueue = new Set();
    this.isProcessing = false;

    // Cache for yoinker check results (userId -> {timestamp, result})
    this.yoinkerCheckCache = new Map();

    // Rate limiting
    this.rateLimits = {
      lastRequest: 0,
      minInterval: 1000, // 1 second between requests
    };

    this.logger.log("🔍 Yoinker Detector initialized");
  }

  async load() {
    this.logger.log("📦 Loading Yoinker Detector...");

    // Define settings using new Equicord-style system
    const SettingType = window.customjs.SettingType;

    // Define category metadata
    this.categories = this.defineSettingsCategories({
      general: {
        name: "General Settings",
        description: "Basic plugin configuration",
      },
      detection: {
        name: "Detection Triggers",
        description: "Control when to check users",
      },
      notifications: {
        name: "Notifications",
        description: "Configure notification settings",
      },
      tagging: {
        name: "Auto-Tagging",
        description: "Automatically tag detected yoinkers",
      },
      advanced: {
        name: "Advanced Options",
        description: "Advanced configuration and cache settings",
      },
    });

    this.settings = this.defineSettings({
      enabled: {
        type: SettingType.BOOLEAN,
        description: "Enable or disable yoinker detection",
        category: "general",
        default: true,
      },
      logToConsole: {
        type: SettingType.BOOLEAN,
        description: "Log detection results to browser console",
        category: "general",
        default: true,
      },
      checkOnDialogOpen: {
        type: SettingType.BOOLEAN,
        description: "Check users when their profile dialog is opened",
        category: "detection",
        default: true,
      },
      checkOnPlayerJoin: {
        type: SettingType.BOOLEAN,
        description: "Check users when they join your instance",
        category: "detection",
        default: true,
      },
      desktopNotification: {
        type: SettingType.BOOLEAN,
        description: "Show desktop notification for yoinker detection",
        category: "notifications",
        default: true,
      },
      vrNotification: {
        type: SettingType.BOOLEAN,
        description:
          "Show VR notification (XSOverlay, OVR Toolkit) for yoinker detection",
        category: "notifications",
        default: true,
      },
      autoTag: {
        type: SettingType.BOOLEAN,
        description: "Automatically add tags to detected yoinkers",
        category: "tagging",
        default: true,
      },
      tagName: {
        type: SettingType.STRING,
        description: "Name of the tag to add to yoinkers",
        category: "tagging",
        placeholder: "Yoinker",
        default: "Yoinker",
      },
      tagColor: {
        type: SettingType.STRING,
        description: "Color of the tag (hex format)",
        category: "tagging",
        placeholder: "#ff0000",
        default: "#ff0000",
      },
      skipExistingTags: {
        type: SettingType.BOOLEAN,
        description: "Don't check users who already have a custom tag",
        category: "advanced",
        default: true,
      },
      cacheExpiration: {
        type: SettingType.NUMBER,
        description: "How long to cache check results (minutes)",
        category: "advanced",
        default: 30,
      },
      endpoint: {
        type: SettingType.STRING,
        description: "Yoinker detection API endpoint",
        category: "advanced",
        placeholder: "https://yd.just-h.party/",
        default: "https://yd.just-h.party/",
      },
      // Hidden stats (stored but not visible in UI)
      statsTotalChecked: {
        type: SettingType.NUMBER,
        description: "Total users checked (hidden stat)",
        default: 0,
        hidden: true,
      },
      statsTotalYoinkers: {
        type: SettingType.NUMBER,
        description: "Total yoinkers found (hidden stat)",
        default: 0,
        hidden: true,
      },
      statsCacheHits: {
        type: SettingType.NUMBER,
        description: "Cache hit count (hidden stat)",
        default: 0,
        hidden: true,
      },
      statsErrors: {
        type: SettingType.NUMBER,
        description: "Error count (hidden stat)",
        default: 0,
        hidden: true,
      },
      // Processed users storage
      processedUsersData: {
        type: SettingType.STRING,
        description: "Processed users data (hidden)",
        default: "[]",
        hidden: true,
      },
      // Migration flag
      migrationComplete: {
        type: SettingType.BOOLEAN,
        description: "Migration from localStorage complete (hidden)",
        default: false,
        hidden: true,
      },
    });

    this.logger.log(`⚙️ Enabled: ${this.settings.store.enabled}`);
    this.logger.log(`⚙️ Endpoint: ${this.settings.store.endpoint}`);

    // Run one-time migration from localStorage
    this.migrateFromLocalStorage();

    // Load cached data from settings store
    this.loadProcessedUsers();

    this.logger.log("✅ Yoinker Detector loaded");
  }

  async start() {
    this.logger.log("🚀 Starting Yoinker Detector...");

    // Hook into user dialog and player join events
    this.hookUserEvents();

    this.logger.log("✅ Yoinker Detector started and monitoring");
  }

  async stop() {
    this.logger.log("🛑 Stopping Yoinker Detector...");
    // Save state
    this.saveProcessedUsers();
  }

  // Hook into VRCX user events
  hookUserEvents() {
    try {
      // Hook into showUserDialog
      if (this.settings.store.checkOnDialogOpen) {
        this.registerPostHook("$pinia.user.showUserDialog", (result, args) => {
          const userId = args[0];
          if (userId) {
            this.processUserId(userId, "User Dialog Opened");
          }
        });
        this.logger.log("✅ User dialog hook registered");
      }

      // Hook into player join events
      if (this.settings.store.checkOnPlayerJoin) {
        this.registerPostHook("$pinia.gameLog.addGameLog", (result, args) => {
          const entry = args[0];
          if (entry?.type === "OnPlayerJoined" && entry.userId) {
            this.processUserId(entry.userId, "Player Join");
          }
        });
        this.logger.log("✅ Player join hook registered");
      }

      this.logger.log("✅ Event hooks registered");
    } catch (error) {
      this.logger.error("Failed to register event hooks:", error);
    }
  }

  // Process a single user ID
  processUserId(userId, source = "unknown") {
    if (!userId || typeof userId !== "string") return;

    // Check if detection is enabled
    if (!this.settings.store.enabled) return;

    // Validate user ID format (usr_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
    if (
      !userId.match(/^usr_[0-9A-Fa-f]{8}-([0-9A-Fa-f]{4}-){3}[0-9A-Fa-f]{12}$/)
    ) {
      return;
    }

    // Check if user already has a custom tag (if enabled)
    if (this.settings.store.skipExistingTags) {
      const existingTag = this.getUserTag(userId);
      if (existingTag) {
        if (this.settings.store.logToConsole) {
          this.logger.log(
            `⏭️ Skipping ${userId} - already has tag: ${existingTag.tag}`
          );
        }
        return;
      }
    }

    // Skip if already processed recently
    if (this.processedUsers.has(userId)) {
      return;
    }

    if (this.settings.store.logToConsole) {
      this.logger.log(`📋 Queuing user: ${userId} (from: ${source})`);
    }

    // Add to pending queue
    this.pendingQueue.add(userId);
    this.processedUsers.add(userId);
    this.settings.store.statsTotalChecked++;

    // Trigger queue processing
    this.processQueue();
  }

  // Process the queue of pending users
  async processQueue() {
    if (this.isProcessing || this.pendingQueue.size === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      // Process one at a time to respect rate limits
      const userId = Array.from(this.pendingQueue)[0];

      await this.checkUser(userId);

      // Remove processed from queue
      this.pendingQueue.delete(userId);

      // Continue processing if more in queue
      if (this.pendingQueue.size > 0) {
        setTimeout(() => {
          this.isProcessing = false;
          this.processQueue();
        }, this.rateLimits.minInterval);
      } else {
        this.isProcessing = false;
        this.saveProcessedUsers();
      }
    } catch (error) {
      this.logger.error("Error processing queue:", error);
      this.isProcessing = false;
    }
  }

  // Check if user is a yoinker
  async checkUser(userId) {
    // Check cache first
    const cached = this.yoinkerCheckCache.get(userId);
    if (cached) {
      const cacheAge = (Date.now() - cached.timestamp) / 1000 / 60; // minutes
      if (cacheAge < this.settings.store.cacheExpiration * 60000) {
        this.settings.store.statsCacheHits++;
        if (cached.isYoinker) {
          this.handleYoinkerDetected(cached);
        } else {
          if (this.settings.store.logToConsole) {
            this.logger.log(`✅ User ${userId} not a yoinker (cached result)`);
          }
        }
        return;
      } else {
        // Cache expired, remove it
        this.yoinkerCheckCache.delete(userId);
      }
    }

    // Wait for rate limit
    await this.waitForRateLimit();

    try {
      // Hash the userId like StandaloneNotifier does
      const hash = await this.hashUserId(userId);

      const endpoint = this.settings.store.endpoint;
      const url = `${endpoint}${hash}`;

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "User-Agent": "VRCX-YoinkerDetector/1.0",
        },
      });

      if (response.status === 404) {
        // Not found in database - not a yoinker
        const result = {
          userId,
          isYoinker: false,
          timestamp: Date.now(),
        };
        this.yoinkerCheckCache.set(userId, result);

        if (this.settings.store.logToConsole) {
          this.logger.log(`✅ User ${userId} not found in yoinker database`);
        }
        return;
      }

      if (response.status === 429) {
        // Rate limited
        this.logger.warn("⚠️ Rate limited by yoinker detection API");
        return;
      }

      if (!response.ok) {
        this.settings.store.statsErrors++;
        this.logger.error(`HTTP error ${response.status} for user ${userId}`);
        return;
      }

      const data = await response.json();

      if (data && data.IsYoinker) {
        // Yoinker detected!
        const result = {
          userId: data.UserId || userId,
          userName: data.UserName || "Unknown",
          isYoinker: true,
          reason: data.Reason || "unknown reason",
          year: data.Year || "unknown",
          timestamp: Date.now(),
        };

        this.yoinkerCheckCache.set(userId, result);
        this.settings.store.statsTotalYoinkers++;

        this.handleYoinkerDetected(result);
      } else {
        // Not a yoinker
        const result = {
          userId,
          isYoinker: false,
          timestamp: Date.now(),
        };
        this.yoinkerCheckCache.set(userId, result);

        if (this.settings.store.logToConsole) {
          this.logger.log(`✅ User ${userId} checked - not a yoinker`);
        }
      }
    } catch (error) {
      this.settings.store.statsErrors++;
      this.logger.error(`Error checking user ${userId}:`, error);
    }
  }

  // Handle when a yoinker is detected
  handleYoinkerDetected(result) {
    const message = `User ${result.userName} has been found ${result.reason}. (detection year: ${result.year})`;

    // Apply custom tag if enabled
    if (this.settings.store.autoTag) {
      this.applyYoinkerTag(result.userId);
    }

    // Show notifications based on individual settings
    const notifyOptions = {
      console: this.settings.store.logToConsole,
      desktop: this.settings.store.desktopNotification,
      xsoverlay: this.settings.store.vrNotification,
      ovrtoolkit: this.settings.store.vrNotification,
    };

    this.logger.log(message, notifyOptions, "warn");
  }

  // Apply yoinker tag to user
  applyYoinkerTag(userId) {
    try {
      const userStore = window.$pinia?.user;
      if (!userStore) {
        this.logger.warn("User store not available, cannot apply tag");
        return;
      }

      const tagName = this.settings.store.tagName;
      const tagColor = this.settings.store.tagColor;

      userStore.addCustomTag({
        UserId: userId,
        Tag: tagName,
        TagColour: tagColor,
      });

      if (this.settings.store.logToConsole) {
        this.logger.log(`🏷️ Applied tag "${tagName}" to user ${userId}`);
      }
    } catch (error) {
      this.logger.error(`Error applying tag to user ${userId}:`, error);
    }
  }

  // Hash userId using SHA256 (like StandaloneNotifier)
  async hashUserId(userId) {
    const encoder = new TextEncoder();
    const data = encoder.encode(userId);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashBase64 = btoa(String.fromCharCode(...hashArray));
    // Replace / with - like StandaloneNotifier does
    return hashBase64.replace(/\//g, "-");
  }

  // Rate limiting helper
  async waitForRateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.rateLimits.lastRequest;

    if (timeSinceLastRequest < this.rateLimits.minInterval) {
      const waitTime = this.rateLimits.minInterval - timeSinceLastRequest;
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }

    this.rateLimits.lastRequest = Date.now();
  }

  // Get tag for a specific user
  getUserTag(userId) {
    const customTags = window.$pinia?.user?.customUserTags;
    if (!customTags || customTags.size === 0) {
      return null;
    }
    return customTags.get(userId) || null;
  }

  // One-time migration from localStorage to settings store
  migrateFromLocalStorage() {
    // Check if migration has already been done
    if (this.settings.store.migrationComplete) {
      return;
    }

    try {
      const stored = localStorage.getItem("yoinkerdetector_processed");
      if (stored) {
        const data = JSON.parse(stored);

        // Migrate processed users
        if (data.users && Array.isArray(data.users)) {
          this.settings.store.processedUsersData = JSON.stringify(data.users);
        }

        // Migrate stats
        if (data.stats) {
          this.settings.store.statsTotalChecked = data.stats.totalChecked || 0;
          this.settings.store.statsTotalYoinkers =
            data.stats.totalYoinkers || 0;
          this.settings.store.statsCacheHits = data.stats.cacheHits || 0;
          this.settings.store.statsErrors = data.stats.errors || 0;
        }

        // Load cache into memory for this session only (not persisted)
        if (data.cache) {
          const cacheExpiration = this.settings.store.cacheExpiration * 60000;
          for (const [userId, result] of Object.entries(data.cache)) {
            const cacheAge = (Date.now() - result.timestamp) / 1000 / 60;
            if (cacheAge < cacheExpiration) {
              this.yoinkerCheckCache.set(userId, result);
            }
          }
        }

        // Delete the old localStorage key
        localStorage.removeItem("yoinkerdetector_processed");

        this.logger.log(
          "✅ Successfully migrated data from localStorage to settings store"
        );
      }

      // Mark migration as complete
      this.settings.store.migrationComplete = true;
    } catch (error) {
      this.logger.error("Error during migration from localStorage:", error);
      // Still mark as complete to avoid repeated failures
      this.settings.store.migrationComplete = true;
    }
  }

  // Load processed users from settings store
  loadProcessedUsers() {
    try {
      // Load processed users
      const usersData = JSON.parse(this.settings.store.processedUsersData);
      this.processedUsers = new Set(usersData || []);

      // Cache is session-only and starts empty
      this.logger.log(
        `📂 Loaded ${this.processedUsers.size} processed users (cache is session-only)`
      );
    } catch (error) {
      this.logger.error("Error loading processed users:", error);
    }
  }

  // Save processed users to settings store
  saveProcessedUsers() {
    try {
      // Save processed users only (cache is session-only, not persisted)
      this.settings.store.processedUsersData = JSON.stringify(
        Array.from(this.processedUsers)
      );
    } catch (error) {
      this.logger.error("Error saving processed users:", error);
    }
  }

  // Get statistics
  getStats() {
    return {
      totalChecked: this.settings.store.statsTotalChecked,
      totalYoinkers: this.settings.store.statsTotalYoinkers,
      cacheHits: this.settings.store.statsCacheHits,
      errors: this.settings.store.statsErrors,
      processedUsers: this.processedUsers.size,
      pendingQueue: this.pendingQueue.size,
      cachedResults: this.yoinkerCheckCache.size,
    };
  }

  // Clear all processed users and cache (useful for debugging)
  clearCache() {
    this.processedUsers.clear();
    this.pendingQueue.clear();
    this.yoinkerCheckCache.clear();

    // Reset stats
    this.settings.store.statsTotalChecked = 0;
    this.settings.store.statsTotalYoinkers = 0;
    this.settings.store.statsCacheHits = 0;
    this.settings.store.statsErrors = 0;

    // Clear settings store data
    this.settings.store.processedUsersData = "[]";

    // Also clear old localStorage key if it exists
    localStorage.removeItem("yoinkerdetector_processed");

    this.logger.log("🗑️ Cleared all processed users and cache!");
  }

  // Manual check for a specific user
  async manualCheck(userId) {
    this.logger.log(`🔍 Manually checking user: ${userId}`);
    // Clear from processed set to allow re-check
    this.processedUsers.delete(userId);
    this.yoinkerCheckCache.delete(userId);
    this.processUserId(userId, "Manual Check");
  }
}

// Make plugin class available for PluginLoader to instantiate
window.customjs.__LAST_PLUGIN_CLASS__ = YoinkerDetectorPlugin;
