class AvatarLogPlugin extends Plugin {
  constructor() {
    super({
      name: "Avatar Logger",
      description:
        "Logs and submits avatar IDs to various avatar database providers (avtrDB, NSVR, PAW, VRCDB, VRCWB)",
      author: "Bluscream",
      version: "3.1.0",
      build: "1728935100",
      dependencies: [],
    });

    // Track processed avatars to avoid duplicates
    this.processedAvatars = new Set();
    this.pendingQueue = new Set();
    this.isProcessing = false;

    // Rate limiting per provider
    this.rateLimits = {
      avtrdb: { lastRequest: 0, minInterval: 1000 },
      nsvr: { lastRequest: 0, minInterval: 1000 },
      paw: { lastRequest: 0, minInterval: 1000 },
      vrcdb: { lastRequest: 0, minInterval: 1000 },
      vrcwb: { lastRequest: 0, minInterval: 1000 },
    };

    // Stats tracking
    this.stats = {
      totalProcessed: 0,
      totalSent: 0,
      totalUnique: 0,
      byProvider: {
        avtrdb: { sent: 0, unique: 0, errors: 0 },
        nsvr: { sent: 0, unique: 0, errors: 0 },
        paw: { sent: 0, unique: 0, errors: 0 },
        vrcdb: { sent: 0, unique: 0, errors: 0 },
        vrcwb: { sent: 0, unique: 0, errors: 0 },
      },
    };

    this.logger.log("🎭 Avatar Logger initialized");
  }

  async load() {
    this.logger.log("📦 Loading Avatar Logger...");

    // Define category metadata
    this.categories = this.defineSettingsCategories({
      general: {
        name: "General Settings",
        description: "Basic plugin configuration",
      },
      providers: {
        name: "Avatar Database Providers",
        description: "Enable or disable specific avatar databases",
      },
      performance: {
        name: "Performance & Processing",
        description: "Control how avatars are processed and submitted",
      },
    });

    // Define settings using new system
    this.settings = this.defineSettings({
      attribution: {
        type: SettingType.STRING,
        description:
          "Your Discord User ID for attribution (leave empty for anonymous)",
        category: "general",
        default: "",
        placeholder: "Discord User ID",
      },
      logToConsole: {
        type: SettingType.BOOLEAN,
        description: "Log avatar processing to browser console",
        category: "general",
        default: true,
      },
      scanOnStartup: {
        type: SettingType.BOOLEAN,
        description: "Scan avatar stores on login",
        category: "general",
        default: true,
      },
      enableAvtrDB: {
        type: SettingType.BOOLEAN,
        description: "avtrDB - Avatar Search (api.avtrdb.com)",
        category: "providers",
        default: true,
      },
      enableNSVR: {
        type: SettingType.BOOLEAN,
        description: "NSVR - NekoSune Community (avtr.nekosunevr.co.uk)",
        category: "providers",
        default: true,
      },
      enablePAW: {
        type: SettingType.BOOLEAN,
        description: "PAW - Puppy's Avatar World (paw-api.amelia.fun)",
        category: "providers",
        default: true,
      },
      enableVRCDB: {
        type: SettingType.BOOLEAN,
        description: "VRCDB - Avatar Search (search.bs002.de)",
        category: "providers",
        default: true,
      },
      enableVRCWB: {
        type: SettingType.BOOLEAN,
        description: "VRCWB - World Balancer (avatar.worldbalancer.com)",
        category: "providers",
        default: true,
      },
      batchSize: {
        type: SettingType.NUMBER,
        description: "Number of avatars to process simultaneously",
        category: "performance",
        default: 5,
      },
      queueDelay: {
        type: SettingType.NUMBER,
        description: "Delay between processing batches (milliseconds)",
        category: "performance",
        default: 2000,
      },
      retryAttempts: {
        type: SettingType.NUMBER,
        description: "Number of retry attempts for failed requests",
        category: "performance",
        default: 3,
      },
    });

    const enabledProviders = [
      this.settings.store.enableAvtrDB && "avtrDB",
      this.settings.store.enableNSVR && "NSVR",
      this.settings.store.enablePAW && "PAW",
      this.settings.store.enableVRCDB && "VRCDB",
      this.settings.store.enableVRCWB && "VRCWB",
    ].filter(Boolean);

    this.logger.log(`⚙️ Enabled providers: ${enabledProviders.join(", ")}`);

    // Load processed avatars from storage
    this.loadProcessedAvatars();

    this.logger.log("✅ Avatar Logger loaded");
  }

