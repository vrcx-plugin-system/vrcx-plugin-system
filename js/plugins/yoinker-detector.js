class YoinkerDetectorPlugin extends Plugin {
  constructor() {
    super({
      name: "Yoinker Detector",
      description:
        "Automatically checks users against yoinker detection database and applies tags + notifications",
      author: "Bluscream",
      version: "2.1.0",
      build: "1728778800",
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

    // Stats tracking
    this.stats = {
      totalChecked: 0,
      totalYoinkers: 0,
      cacheHits: 0,
      errors: 0,
    };

    this.logger.log("🔍 Yoinker Detector initialized");
  }

  async load() {
    this.logger.log("📦 Loading Yoinker Detector...");

    // Define settings with metadata
    this.config.enabled = this.createSetting({
      key: "enabled",
      category: "general",
      name: "Enable Yoinker Detection",
      description: "Enable or disable yoinker detection",
      type: "boolean",
      defaultValue: true,
    });

    this.config.logToConsole = this.createSetting({
      key: "logToConsole",
      category: "general",
      name: "Log to Console",
      description: "Log detection results to browser console",
      type: "boolean",
      defaultValue: true,
    });

    this.config.checkOnDialogOpen = this.createSetting({
      key: "checkOnDialogOpen",
      category: "general",
      name: "Check on User Dialog Open",
      description: "Check users when their profile dialog is opened",
      type: "boolean",
      defaultValue: true,
    });

    this.config.checkOnPlayerJoin = this.createSetting({
      key: "checkOnPlayerJoin",
      category: "general",
      name: "Check on Player Join",
      description: "Check users when they join your instance",
      type: "boolean",
      defaultValue: true,
    });

    this.config.notifyOnDetection = this.createSetting({
      key: "notifyOnDetection",
      category: "notifications",
      name: "Notify When Yoinker Detected",
      description: "Show notification when a yoinker is detected",
      type: "boolean",
      defaultValue: true,
    });

    this.config.desktopNotification = this.createSetting({
      key: "desktopNotification",
      category: "notifications",
      name: "Desktop Notification",
      description: "Show desktop notification for yoinker detection",
      type: "boolean",
      defaultValue: true,
    });

    this.config.vrNotification = this.createSetting({
      key: "vrNotification",
      category: "notifications",
      name: "VR Notification",
      description:
        "Show VR notification (XSOverlay, OVR Toolkit) for yoinker detection",
      type: "boolean",
      defaultValue: true,
    });

    this.config.autoTag = this.createSetting({
      key: "autoTag",
      category: "advanced",
      name: "Auto-Tag Yoinkers",
      description: "Automatically add tags to detected yoinkers",
      type: "boolean",
      defaultValue: true,
    });

    this.config.tagName = this.createSetting({
      key: "tagName",
      category: "advanced",
      name: "Tag Name",
      description: "Name of the tag to add to yoinkers",
      type: "string",
      defaultValue: "Yoinker",
    });

    this.config.tagColor = this.createSetting({
      key: "tagColor",
      category: "advanced",
      name: "Tag Color",
      description: "Color of the tag (hex format)",
      type: "string",
      defaultValue: "#ff0000",
    });

    this.config.cacheExpiration = this.createSetting({
      key: "cacheExpiration",
      category: "advanced",
      name: "Cache Expiration (minutes)",
      description: "How long to cache check results",
      type: "number",
      defaultValue: 30,
    });

    this.config.skipExistingTags = this.createSetting({
      key: "skipExistingTags",
      category: "advanced",
      name: "Skip Users with Existing Tags",
      description: "Don't check users who already have a custom tag",
      type: "boolean",
      defaultValue: true,
    });

    this.config.endpoint = this.createSetting({
      key: "endpoint",
      category: "advanced",
      name: "Detection Endpoint",
      description: "Yoinker detection API endpoint",
      type: "string",
      defaultValue: "https://yd.just-h.party/",
    });

    this.logger.log(`⚙️ Enabled: ${this.config.enabled.get()}`);
    this.logger.log(`⚙️ Endpoint: ${this.config.endpoint.get()}`);

    // Load cached data from storage
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
      if (this.config.checkOnDialogOpen.get()) {
        this.registerPostHook("$pinia.user.showUserDialog", (result, args) => {
          const userId = args[0];
          if (userId) {
            this.processUserId(userId, "User Dialog Opened");
          }
        });
        this.logger.log("✅ User dialog hook registered");
      }

      // Hook into player join events
      if (this.config.checkOnPlayerJoin.get()) {
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
    if (!this.config.enabled.get()) return;

    // Validate user ID format (usr_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
    if (
      !userId.match(/^usr_[0-9A-Fa-f]{8}-([0-9A-Fa-f]{4}-){3}[0-9A-Fa-f]{12}$/)
    ) {
      return;
    }

    // Check if user already has a custom tag (if enabled)
    if (this.config.skipExistingTags.get()) {
      const existingTag = this.getUserTag(userId);
      if (existingTag) {
        if (this.config.logToConsole.get()) {
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

    if (this.config.logToConsole.get()) {
      this.logger.log(`📋 Queuing user: ${userId} (from: ${source})`);
    }

    // Add to pending queue
    this.pendingQueue.add(userId);
    this.processedUsers.add(userId);
    this.stats.totalChecked++;

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
      if (cacheAge < this.config.cacheExpiration.get() * 60000) {
        this.stats.cacheHits++;
        if (cached.isYoinker) {
          this.handleYoinkerDetected(cached);
        } else {
          if (this.config.logToConsole.get()) {
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

      const endpoint = this.get(
        "advanced.endpoint",
        "https://yd.just-h.party/"
      );
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

        if (this.config.logToConsole.get()) {
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
        this.stats.errors++;
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
        this.stats.totalYoinkers++;

        this.handleYoinkerDetected(result);
      } else {
        // Not a yoinker
        const result = {
          userId,
          isYoinker: false,
          timestamp: Date.now(),
        };
        this.yoinkerCheckCache.set(userId, result);

        if (this.config.logToConsole.get()) {
          this.logger.log(`✅ User ${userId} checked - not a yoinker`);
        }
      }
    } catch (error) {
      this.stats.errors++;
      this.logger.error(`Error checking user ${userId}:`, error);
    }
  }

  // Handle when a yoinker is detected
  handleYoinkerDetected(result) {
    const message = `User ${result.userName} has been found ${result.reason}. (detection year: ${result.year})`;

    // Apply custom tag if enabled
    if (this.config.autoTag.get()) {
      this.applyYoinkerTag(result.userId);
    }

    // Show notifications if enabled
    if (this.config.notifyOnDetection.get()) {
      const notifyOptions = {
        console: this.config.logToConsole.get(),
        desktop: this.config.desktopNotification.get(),
        xsoverlay: this.config.vrNotification.get(),
        ovrtoolkit: this.config.vrNotification.get(),
      };

      this.logger.log(message, notifyOptions, "warn");
    } else {
      if (this.config.logToConsole.get()) {
        this.logger.log(`⚠️ ${message}`);
      }
    }
  }

  // Apply yoinker tag to user
  applyYoinkerTag(userId) {
    try {
      const userStore = window.$pinia?.user;
      if (!userStore) {
        this.logger.warn("User store not available, cannot apply tag");
        return;
      }

      const tagName = this.config.tagName.get();
      const tagColor = this.config.tagColor.get();

      userStore.addCustomTag({
        UserId: userId,
        Tag: tagName,
        TagColour: tagColor,
      });

      if (this.config.logToConsole.get()) {
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

  // Load processed users from localStorage
  loadProcessedUsers() {
    try {
      const stored = localStorage.getItem("yoinkerdetector_processed");
      if (stored) {
        const data = JSON.parse(stored);
        this.processedUsers = new Set(data.users || []);
        this.stats = data.stats || this.stats;

        // Load cache (with expiration check)
        if (data.cache) {
          const cacheExpiration = this.config.cacheExpiration.get() * 60000;
          for (const [userId, result] of Object.entries(data.cache)) {
            const cacheAge = (Date.now() - result.timestamp) / 1000 / 60;
            if (cacheAge < cacheExpiration) {
              this.yoinkerCheckCache.set(userId, result);
            }
          }
        }

        this.logger.log(
          `📂 Loaded ${this.processedUsers.size} processed users and ${this.yoinkerCheckCache.size} cached results`
        );
      }
    } catch (error) {
      this.logger.error("Error loading processed users:", error);
    }
  }

  // Save processed users to localStorage
  saveProcessedUsers() {
    try {
      const data = {
        users: Array.from(this.processedUsers),
        stats: this.stats,
        cache: Object.fromEntries(this.yoinkerCheckCache),
        lastSaved: new Date().toISOString(),
      };
      localStorage.setItem("yoinkerdetector_processed", JSON.stringify(data));
    } catch (error) {
      this.logger.error("Error saving processed users:", error);
    }
  }

  // Get statistics
  getStats() {
    return {
      ...this.stats,
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
    this.stats = {
      totalChecked: 0,
      totalYoinkers: 0,
      cacheHits: 0,
      errors: 0,
    };
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
