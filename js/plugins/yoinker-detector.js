class YoinkerDetectorPlugin extends Plugin {
  constructor() {
    super({
      name: "Yoinker Detector",
      description:
        "Automatically checks users against yoinker detection database and applies tags + notifications",
      author: "Bluscream",
      version: "2.0.0",
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

    // Settings are now accessed via this.get() with defaults
    // No registration needed! Settings are instantly saved when set.

    // Log current settings
    const enabled = this.get("general.enabled", true);
    const autoTag = this.get("advanced.autoTag", true);
    const endpoint = this.get("advanced.endpoint", "https://yd.just-h.party/");

    this.logger.log(`⚙️ Enabled: ${enabled}`);
    this.logger.log(`⚙️ Auto-tag: ${autoTag}`);
    this.logger.log(`⚙️ Endpoint: ${endpoint}`);

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
      if (this.get("general.checkOnDialogOpen", true)) {
        this.registerPostHook("$pinia.user.showUserDialog", (result, args) => {
          const userId = args[0];
          if (userId) {
            this.processUserId(userId, "User Dialog Opened");
          }
        });
        this.logger.log("✅ User dialog hook registered");
      }

      // Hook into player join events
      if (this.get("general.checkOnPlayerJoin", true)) {
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
    if (!this.get("general.enabled", true)) return;

    // Validate user ID format (usr_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
    if (
      !userId.match(/^usr_[0-9A-Fa-f]{8}-([0-9A-Fa-f]{4}-){3}[0-9A-Fa-f]{12}$/)
    ) {
      return;
    }

    // Check if user already has a custom tag (if enabled)
    if (this.get("advanced.skipExistingTags", true)) {
      const existingTag = this.getUserTag(userId);
      if (existingTag) {
        if (this.get("general.logToConsole", true)) {
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

    if (this.get("general.logToConsole", true)) {
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
      if (cacheAge < this.get("advanced.cacheExpiration", 30) * 60000) {
        this.stats.cacheHits++;
        if (cached.isYoinker) {
          this.handleYoinkerDetected(cached);
        } else {
          if (this.get("general.logToConsole", true)) {
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

        if (this.get("general.logToConsole", true)) {
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

        if (this.get("general.logToConsole", true)) {
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
    if (this.get("advanced.autoTag", true)) {
      this.applyYoinkerTag(result.userId);
    }

    // Show notifications if enabled
    if (this.get("notifications.notifyOnDetection", true)) {
      const notifyOptions = {
        console: this.get("general.logToConsole", true),
        desktop: this.get("notifications.desktopNotification", true),
        xsoverlay: this.get("notifications.vrNotification", true),
        ovrtoolkit: this.get("notifications.vrNotification", true),
      };

      this.logger.log(message, notifyOptions, "warn");
    } else {
      if (this.get("general.logToConsole", true)) {
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

      const tagName = this.get("advanced.tagName", "Yoinker");
      const tagColor = this.get("advanced.tagColor", "#ff0000");

      userStore.addCustomTag({
        UserId: userId,
        Tag: tagName,
        TagColour: tagColor,
      });

      if (this.get("general.logToConsole", true)) {
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
          const cacheExpiration =
            this.get("advanced.cacheExpiration", 30) * 60000;
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