  async start() {
    this.logger.log("🚀 Starting Avatar Logger...");

    // Hook into avatar-related events and functions
    this.hookAvatarEvents();

    this.logger.log("✅ Avatar Logger started and monitoring");
  }

  async onLogin() {
    if (!this.settings.store.scanOnStartup) return;

    this.logger.log("👤 User logged in, scanning avatar stores...");

    // Wait a bit for stores to be populated
    setTimeout(() => {
      this.scanAvatarStores();
    }, 5000);
  }

  async stop() {
    this.logger.log("🛑 Stopping Avatar Logger...");
    // Save state
    this.saveProcessedAvatars();
  }

  // Hook into VRCX avatar events using proper hooking system
  hookAvatarEvents() {
    try {
      // Hook into gameLog.addGameLog to catch AvatarChange events
      this.registerPostHook("$pinia.gameLog.addGameLog", (result, args) => {
        const entry = args[0];
        if (entry?.type === "AvatarChange" && entry.avatarId) {
          this.processAvatarId(entry.avatarId, "AvatarChange Event");
        }
      });

      // Hook into avatar store methods via $pinia
      // Hook showAvatarDialog
      this.registerPostHook(
        "$pinia.avatar.showAvatarDialog",
        (result, args) => {
          const avatarId = args[0];
          if (avatarId) {
            this.processAvatarId(avatarId, "showAvatarDialog");
          }
        }
      );

      // Hook addAvatarToHistory
      this.registerPostHook(
        "$pinia.avatar.addAvatarToHistory",
        (result, args) => {
          const avatarId = args[0];
          if (avatarId) {
            this.processAvatarId(avatarId, "addAvatarToHistory");
          }
        }
      );

      // Hook applyAvatar
      this.registerPostHook("$pinia.avatar.applyAvatar", (result, args) => {
        const json = args[0];
        if (json?.id) {
          this.processAvatarId(json.id, "applyAvatar");
        }
      });

      // Hook addAvatarWearTime
      this.registerPreHook("$pinia.avatar.addAvatarWearTime", (args) => {
        const avatarId = args[0];
        if (avatarId) {
          this.processAvatarId(avatarId, "addAvatarWearTime");
        }
      });

      this.logger.log("✅ Avatar event hooks registered");
    } catch (error) {
      this.logger.error("Failed to register avatar hooks:", error);
    }
  }

  // Process a single avatar ID
  processAvatarId(avatarId, source = "unknown") {
    if (!avatarId || typeof avatarId !== "string") return;

    // Validate avatar ID format (avtr_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
    if (
      !avatarId.match(
        /^avtr_[0-9A-Fa-f]{8}-([0-9A-Fa-f]{4}-){3}[0-9A-Fa-f]{12}$/
      )
    ) {
      return;
    }

    // Skip if already processed
    if (this.processedAvatars.has(avatarId)) {
      return;
    }

    if (this.settings.store.logToConsole) {
      this.logger.log(`📋 Queuing avatar: ${avatarId} (from: ${source})`);
    }

    // Add to pending queue
    this.pendingQueue.add(avatarId);
    this.processedAvatars.add(avatarId);
    this.stats.totalProcessed++;

    // Trigger queue processing
    this.processQueue();
  }

