import { PluginMetadata, ResourceTracking, PluginConfig, PluginRepoMetadata } from '../types';
import { Logger } from './logger';
import { PluginRepoManager } from './repo';

/**
 * Base Plugin class for VRCX plugins
 */
export class Plugin {
  metadata: PluginMetadata;
  loaded: boolean = false;
  started: boolean = false;
  enabled: boolean = false;
  dependencies: string[] = [];
  logger: Logger;
  resources: ResourceTracking;
  logColor: string;

  constructor(metadata: Partial<PluginMetadata> = {}) {
    // Get URL from metadata or from global scope (set by PluginManager)
    const pluginUrl = metadata.url || window.customjs?.__currentPluginUrl || null;

    // Auto-derive ID from URL if not provided
    let pluginId = metadata.id;
    if (!pluginId && pluginUrl) {
      const urlParts = pluginUrl.split("/");
      const filename = urlParts[urlParts.length - 1];
      pluginId = filename.replace(/\.js$/, "");
    }

    if (!pluginId) {
      throw new Error(
        "Plugin must be loaded via PluginManager to auto-derive ID, or provide 'id' in metadata"
      );
    }

    this.metadata = {
      id: pluginId,
      name: metadata.name || pluginId,
      description: metadata.description || "",
      author: metadata.author || "Unknown",
      build: metadata.build || (metadata as any).version || "0",
      url: pluginUrl,
      tags: (metadata as any).tags || [],
    };

    this.dependencies = (metadata as any).dependencies || [];

    // Create personal logger instance for this plugin
    this.logger = new Logger(this.metadata.id);

    // Initialize resource tracking
    this.resources = {
      timers: new Set(),
      observers: new Set(),
      listeners: new Map(),
      subscriptions: new Set(),
      hooks: new Set(),
    };

    // Store log color for this plugin
    this.logColor = window.customjs?.logColors?.Plugin || '#888888';

    // Automatically register with plugin manager
    if (window.customjs?.pluginManager) {
      window.customjs.pluginManager.registerPlugin(this);
    } else {
      console.warn(
        `[${this.metadata.name}] PluginManager not available, plugin won't be tracked`
      );
    }
  }

  /**
   * Called immediately after plugin is instantiated
   */
  async load(): Promise<void> {
    this.log("load() called - Override this method in your plugin");
    this.loaded = true;
  }

  /**
   * Called after all plugins have finished loading
   */
  async start(): Promise<void> {
    this.log("start() called - Override this method in your plugin");
    this.started = true;
  }

  /**
   * Called after successful VRChat login
   */
  async onLogin(currentUser: any): Promise<void> {
    this.log(`onLogin(${currentUser?.displayName || "Unknown"}) called - Override this method`);
  }

  /**
   * Called when plugin is disabled or unloaded
   */
  async stop(): Promise<void> {
    this.log("stop() called - Override this method in your plugin");
    this.started = false;
    this.cleanupResources();

    // Clean up global subscriptions via PluginManager
    if (window.customjs?.pluginManager) {
      window.customjs.pluginManager.unregisterSubscriptions(this.metadata.id);
    }
  }

  /**
   * Enable the plugin
   */
  async enable(): Promise<boolean> {
    if (this.enabled) {
      this.warn("Already enabled");
      return false;
    }
    this.enabled = true;
    this.log("✓ Plugin enabled");

    if (this.loaded && !this.started) {
      await this.start();
    }

    return true;
  }

  /**
   * Disable the plugin
   */
  async disable(): Promise<boolean> {
    if (!this.enabled) {
      this.warn("Already disabled");
      return false;
    }
    this.enabled = false;
    await this.stop();
    this.log("✓ Plugin disabled");
    return true;
  }

  /**
   * Toggle plugin enabled state
   */
  async toggle(): Promise<boolean> {
    return this.enabled ? await this.disable() : await this.enable();
  }

  // Resource management methods
  registerTimer(timerId: number): number {
    this.resources.timers.add(timerId);
    return timerId;
  }

  registerObserver(observer: any): any {
    this.resources.observers.add(observer);
    return observer;
  }

  registerListener(element: EventTarget, event: string, handler: EventListener, options: AddEventListenerOptions = {}): {element: EventTarget; event: string; handler: EventListener} {
    element.addEventListener(event, handler, options);
    if (!this.resources.listeners.has(element)) {
      this.resources.listeners.set(element, []);
    }
    this.resources.listeners.get(element)!.push({ event, handler, options });
    return { element, event, handler };
  }

  registerSubscription(unsubscribe: () => void): () => void {
    this.resources.subscriptions.add(unsubscribe);

    // Track globally in PluginManager
    if (window.customjs?.pluginManager) {
      window.customjs.pluginManager.registerSubscription(this.metadata.id, unsubscribe);
    }

    return unsubscribe;
  }

  registerResource(unsubscribe: () => void): () => void {
    return this.registerSubscription(unsubscribe);
  }