  // Process the queue of pending avatars
  async processQueue() {
    if (this.isProcessing || this.pendingQueue.size === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      const batchSize = this.settings.store.batchSize;
      const batch = Array.from(this.pendingQueue).slice(0, batchSize);

      // Process batch
      const promises = batch.map((avatarId) => this.sendToProviders(avatarId));
      await Promise.allSettled(promises);

      // Remove processed from queue
      batch.forEach((id) => this.pendingQueue.delete(id));

      // Continue processing if more in queue
      if (this.pendingQueue.size > 0) {
        const delay = this.settings.store.queueDelay;
        setTimeout(() => {
          this.isProcessing = false;
          this.processQueue();
        }, delay);
      } else {
        this.isProcessing = false;
        this.saveProcessedAvatars();
      }
    } catch (error) {
      this.logger.error("Error processing queue:", error);
      this.isProcessing = false;
    }
  }

  // Send avatar ID to all enabled providers
  async sendToProviders(avatarId) {
    const attribution = this.settings.store.attribution;
    const userId = attribution || "1007655277732651069"; // VRC-LOG Dev ID as default

    const results = {
      avatarId,
      providers: {},
    };

    // Send to each enabled provider
    if (this.settings.store.enableAvtrDB) {
      results.providers.avtrdb = await this.sendToAvtrDB(avatarId, userId);
    }
    if (this.settings.store.enableNSVR) {
      results.providers.nsvr = await this.sendToNSVR(avatarId, userId);
    }
    if (this.settings.store.enablePAW) {
      results.providers.paw = await this.sendToPAW(avatarId);
    }
    if (this.settings.store.enableVRCDB) {
      results.providers.vrcdb = await this.sendToVRCDB(avatarId, userId);
    }
    if (this.settings.store.enableVRCWB) {
      results.providers.vrcwb = await this.sendToVRCWB(avatarId, userId);
    }

    if (this.settings.store.logToConsole) {
      this.logger.log(`✅ Processed ${avatarId}:`, results.providers);
    }

    return results;
  }

  // avtrDB Provider
  async sendToAvtrDB(avatarId, userId) {
    const provider = "avtrdb";
    await this.waitForRateLimit(provider);

    try {
      const response = await fetch("https://api.avtrdb.com/v2/avatar/ingest", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "VRCX-AvatarLog/1.0",
        },
        body: JSON.stringify({
          avatar_ids: [avatarId],
          attribution: userId,
        }),
      });

      const data = await response.json();
      this.stats.byProvider[provider].sent++;

      if (response.ok && data.valid_avatar_ids === 1) {
        this.stats.byProvider[provider].unique++;
        this.stats.totalUnique++;
        return { success: true, unique: true, provider: "avtrDB" };
      }