  cleanupResources(): void {
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
          this.error(`Error unsubscribing: ${(error as Error).message}`);
        }
      }
    });
    this.resources.subscriptions.clear();

    if (cleanupCount > 0) {
      this.log(`✓ Cleaned up ${cleanupCount} resources`);
    }
  }

  // Event system
  emit(eventName: string, data: any): void {
    const fullEventName = `${this.metadata.id}:${eventName}`;
    if (window.customjs?.events?.[fullEventName]) {
      window.customjs.events[fullEventName].forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          this.error(`Error in event handler for ${fullEventName}: ${error}`);
        }
      });
    }
  }

  on(eventName: string, callback: Function): void {
    const fullEventName = eventName.includes(":")
      ? eventName
      : `${this.metadata.id}:${eventName}`;

    window.customjs = window.customjs || {} as any;
    window.customjs.events = window.customjs.events || {};
    window.customjs.events[fullEventName] = window.customjs.events[fullEventName] || [];
    window.customjs.events[fullEventName].push(callback);
  }

  subscribe(eventType: string, callback: Function): (() => void) | null {
    if (!window.customjs?.pluginManager) {
      this.error("Plugin manager not available for subscriptions");
      return null;
    }

    return window.customjs.pluginManager.subscribeToEvent(eventType, callback, this);
  }

  // Hook registration
  registerPreHook(functionPath: string, callback: Function): void {
    if (!window.customjs?.pluginManager) {
      this.error("Plugin manager not available for hooks");
      return;
    }
    window.customjs.pluginManager.registerPreHook(functionPath, callback, this);
    this.resources.hooks!.add({ type: "pre", functionPath, callback });
  }

  registerPostHook(functionPath: string, callback: Function): void {
    if (!window.customjs?.pluginManager) {
      this.error("Plugin manager not available for hooks");
      return;
    }
    window.customjs.pluginManager.registerPostHook(functionPath, callback, this);
    this.resources.hooks!.add({ type: "post", functionPath, callback });
  }

  registerVoidHook(functionPath: string, callback: Function): void {
    if (!window.customjs?.pluginManager) {
      this.error("Plugin manager not available for hooks");
      return;
    }
    window.customjs.pluginManager.registerVoidHook(functionPath, callback, this);
    this.resources.hooks!.add({ type: "void", functionPath, callback });
  }

  registerReplaceHook(functionPath: string, callback: Function): void {
    if (!window.customjs?.pluginManager) {
      this.error("Plugin manager not available for hooks");
      return;
    }
    window.customjs.pluginManager.registerReplaceHook(functionPath, callback, this);
    this.resources.hooks!.add({ type: "replace", functionPath, callback });
  }

  // Settings methods
  defineSettings(definition: any): any {
    if (!window.customjs?.definePluginSettings) {
      this.warn("definePluginSettings function not available");
      return null;
    }

    return window.customjs.definePluginSettings(definition, this);
  }

  defineSettingsCategories(categories: any): any {
    return categories;
  }

  get(key: string, defaultValue: any = null): any {
    if (!window.customjs?.configManager) {
      this.warn("ConfigManager not available");
      return defaultValue;
    }

    const fullKey = `${this.metadata.id}.${key}`;
    return window.customjs.configManager.get(fullKey, defaultValue);
  }

  set(key: string, value: any): boolean {
    if (!window.customjs?.configManager) {
      this.warn("ConfigManager not available");
      return false;
    }

    const fullKey = `${this.metadata.id}.${key}`;
    return window.customjs.configManager.set(fullKey, value);
  }

  deleteSetting(key: string): boolean {
    if (!window.customjs?.configManager) {
      this.warn("ConfigManager not available");
      return false;
    }

    const fullKey = `${this.metadata.id}.${key}`;
    return window.customjs.configManager.delete(fullKey);
  }

  hasSetting(key: string): boolean {
    if (!window.customjs?.configManager) {
      this.warn("ConfigManager not available");
      return false;
    }

    const fullKey = `${this.metadata.id}.${key}`;
    return window.customjs.configManager.has(fullKey);
  }

  getAllSettingKeys(): string[] {
    if (!window.customjs?.configManager) {
      this.warn("ConfigManager not available");
      return [];
    }

    return window.customjs.configManager.keys(this.metadata.id);
  }

  getAllSettings(): Record<string, any> {
    if (!window.customjs?.configManager) {
      this.warn("ConfigManager not available");
      return {};
    }

    return window.customjs.configManager.getPluginConfig(this.metadata.id);
  }

  clearAllSettings(): void {
    if (!window.customjs?.configManager) {
      this.warn("ConfigManager not available");
      return;
    }

    window.customjs.configManager.clear(this.metadata.id);
    this.log("✓ Cleared all settings");
  }

  // Logging methods
  log(message: string, ...args: any[]): void {
    this.logger.logInfo(message);
    if (args.length > 0) {
      console.log(`%c[${this.metadata.name}]`, `color: ${this.logColor}`, ...args);
    }
  }

  warn(message: string, ...args: any[]): void {
    this.logger.logWarn(message);
    if (args.length > 0) {
      console.warn(`%c[${this.metadata.name}]`, `color: ${this.logColor}`, ...args);
    }
  }

  error(message: string, ...args: any[]): void {
    this.logger.logError(message);
    if (args.length > 0) {
      console.error(`%c[${this.metadata.name}]`, `color: ${this.logColor}`, ...args);
    }
  }
}

/**
 * PluginLoader - Handles loading plugins from remote URLs
 */
export class PluginLoader {
  private pluginManager: PluginManager;
  private loadedUrls: Set<string>;
  private failedUrls: Set<string>;
  private retryAttempts: Map<string, number>;
  private maxRetries: number = 3;
  private logColor: string;

  constructor(pluginManager: PluginManager) {
    this.pluginManager = pluginManager;
    this.loadedUrls = new Set();
    this.failedUrls = new Set();
    this.retryAttempts = new Map();
    this.logColor = window.customjs?.logColors?.PluginLoader || '#2196f3';
  }