      return { success: true, unique: false, provider: "avtrDB" };
    } catch (error) {
      this.stats.byProvider[provider].errors++;
      this.logger.error(`avtrDB error for ${avatarId}:`, error);
      return { success: false, error: error.message, provider: "avtrDB" };
    }
  }

  // NSVR Provider
  async sendToNSVR(avatarId, userId) {
    const provider = "nsvr";
    await this.waitForRateLimit(provider);

    try {
      const response = await fetch(
        "https://avtr.nekosunevr.co.uk/v1/vrchat/avatars/store/putavatarExternal",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "User-Agent": "VRCX-AvatarLog/1.0",
          },
          body: JSON.stringify({
            id: avatarId,
            userid: userId,
          }),
        }
      );

      this.stats.byProvider[provider].sent++;
      const isUnique = response.status === 404;

      if (isUnique) {
        this.stats.byProvider[provider].unique++;
        this.stats.totalUnique++;
      }

      if (response.ok || response.status === 404) {
        return { success: true, unique: isUnique, provider: "NSVR" };
      }

      return { success: false, status: response.status, provider: "NSVR" };
    } catch (error) {
      // NSVR goes offline often, don't count as error
      this.logger.warn(`NSVR error for ${avatarId}:`, error);
      return { success: false, error: error.message, provider: "NSVR" };
    }
  }

  // PAW Provider
  async sendToPAW(avatarId) {
    const provider = "paw";
    await this.waitForRateLimit(provider);

    try {
      const response = await fetch(
        `https://paw-api.amelia.fun/update?avatarId=${avatarId}`,
        {
          method: "POST",
          headers: {
            "User-Agent": "VRCX-AvatarLog/1.0",
          },
        }
      );

      const data = await response.json();
      this.stats.byProvider[provider].sent++;

      // Avatar is unique if it's not in the database yet
      const isUnique =
        !data.avatar ||
        data.avatar === null ||
        (Array.isArray(data.avatar) && data.avatar.length === 0);

      if (isUnique) {
        this.stats.byProvider[provider].unique++;
        this.stats.totalUnique++;
      }

      if (response.ok) {
        return { success: true, unique: isUnique, provider: "PAW" };
      }

      return { success: false, status: response.status, provider: "PAW" };
    } catch (error) {
      this.stats.byProvider[provider].errors++;
      this.logger.error(`PAW error for ${avatarId}:`, error);
      return { success: false, error: error.message, provider: "PAW" };
    }
  }

  // VRCDB Provider
  async sendToVRCDB(avatarId, userId) {
    const provider = "vrcdb";
    await this.waitForRateLimit(provider);

    try {
      const response = await fetch(
        "https://search.bs002.de/api/Avatar/putavatar",
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "User-Agent": "VRCX-AvatarLog/1.0",
          },
          body: JSON.stringify({
            id: avatarId,
            userid: userId,
          }),
        }
      );

      this.stats.byProvider[provider].sent++;
      const isUnique = response.status === 404;

      if (isUnique) {
        this.stats.byProvider[provider].unique++;
        this.stats.totalUnique++;
      }

      if (response.ok || response.status === 404 || response.status === 500) {
        return { success: true, unique: isUnique, provider: "VRCDB" };
      }

      return { success: false, status: response.status, provider: "VRCDB" };
    } catch (error) {
      this.stats.byProvider[provider].errors++;
      this.logger.error(`VRCDB error for ${avatarId}:`, error);
      return { success: false, error: error.message, provider: "VRCDB" };
    }
  }

  // VRCWB Provider
  async sendToVRCWB(avatarId, userId) {
    const provider = "vrcwb";
    await this.waitForRateLimit(provider);

    try {
      const response = await fetch(
        "https://avatar.worldbalancer.com/v1/vrchat/avatars/store/putavatarExternal",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "User-Agent": "VRCX-AvatarLog/1.0",
          },
          body: JSON.stringify({
            id: avatarId,
            userid: userId,
          }),
        }
      );

      this.stats.byProvider[provider].sent++;
      const isUnique = response.status === 404;

      if (isUnique) {
        this.stats.byProvider[provider].unique++;
        this.stats.totalUnique++;
      }

      if (response.ok || response.status === 404) {
        return { success: true, unique: isUnique, provider: "VRCWB" };
      }

      return { success: false, status: response.status, provider: "VRCWB" };
    } catch (error) {
      this.stats.byProvider[provider].errors++;
      this.logger.error(`VRCWB error for ${avatarId}:`, error);
      return { success: false, error: error.message, provider: "VRCWB" };
    }
  }

  // Rate limiting helper
  async waitForRateLimit(provider) {
    const rateLimit = this.rateLimits[provider];
    const now = Date.now();
    const timeSinceLastRequest = now - rateLimit.lastRequest;

    if (timeSinceLastRequest < rateLimit.minInterval) {
      const waitTime = rateLimit.minInterval - timeSinceLastRequest;
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }

    this.rateLimits[provider].lastRequest = Date.now();
  }

  // Scan existing avatar stores for IDs
  async scanAvatarStores() {
    this.logger.log("🔍 Scanning avatar stores...");

    try {
      const avatarStore = window.$pinia?.avatar;
      if (!avatarStore) {
        this.logger.warn("Avatar store not available");
        return;
      }

      let count = 0;

      // Scan cached avatars (Map)
      const cachedAvatars =
        avatarStore.cachedAvatars?.value || avatarStore.cachedAvatars;
      if (cachedAvatars && cachedAvatars instanceof Map) {
        for (const [avatarId] of cachedAvatars) {
          this.processAvatarId(avatarId, "Store Scan - Cached");
          count++;
        }
      }

      // Scan avatar history (Set)
      const avatarHistory =
        avatarStore.avatarHistory?.value || avatarStore.avatarHistory;
      if (avatarHistory) {
        // Handle both Set and Array
        const historyIterable =
          avatarHistory instanceof Set
            ? avatarHistory
            : Array.isArray(avatarHistory)
            ? avatarHistory
            : [];
        for (const avatarId of historyIterable) {
          this.processAvatarId(avatarId, "Store Scan - History");
          count++;
        }
      }

      // Scan favorite store for avatar favorites
      const favoriteStore = window.$pinia?.favorite;

      // First try localAvatarFavoritesList (array of avatar IDs)
      if (favoriteStore?.localAvatarFavoritesList) {
        const avatarList =
          favoriteStore.localAvatarFavoritesList.value ||
          favoriteStore.localAvatarFavoritesList;
        if (Array.isArray(avatarList)) {
          for (const avatarId of avatarList) {
            if (avatarId) {
              this.processAvatarId(avatarId, "Store Scan - Favorites List");
              count++;
            }
          }
        }
      }

      // Also scan localAvatarFavorites (grouped favorites)
      if (favoriteStore?.localAvatarFavorites) {
        const favorites =
          favoriteStore.localAvatarFavorites.value ||
          favoriteStore.localAvatarFavorites;
        if (favorites && typeof favorites === "object") {
          for (const group in favorites) {
            const groupFavorites = favorites[group];
            if (Array.isArray(groupFavorites)) {
              for (const fav of groupFavorites) {
                if (fav?.id) {
                  this.processAvatarId(fav.id, "Store Scan - Favorites");
                  count++;
                }
              }
            }
          }
        }
      }

      this.logger.log(`✅ Store scan complete - found ${count} avatars`);
    } catch (error) {
      this.logger.error("Error scanning stores:", error);
    }
  }

  // Load processed avatars from localStorage
  loadProcessedAvatars() {
    try {
      const stored = localStorage.getItem("avatarlog_processed");
      if (stored) {
        const data = JSON.parse(stored);
        this.processedAvatars = new Set(data.avatars || []);
        this.stats = data.stats || this.stats;
        this.logger.log(
          `📂 Loaded ${this.processedAvatars.size} processed avatars`
        );
      }
    } catch (error) {
      this.logger.error("Error loading processed avatars:", error);
    }
  }

  // Save processed avatars to localStorage
  saveProcessedAvatars() {
    try {
      const data = {
        avatars: Array.from(this.processedAvatars),
        stats: this.stats,
        lastSaved: new Date().toISOString(),
      };
      localStorage.setItem("avatarlog_processed", JSON.stringify(data));
    } catch (error) {
      this.logger.error("Error saving processed avatars:", error);
    }
  }

  // Get statistics
  getStats() {
    return {
      ...this.stats,
      processedAvatars: this.processedAvatars.size,
      pendingQueue: this.pendingQueue.size,
    };
  }

  // Clear all processed avatars (useful for debugging)
  clearProcessedAvatars() {
    this.processedAvatars.clear();
    this.pendingQueue.clear();
    this.stats = {
      totalProcessed: 0,
      totalSent: 0,
      totalUnique: 0,
      byProvider: {
        avtrdb: { sent: 0, unique: 0, errors: 0 },
        nsvr: { sent: 0, unique: 0, errors: 0 },
        paw: { sent: 0, unique: 0, errors: 0 },
        vrcdb: { sent: 0, unique: 0, errors: 0 },
        vrcwb: { sent: 0, unique: 0, errors: 0 },
      },
    };
    localStorage.removeItem("avatarlog_processed");
    this.logger.log("🗑️ Cleared all processed avatars!");
  }

  // Manual trigger for scanning stores
  manualScan() {
    this.scanAvatarStores();
  }
}

// Make plugin class available for PluginLoader to instantiate
window.customjs.__LAST_PLUGIN_CLASS__ = AvatarLogPlugin;