  async loadPluginCode(pluginUrl: string, timeout: number = 10000): Promise<boolean> {
    const attempts = this.retryAttempts.get(pluginUrl) || 0;

    try {
      const url = pluginUrl + "?v=" + Date.now();
      this.log(`Loading plugin: ${pluginUrl}`);

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const pluginCode = await response.text();
      const pluginCountBefore = window.customjs.plugins.length;

      // Wrap in IIFE to isolate scope and inject common classes
      const wrappedCode = `(function() { 
        window.customjs = window.customjs || {};
        window.customjs.__currentPluginUrl = "${pluginUrl}";
        
        // Destructure commonly used classes from window.customjs for plugin use
        const { Plugin, Logger, SettingType, definePluginSettings, utils } = window.customjs;
        
        ${pluginCode}
        
        // Auto-instantiate plugin if class was defined
        if (typeof window.customjs.__LAST_PLUGIN_CLASS__  !== 'undefined') {
          try {
            const PluginClass = window.customjs.__LAST_PLUGIN_CLASS__ ;
            const pluginInstance = new PluginClass();
            const logColor = window.customjs?.logColors?.PluginLoader;
            console.log(\`%c[CJS|PluginLoader] ✓ Instantiated plugin: \${pluginInstance.metadata.name}\`, \`color: \${logColor}\`);
            delete window.customjs.__LAST_PLUGIN_CLASS__ ;
            delete window.customjs.__currentPluginUrl;
          } catch (e) {
            const logColor = window.customjs?.logColors?.PluginLoader;
            console.error('%c[CJS|PluginLoader] Error instantiating plugin:', \`color: \${logColor}\`, e);
            delete window.customjs.__currentPluginUrl;
          }
        }
      })();`;

      // Inject code
      const script = document.createElement("script");
      script.type = "text/javascript";
      script.textContent = wrappedCode;
      script.dataset.pluginUrl = pluginUrl;

      const loadPromise = new Promise<void>((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error(`Plugin load timeout: ${pluginUrl}`));
        }, timeout);

        script.onerror = () => {
          clearTimeout(timeoutId);
          reject(new Error(`Script error loading plugin`));
        };

        setTimeout(() => {
          clearTimeout(timeoutId);
          const pluginCountAfter = window.customjs.plugins.length;
          if (pluginCountAfter > pluginCountBefore) {
            const newPlugin = window.customjs.plugins[pluginCountAfter - 1];
            this.log(`✓ Loaded ${newPlugin.metadata.name} v${newPlugin.metadata.version}`);
          }
          resolve();
        }, 100);
      });

      document.head.appendChild(script);
      await loadPromise;

      this.loadedUrls.add(pluginUrl);
      this.retryAttempts.delete(pluginUrl);
      return true;
    } catch (error) {
      this.retryAttempts.set(pluginUrl, attempts + 1);

      if (attempts + 1 >= this.maxRetries) {
        this.failedUrls.add(pluginUrl);
        this.error(`✗ Failed to load plugin after ${this.maxRetries} attempts: ${pluginUrl}`, error);
        return false;
      } else {
        this.warn(`⚠ Retry ${attempts + 1}/${this.maxRetries} for: ${pluginUrl}`);
        await new Promise((resolve) => setTimeout(resolve, 1000 * (attempts + 1)));
        return await this.loadPluginCode(pluginUrl, timeout);
      }
    }
  }

  /**
   * Extract metadata from plugin source code without executing it
   * @param pluginUrl - URL of the plugin to analyze
   * @param includeSource - Whether to include the full source code in the metadata (default: true)
   * @returns Promise with plugin metadata or null if extraction fails
   */
  async extractPluginMetadata(pluginUrl: string, includeSource: boolean = true): Promise<any | null> {
    try {
      this.log(`Extracting metadata from: ${pluginUrl}`);
      
      // Download the source code
      const url = pluginUrl + "?v=" + Date.now();
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const sourceCode = await response.text();
      const metadata: any = {
        url: pluginUrl,
        size: sourceCode.length,
        sizeFormatted: this.formatBytes(sourceCode.length),
        lineCount: sourceCode.split('\n').length,
      };

      // Optionally include full source code
      if (includeSource) {
        metadata.sourceCode = sourceCode;
      }

      // Extract plugin class name
      const classNameMatch = sourceCode.match(/class\s+(\w+)\s+extends\s+Plugin/);
      if (classNameMatch) {
        metadata.className = classNameMatch[1];
      }

      // Extract constructor metadata (name, description, author, version, build, tags, dependencies)
      const constructorMatch = sourceCode.match(/constructor\s*\(\s*\)\s*{[\s\S]*?super\s*\(\s*{([\s\S]*?)}\s*\)/);
      if (constructorMatch) {
        const superArgs = constructorMatch[1];
        
        // Extract name
        const nameMatch = superArgs.match(/name:\s*["'](.+?)["']/);
        if (nameMatch) metadata.name = nameMatch[1];
        
        // Extract description
        const descMatch = superArgs.match(/description:\s*["'](.+?)["']/s);
        if (descMatch) metadata.description = descMatch[1].replace(/\s+/g, ' ').trim();
        
        // Extract author
        const authorMatch = superArgs.match(/author:\s*["'](.+?)["']/);
        if (authorMatch) metadata.author = authorMatch[1];
        
        // Extract version
        const versionMatch = superArgs.match(/version:\s*["'](.+?)["']/);
        if (versionMatch) metadata.version = versionMatch[1];
        
        // Extract build
        const buildMatch = superArgs.match(/build:\s*["'](.+?)["']/);
        if (buildMatch) metadata.build = buildMatch[1];
        
        // Extract tags
        const tagsMatch = superArgs.match(/tags:\s*\[(.*?)\]/);
        if (tagsMatch) {
          metadata.tags = tagsMatch[1].split(',').map(t => t.trim().replace(/["']/g, ''));
        }
        
        // Extract dependencies
        const depsMatch = superArgs.match(/dependencies:\s*\[([\s\S]*?)\]/);
        if (depsMatch) {
          const depsStr = depsMatch[1];
          metadata.dependencies = depsStr.split(',')
            .map(d => d.trim().replace(/["']/g, ''))
            .filter(d => d.length > 0);
        }
      }

      // Count settings
      const settingsMatch = sourceCode.match(/this\.defineSettings\s*\(\s*{([\s\S]*?)}\s*\)/);
      if (settingsMatch) {
        const settingsStr = settingsMatch[1];
        // Count setting keys (approximate)
        const settingKeys = settingsStr.match(/\w+:\s*{/g);
        metadata.settingsCount = settingKeys ? settingKeys.length : 0;
      } else {
        metadata.settingsCount = 0;
      }

      // Count setting categories
      const categoriesMatch = sourceCode.match(/this\.defineSettingsCategories\s*\(\s*{([\s\S]*?)}\s*\)/);
      if (categoriesMatch) {
        const categoriesStr = categoriesMatch[1];
        const categoryKeys = categoriesStr.match(/\w+:\s*{/g);
        metadata.categoriesCount = categoryKeys ? categoryKeys.length : 0;
      } else {
        metadata.categoriesCount = 0;
      }

      // Count lifecycle methods
      metadata.lifecycle = {
        hasLoad: /async\s+load\s*\(/.test(sourceCode),
        hasStart: /async\s+start\s*\(/.test(sourceCode),
        hasStop: /async\s+stop\s*\(/.test(sourceCode),
        hasOnLogin: /async\s+onLogin\s*\(/.test(sourceCode),
      };

      // Count observer registrations
      const observerCalls = sourceCode.match(/this\.registerObserver\s*\(/g);
      metadata.observerCount = observerCalls ? observerCalls.length : 0;

      // Count listener registrations
      const listenerCalls = sourceCode.match(/this\.registerListener\s*\(/g);
      metadata.listenerCount = listenerCalls ? listenerCalls.length : 0;

      // Count subscription registrations
      const subscribeCalls = sourceCode.match(/this\.subscribe\s*\(/g);
      metadata.subscriptionCount = subscribeCalls ? subscribeCalls.length : 0;

      // Count hook registrations
      const hookCalls = sourceCode.match(/this\.registerHook\s*\(/g);
      metadata.hookCount = hookCalls ? hookCalls.length : 0;

      // Count timer registrations
      const timerCalls = sourceCode.match(/this\.registerTimer\s*\(/g);
      metadata.timerCount = timerCalls ? timerCalls.length : 0;

      // Count function definitions (methods)
      const functionDefs = sourceCode.match(/^\s*(async\s+)?\w+\s*\([^)]*\)\s*{/gm);
      metadata.functionCount = functionDefs ? functionDefs.length : 0;

      // Count event handlers (onClick, onShow, onHide, etc.)
      const eventHandlers = sourceCode.match(/(on\w+):\s*(async\s+)?\([^)]*\)\s*=>/g);
      metadata.eventHandlerCount = eventHandlers ? eventHandlers.length : 0;

      // Detect external API usage
      metadata.externalApis = {
        usesAppApi: /window\.AppApi/g.test(sourceCode),
        usesPinia: /window\.\$pinia/g.test(sourceCode),
        usesVueRouter: /window\.\$router/g.test(sourceCode),
        usesVRCXAPI: /API\.\w+/g.test(sourceCode),
        usesWebAPI: /fetch\s*\(/g.test(sourceCode),
      };

      // Detect resource usage patterns
      metadata.resourceUsage = {
        createsDomElements: /document\.createElement/g.test(sourceCode),
        modifiesDom: /\.appendChild|\.insertBefore|\.removeChild/g.test(sourceCode),
        usesLocalStorage: /localStorage\./g.test(sourceCode),
        usesSessionStorage: /sessionStorage\./g.test(sourceCode),
        usesWebSocket: /WebSocket/g.test(sourceCode),
      };

      this.log(`✓ Extracted metadata from ${metadata.name || 'unknown plugin'}`);
      return metadata;

    } catch (error) {
      this.error(`Failed to extract metadata from ${pluginUrl}:`, error);
      return null;
    }
  }

  /**
   * Format bytes to human readable size
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  log(message: string, ...args: any[]): void {
    console.log(`%c[CJS|PluginLoader] ${message}`, `color: ${this.logColor}`, ...args);
  }

  warn(message: string, ...args: any[]): void {
    console.warn(`%c[CJS|PluginLoader] ${message}`, `color: ${this.logColor}`, ...args);
  }

  error(message: string, ...args: any[]): void {
    console.error(`%c[CJS|PluginLoader] ${message}`, `color: ${this.logColor}`, ...args);
  }
}

/**
 * PluginManager - Manages plugin lifecycle and hooks
 */
export class PluginManager {
  private logColor: string;
  private loginCallbacks: Array<Function> = [];
  private isLoggedIn: boolean = false;
  private hasTriggeredLogin: boolean = false;
  loadedUrls: Set<string>;
  failedUrls: Set<string>;
  loader: PluginLoader | null = null;

  constructor() {
    this.logColor = window.customjs?.logColors?.PluginManager || '#4caf50';
    this.loadedUrls = new Set();
    this.failedUrls = new Set();

    // Initialize global customjs structures if not exists
    if (!window.customjs.plugins) {
      window.customjs.plugins = [];
    }
    if (!window.customjs.subscriptions) {
      window.customjs.subscriptions = new Map();
    }
    if (!window.customjs.hooks) {
      window.customjs.hooks = {
        pre: {},
        post: {},
        void: {},
        replace: {},
      };
    }
    if (!window.customjs.functions) {
      window.customjs.functions = {};
    }
    if (!window.customjs.events) {
      window.customjs.events = {};
    }

    // Register in global namespace
    window.customjs.pluginManager = this;
  }

  registerPlugin(plugin: Plugin): boolean {
    if (!plugin || !plugin.metadata) {
      console.error(`%c[CJS|PluginManager] Invalid plugin registration`, `color: ${this.logColor}`);
      return false;
    }

    // Check if already registered
    const existing = window.customjs.plugins.find((p: Plugin) => p.metadata.id === plugin.metadata.id);
    if (existing) {
      console.warn(
        `%c[CJS|PluginManager] Plugin already registered: ${plugin.metadata.id}`,
        `color: ${this.logColor}`
      );
      return false;
    }

    window.customjs.plugins.push(plugin);

    // Initialize subscription tracking for this plugin
    if (!window.customjs.subscriptions.has(plugin.metadata.id)) {
      window.customjs.subscriptions.set(plugin.metadata.id, new Set());
    }

    console.log(
      `%c[CJS|PluginManager] Registered plugin: ${plugin.metadata.name} (build: ${plugin.metadata.build})`,
      `color: ${this.logColor}`
    );
    return true;
  }

  registerSubscription(pluginId: string, unsubscribe: () => void): () => void {
    if (!window.customjs.subscriptions.has(pluginId)) {
      window.customjs.subscriptions.set(pluginId, new Set());
    }

    window.customjs.subscriptions.get(pluginId)!.add(unsubscribe);
    return unsubscribe;
  }

  unregisterSubscriptions(pluginId: string): void {
    const subscriptions = window.customjs.subscriptions.get(pluginId);
    if (!subscriptions) return;

    let count = 0;
    subscriptions.forEach((unsubscribe) => {
      if (typeof unsubscribe === "function") {
        try {
          unsubscribe();
          count++;
        } catch (error) {
          console.error(
            `%c[CJS|PluginManager] Error unsubscribing for ${pluginId}:`,
            `color: ${this.logColor}`,
            error
          );
        }
      }
    });

    subscriptions.clear();
    console.log(
      `%c[CJS|PluginManager] Unregistered ${count} subscriptions for ${pluginId}`,
      `color: ${this.logColor}`
    );
  }

  subscribeToEvent(eventType: string, callback: Function, plugin: Plugin): (() => void) | null {
    const setupSubscription = (): (() => void) | null => {
      let storeSubscription: any = null;
      let unsubscribe: (() => void) | null = null;

      switch (eventType.toUpperCase()) {
        case "LOCATION":
          if (window.$pinia?.location?.$subscribe) {
            storeSubscription = window.$pinia.location.$subscribe((mutation: any, state: any) => {
              try {
                callback({
                  location: state.location,
                  lastLocation: state.lastLocation,
                  lastLocationDestination: state.lastLocationDestination,
                });
              } catch (error) {
                plugin.error(`Error in LOCATION subscription: ${error}`);
              }
            });
          }
          break;

        case "USER":
          if (window.$pinia?.user?.$subscribe) {
            storeSubscription = window.$pinia.user.$subscribe((mutation: any, state: any) => {
              try {
                callback({
                  currentUser: state.currentUser,
                  isLogin: state.isLogin,
                });
              } catch (error) {
                plugin.error(`Error in USER subscription: ${error}`);
              }
            });
          }
          break;

        case "GAME":
          if (window.$pinia?.game?.$subscribe) {
            storeSubscription = window.$pinia.game.$subscribe((mutation: any, state: any) => {
              try {
                callback({
                  isGameRunning: state.isGameRunning,
                  isGameNoVR: state.isGameNoVR,
                });
              } catch (error) {
                plugin.error(`Error in GAME subscription: ${error}`);
              }
            });
          }
          break;

        case "GAMELOG":
          if (window.$pinia?.gameLog?.$subscribe) {
            storeSubscription = window.$pinia.gameLog.$subscribe((mutation: any, state: any) => {
              try {
                callback({
                  gameLogSessionTable: state.gameLogSessionTable,
                  gameLogTable: state.gameLogTable,
                });
              } catch (error) {
                plugin.error(`Error in GAMELOG subscription: ${error}`);
              }
            });
          }
          break;

        case "FRIENDS":
          if (window.$pinia?.friends?.$subscribe) {
            storeSubscription = window.$pinia.friends.$subscribe((mutation: any, state: any) => {
              try {
                callback({
                  friends: state.friends,
                  offlineFriends: state.offlineFriends,
                });
              } catch (error) {
                plugin.error(`Error in FRIENDS subscription: ${error}`);
              }
            });
          }
          break;

        case "UI":
          if (window.$pinia?.ui?.$subscribe) {
            storeSubscription = window.$pinia.ui.$subscribe((mutation: any, state: any) => {
              try {
                // Pass the menuActiveIndex, with fallback to direct Pinia access
                // (state.menuActiveIndex is undefined due to Pinia Proxy issue)
                callback({
                  menuActiveIndex: state?.menuActiveIndex || window.$pinia?.ui?.menuActiveIndex,
                });
              } catch (error) {
                plugin.error(`Error in UI subscription: ${error}`);
              }
            });
          }
          break;

        default:
          plugin.error(`Unknown event type: ${eventType}`);
          return null;
      }

      if (storeSubscription) {
        unsubscribe = () => {
          if (storeSubscription && typeof storeSubscription === "function") {
            storeSubscription();
          }
        };

        plugin.registerSubscription(unsubscribe);
        return unsubscribe;
      } else {
        // Store not available yet, retry
        setTimeout(() => {
          const result = setupSubscription();
          if (result) {
            plugin.logger?.log?.(`Successfully subscribed to ${eventType} after retry`);
          }
        }, 500);
        return null;
      }
    };

    return setupSubscription();
  }

  // Hook registration methods
  registerPreHook(functionPath: string, callback: Function, plugin: Plugin): void {
    window.customjs.hooks.pre[functionPath] = window.customjs.hooks.pre[functionPath] || [];
    window.customjs.hooks.pre[functionPath].push({ plugin, callback });
    this.wrapFunctionWhenReady(functionPath);
    console.log(
      `%c[CJS|PluginManager] Registered pre-hook for ${functionPath} from ${plugin.metadata.name}`,
      `color: ${this.logColor}`
    );
  }

  registerPostHook(functionPath: string, callback: Function, plugin: Plugin): void {
    window.customjs.hooks.post[functionPath] = window.customjs.hooks.post[functionPath] || [];
    window.customjs.hooks.post[functionPath].push({ plugin, callback });
    this.wrapFunctionWhenReady(functionPath);
    console.log(
      `%c[CJS|PluginManager] Registered post-hook for ${functionPath} from ${plugin.metadata.name}`,
      `color: ${this.logColor}`
    );
  }

  registerVoidHook(functionPath: string, callback: Function, plugin: Plugin): void {
    window.customjs.hooks.void[functionPath] = window.customjs.hooks.void[functionPath] || [];
    window.customjs.hooks.void[functionPath].push({ plugin, callback });
    this.wrapFunctionWhenReady(functionPath);
    console.log(
      `%c[CJS|PluginManager] Registered void-hook for ${functionPath} from ${plugin.metadata.name}`,
      `color: ${this.logColor}`
    );
  }

  registerReplaceHook(functionPath: string, callback: Function, plugin: Plugin): void {
    window.customjs.hooks.replace[functionPath] = window.customjs.hooks.replace[functionPath] || [];
    window.customjs.hooks.replace[functionPath].push({ plugin, callback });
    this.wrapFunctionWhenReady(functionPath);
    console.log(
      `%c[CJS|PluginManager] Registered replace-hook for ${functionPath} from ${plugin.metadata.name}`,
      `color: ${this.logColor}`
    );
  }

  private wrapFunctionWhenReady(functionPath: string, retries: number = 0, maxRetries: number = 10): boolean {
    if (this.wrapFunction(functionPath)) {
      return true;
    }

    if (retries < maxRetries) {
      const delay = Math.min(500 * Math.pow(1.5, retries), 5000);
      setTimeout(() => {
        console.log(
          `%c[CJS|PluginManager] Retrying to wrap ${functionPath} (attempt ${retries + 1}/${maxRetries})...`,
          `color: ${this.logColor}`
        );
        this.wrapFunctionWhenReady(functionPath, retries + 1, maxRetries);
      }, delay);
    } else {
      console.warn(
        `%c[CJS|PluginManager] Failed to wrap ${functionPath} after ${maxRetries} attempts - function may not exist`,
        `color: ${this.logColor}`
      );
    }

    return false;
  }

  private wrapFunction(functionPath: string): boolean {
    if (window.customjs.functions[functionPath]) {
      return true;
    }

    const parts = functionPath.split(".");
    let obj: any = window;

    for (let i = 0; i < parts.length - 1; i++) {
      obj = obj[parts[i]];
      if (!obj) {
        return false;
      }
    }

    const funcName = parts[parts.length - 1];
    const originalFunc = obj[funcName];

    if (typeof originalFunc !== "function") {
      return false;
    }

    window.customjs.functions[functionPath] = originalFunc;

    const self = this;
    obj[funcName] = function (...args: any[]) {
      // Check for void hooks first
      const voidHooks = window.customjs.hooks.void[functionPath] || [];
      if (voidHooks.length > 0) {
        for (const { plugin, callback } of voidHooks) {
          try {
            callback.call(plugin, args);
          } catch (error) {
            console.error(
              `%c[CJS|PluginManager] Error in void-hook for ${functionPath}:`,
              `color: ${self.logColor}`,
              error
            );
          }
        }
        return;
      }

      // Call pre-hooks
      const preHooks = window.customjs.hooks.pre[functionPath] || [];
      for (const { plugin, callback } of preHooks) {
        try {
          callback.call(plugin, args);
        } catch (error) {
          console.error(
            `%c[CJS|PluginManager] Error in pre-hook for ${functionPath}:`,
            `color: ${self.logColor}`,
            error
          );
        }
      }

      // Check for replace hooks
      const replaceHooks = window.customjs.hooks.replace[functionPath] || [];
      let result: any;

      if (replaceHooks.length > 0) {
        const thisContext = this;
        let chainedFunction = originalFunc.bind(thisContext);

        for (let i = replaceHooks.length - 1; i >= 0; i--) {
          const { plugin, callback } = replaceHooks[i];
          const nextFunction = chainedFunction;

          chainedFunction = function (this: any, ...hookArgs: any[]) {
            try {
              return callback.call(plugin, nextFunction, ...hookArgs);
            } catch (error) {
              console.error(
                `%c[CJS|PluginManager] Error in replace-hook for ${functionPath}:`,
                `color: ${self.logColor}`,
                error
              );
              return nextFunction.apply(this, hookArgs);
            }
          };
        }

        result = chainedFunction(...args);
      } else {
        result = originalFunc.apply(this, args);
      }

      // Call post-hooks
      const postHooks = window.customjs.hooks.post[functionPath] || [];
      for (const { plugin, callback } of postHooks) {
        try {
          callback.call(plugin, result, args);
        } catch (error) {
          console.error(
            `%c[CJS|PluginManager] Error in post-hook for ${functionPath}:`,
            `color: ${self.logColor}`,
            error
          );
        }
      }

      return result;
    };

    console.log(`%c[CJS|PluginManager] ✓ Wrapped function: ${functionPath}`, `color: ${this.logColor}`);
    return true;
  }

  // Login handling
  onLogin(callback: Function): void {
    if (this.isLoggedIn && this.hasTriggeredLogin) {
      const currentUser = window.$pinia?.user?.currentUser;
      try {
        callback(currentUser);
      } catch (error) {
        console.error("%c[CJS|PluginManager] Error in login callback:", `color: ${this.logColor}`, error);
      }
    } else {
      this.loginCallbacks.push(callback);
    }
  }

  async triggerLogin(currentUser: any): Promise<void> {
    if (this.hasTriggeredLogin) return;

    this.hasTriggeredLogin = true;
    this.isLoggedIn = true;

    const user = currentUser || window.$pinia?.user?.currentUser;
    console.log(`[CJS] ✓ User logged in: ${user?.displayName || "Unknown"}`);

    // Trigger plugin onLogin methods
    for (const plugin of window.customjs.plugins) {
      try {
        if (plugin.enabled && typeof plugin.onLogin === "function") {
          await plugin.onLogin(user);
        }
      } catch (error) {
        console.error(
          `%c[CJS|PluginManager] Error in ${plugin.metadata.name}.onLogin:`,
          `color: ${this.logColor}`,
          error
        );
      }
    }

    // Trigger registered callbacks
    for (const callback of this.loginCallbacks) {
      try {
        callback(user);
      } catch (error) {
        console.error("%c[CJS|PluginManager] Error in login callback:", `color: ${this.logColor}`, error);
      }
    }
  }

  startLoginMonitoring(): void {
    const setupWatch = () => {
      if (window.$pinia?.user?.$subscribe) {
        window.$pinia.user.$subscribe(() => {
          const currentUser = (window.$pinia!.user as any).currentUser;
          if (currentUser && currentUser.id && !this.hasTriggeredLogin) {
            this.triggerLogin(currentUser);
          }
        });
      } else {
        setTimeout(setupWatch, 500);
      }
    };

    setTimeout(setupWatch, 100);
  }

  // Plugin loading
  async startAllPlugins(): Promise<void> {
    console.log(
      `%c[CJS|PluginManager] Calling start() on ${window.customjs.plugins.length} plugins...`,
      `color: ${this.logColor}`
    );

    for (const plugin of window.customjs.plugins) {
      try {
        // Only enable plugins that are supposed to be enabled (from config)
        // Don't forcibly enable all plugins
        if (plugin.enabled && !plugin.started) {
          await plugin.start();
          console.log(
            `%c[CJS|PluginManager] ✓ Started ${plugin.metadata.name} (build: ${plugin.metadata.build})`,
            `color: ${this.logColor}`
          );
        }
      } catch (error) {
        console.error(
          `%c[CJS|PluginManager] ✗ Error starting ${plugin.metadata.name}:`,
          `color: ${this.logColor}`,
          error
        );
      }
    }

    console.log(`%c[CJS|PluginManager] ✓ All plugins started`, `color: ${this.logColor}`);
  }

  async stopAllPlugins(): Promise<void> {
    for (const plugin of window.customjs.plugins) {
      try {
        await plugin.stop();
      } catch (error) {
        console.error(
          `%c[CJS|PluginManager] Error stopping ${plugin.metadata.name}:`,
          `color: ${this.logColor}`,
          error
        );
      }
    }
  }

  getPluginConfig(): PluginConfig {
    const config: PluginConfig = {};

    // Get default plugins from repository manager
    if (window.customjs?.repoManager) {
      const allPlugins = window.customjs.repoManager.getAllPlugins();
      allPlugins.forEach((plugin: PluginRepoMetadata) => {
        config[plugin.url] = plugin.enabled ?? true;
      });
    }

    // Load from ConfigManager if available (overrides repo defaults)
    if (window.customjs?.configManager) {
      const loadedConfig = window.customjs.configManager.getPluginConfig();
      if (loadedConfig && typeof loadedConfig === "object") {
        Object.assign(config, loadedConfig);
      }
    }

    return config;
  }

  savePluginConfig(config: PluginConfig): void {
    if (window.customjs?.configManager) {
      window.customjs.configManager.setPluginConfig(config);
    }
  }

  setupFallbackLogger(): void {
    class FallbackLogger {
      context: string;

      constructor(context: string = "CJS") {
        this.context = context;
      }

      log(msg: string, level: string = "info"): void {
        const formattedMsg = `[CJS|${this.context}] ${msg}`;
        const consoleMethod = (console as any)[level] || console.log;
        consoleMethod(formattedMsg);
      }

      logInfo(msg: string): void { this.log(msg, "info"); }
      info(msg: string): void { this.logInfo(msg); }
      logWarn(msg: string): void { this.log(msg, "warn"); }
      warn(msg: string): void { this.logWarn(msg); }
      logError(msg: string): void { this.log(msg, "error"); }
      error(msg: string): void { this.logError(msg); }
      logDebug(msg: string): void { this.log(msg, "log"); }
      debug(msg: string): void { this.logDebug(msg); }
      showInfo(msg: string): void { console.log(`[CJS|${this.context}] ${msg}`); }
      showSuccess(msg: string): void { console.log(`[CJS|${this.context}] ✓ ${msg}`); }
      showWarn(msg: string): void { console.warn(`[CJS|${this.context}] ${msg}`); }
      showError(msg: string): void { console.error(`[CJS|${this.context}] ${msg}`); }
      async notifyDesktop(msg: string): Promise<void> { console.log(`[CJS|${this.context}] [Desktop] ${msg}`); }
      async notifyXSOverlay(msg: string): Promise<void> { console.log(`[CJS|${this.context}] [XSOverlay] ${msg}`); }
      async notifyOVRToolkit(msg: string): Promise<void> { console.log(`[CJS|${this.context}] [OVRToolkit] ${msg}`); }
      async notifyVR(msg: string): Promise<void> { console.log(`[CJS|${this.context}] [VR] ${msg}`); }
      logAndShow(msg: string): void { this.log(msg, "info"); }
      logAndNotifyAll(msg: string): void { this.log(msg, "info"); }
    }

    (window.customjs as any).Logger = FallbackLogger;
    console.log("%c[CJS|PluginManager] ✓ Fallback Logger class registered", `color: ${this.logColor}`);
  }

  async loadAllPlugins(): Promise<void> {
    // Ensure Logger exists (provide fallback if loading failed)
    if (!window.customjs.Logger) {
      console.warn(
        "%c[CJS|PluginManager] Logger failed to load, using fallback console logger",
        `color: ${this.logColor}`
      );
      this.setupFallbackLogger();
    }

    // Phase 0: Initialize PluginRepoManager and load repositories
    console.log(
      `%c[CJS|PluginManager] Initializing repository manager...`,
      `color: ${this.logColor}`
    );
    const repoManager = new PluginRepoManager();
    await repoManager.loadRepositories();
    
    console.log(
      `%c[CJS|PluginManager] Loaded ${repoManager.getAllRepositories().length} repositories with ${repoManager.getAllPlugins().length} plugins`,
      `color: ${this.logColor}`
    );

    // Phase 1: Get plugin list from config (merge with defaults from repos)
    const pluginConfig = this.getPluginConfig();
    const enabledPlugins = Object.entries(pluginConfig)
      .filter(([url, enabled]) => enabled)
      .map(([url]) => url);

    console.log(
      `%c[CJS|PluginManager] Loading ${enabledPlugins.length} plugins from config...`,
      `color: ${this.logColor}`
    );

    // Phase 2: Load enabled plugins using PluginLoader
    this.loader = new PluginLoader(this);

    for (const pluginUrl of enabledPlugins) {
      const success = await this.loader.loadPluginCode(pluginUrl);
      if (success) {
        this.loadedUrls.add(pluginUrl);
      } else {
        this.failedUrls.add(pluginUrl);
      }
    }

    console.log(
      `%c[CJS|PluginManager] Plugin code loading complete. Loaded: ${this.loadedUrls.size}, Failed: ${this.failedUrls.size}`,
      `color: ${this.logColor}`
    );

    // Phase 3: Set enabled state from config and call load() on all plugins
    console.log(
      `%c[CJS|PluginManager] Calling load() on ${window.customjs.plugins.length} plugins...`,
      `color: ${this.logColor}`
    );
    for (const plugin of window.customjs.plugins) {
      try {
        // Set enabled state from config
        if (plugin.metadata.url && pluginConfig[plugin.metadata.url] !== undefined) {
          plugin.enabled = pluginConfig[plugin.metadata.url];
        }
        
        await plugin.load();
      } catch (error) {
        console.error(
          `%c[CJS|PluginManager] ✗ Error loading ${plugin.metadata.name}:`,
          `color: ${this.logColor}`,
          error
        );
      }
    }

    // Phase 4: Call start() on all plugins
    await this.startAllPlugins();

    // Phase 5: Start login monitoring
    this.startLoginMonitoring();

    // Phase 6: Save plugin config
    this.savePluginConfig(pluginConfig);

    console.log(
      `%c[CJS|PluginManager] ✓ Plugin system ready! Loaded ${enabledPlugins.length} plugins`,
      `color: ${this.logColor}`
    );
  }

  getPlugin(pluginId: string): Plugin | undefined {
    return window.customjs.plugins.find((p: Plugin) => p.metadata.id === pluginId);
  }

  async waitForPlugin(pluginId: string, timeout: number = 10000): Promise<Plugin> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const plugin = this.getPlugin(pluginId);
      if (plugin && plugin.loaded) {
        return plugin;
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    throw new Error(`Timeout waiting for plugin: ${pluginId}`);
  }

  getAllPlugins(): Plugin[] {
    return window.customjs.plugins;
  }

  async addPlugin(pluginUrl: string): Promise<{success: boolean; message?: string}> {
    try {
      // Check if already loaded
      if (this.loadedUrls.has(pluginUrl)) {
        return { success: false, message: "Plugin already loaded" };
      }

      // Use PluginLoader to load the plugin
      const pluginLoader = new PluginLoader(this);
      const success = await pluginLoader.loadPluginCode(pluginUrl);

      if (success) {
        this.loadedUrls.add(pluginUrl);
        
        // Get the newly added plugin and start it
        const newPlugin = window.customjs.plugins[window.customjs.plugins.length - 1];
        if (newPlugin) {
          await newPlugin.load();
          await newPlugin.start();
          
          // Save to config
          const config = this.getPluginConfig();
          config[pluginUrl] = true;
          this.savePluginConfig(config);
        }

        return { success: true };
      } else {
        this.failedUrls.add(pluginUrl);
        return { success: false, message: "Failed to load plugin code" };
      }
    } catch (error) {
      return { success: false, message: (error as Error).message };
    }
  }

  async removePlugin(pluginUrl: string): Promise<{success: boolean; message?: string}> {
    try {
      // Find plugin by URL
      const plugin = window.customjs.plugins.find((p: Plugin) => p.metadata.url === pluginUrl);
      
      if (!plugin) {
        return { success: false, message: "Plugin not found" };
      }

      // Stop the plugin
      await plugin.stop();

      // Remove from plugins array
      const index = window.customjs.plugins.indexOf(plugin);
      if (index > -1) {
        window.customjs.plugins.splice(index, 1);
      }

      // Remove from loaded URLs
      this.loadedUrls.delete(pluginUrl);

      // Update config
      const config = this.getPluginConfig();
      delete config[pluginUrl];
      this.savePluginConfig(config);

      return { success: true };
    } catch (error) {
      return { success: false, message: (error as Error).message };
    }
  }

  async reloadPlugin(pluginUrl: string): Promise<{success: boolean; message?: string}> {
    try {
      // Remove the plugin first
      const removeResult = await this.removePlugin(pluginUrl);
      if (!removeResult.success) {
        return removeResult;
      }

      // Wait a bit for cleanup
      await new Promise(resolve => setTimeout(resolve, 100));

      // Add it back
      return await this.addPlugin(pluginUrl);
    } catch (error) {
      return { success: false, message: (error as Error).message };
    }
  }
}
