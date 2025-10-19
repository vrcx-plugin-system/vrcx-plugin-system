import { ModuleMetadata } from '../types';
import { Module } from './module';

export const customModuleMetadata: ModuleMetadata = {
  id: "custom-module",
  name: "Custom Module System",
  description: "User-installed custom module system with hooks and subscriptions",
  authors: [
    {
      name: "Bluscream",
      description: "Core Maintainer",
    }
  ],
  tags: ["Core", "Module"],
};

/**
 * Custom action button for Plugin Manager UI
 */
export class CustomActionButton {
  title: string;
  color: "primary" | "success" | "warning" | "danger" | "info";
  icon?: string;
  description?: string;
  callback: () => void | Promise<void>;

  constructor(config: {
    title: string;
    color?: "primary" | "success" | "warning" | "danger" | "info";
    icon?: string;
    description?: string;
    callback: () => void | Promise<void>;
  }) {
    this.title = config.title;
    this.color = config.color || "primary";
    this.icon = config.icon;
    this.description = config.description;
    this.callback = config.callback;
  }
}

/**
 * CustomModule class for user-installed modules (plugins)
 */
export class CustomModule extends Module {
  dependencies: string[] = [];
  actionButtons: CustomActionButton[] = [];
  settings?: any;
  categories?: any;
  private scriptElement?: HTMLScriptElement;
  static loadedUrls: Set<string> = new Set();
  static failedUrls: Set<string> = new Set();
  private static scriptExecutionLock: Promise<void> = Promise.resolve();

  constructor(metadata: Partial<ModuleMetadata> = {}) {
    const moduleUrl = metadata.url || window.customjs?.__currentPluginUrl || null;

    let moduleId = metadata.id;
    if (!moduleId && moduleUrl) {
      const urlParts = moduleUrl.split("/");
      const filename = urlParts[urlParts.length - 1];
      moduleId = filename.replace(/\.js$/, "");
    }

    if (!moduleId) {
      throw new Error(
        "CustomModule must be loaded via ModuleLoader to auto-derive ID, or provide 'id' in metadata"
      );
    }

    const authors = metadata.authors || [{ name: "Unknown" }];

    super({
      id: moduleId,
      name: metadata.name || moduleId,
      description: metadata.description || "",
      authors: authors,
      build: metadata.build || "0",
      url: moduleUrl,
      tags: metadata.tags || [],
    });

    this.dependencies = (metadata as any).dependencies || [];

    // Automatically register with global modules array
    if (!window.customjs.modules) {
      window.customjs.modules = [];
    }
    window.customjs.modules.push(this);

    // Initialize subscription tracking for this module
    if (!window.customjs.subscriptions) {
      window.customjs.subscriptions = new Map();
    }
    if (!window.customjs.subscriptions.has(this.metadata.id)) {
      window.customjs.subscriptions.set(this.metadata.id, new Set());
    }
  }

  /**
   * Called when custom module is disabled or unloaded
   */
  async stop(): Promise<void> {
    this.log("stop() called");
    this.started = false;
    this.cleanupResources();

    // Clean up global subscriptions
    this.unregisterSubscriptions();
  }

  private unregisterSubscriptions(): void {
    const subscriptions = window.customjs.subscriptions?.get(this.metadata.id);
    if (!subscriptions) return;

    let count = 0;
    subscriptions.forEach((unsubscribe) => {
      if (typeof unsubscribe === "function") {
        try {
          unsubscribe();
          count++;
        } catch (error) {
          this.error(`Error unsubscribing: ${(error as Error).message}`);
        }
      }
    });

    subscriptions.clear();
    if (count > 0) {
      this.log(`Unregistered ${count} global subscriptions`);
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
                this.error(`Error in LOCATION subscription: ${error}`);
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
                this.error(`Error in USER subscription: ${error}`);
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
                this.error(`Error in GAME subscription: ${error}`);
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
                this.error(`Error in GAMELOG subscription: ${error}`);
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
                this.error(`Error in FRIENDS subscription: ${error}`);
              }
            });
          }
          break;

        case "UI":
          if (window.$pinia?.ui?.$subscribe) {
            storeSubscription = window.$pinia.ui.$subscribe((mutation: any, state: any) => {
              try {
                callback({
                  menuActiveIndex: state?.menuActiveIndex || window.$pinia?.ui?.menuActiveIndex,
                });
              } catch (error) {
                this.error(`Error in UI subscription: ${error}`);
              }
            });
          }
          break;

        default:
          this.error(`Unknown event type: ${eventType}`);
          return null;
      }

      if (storeSubscription) {
        unsubscribe = () => {
          if (storeSubscription && typeof storeSubscription === "function") {
            storeSubscription();
          }
        };

        this.registerSubscription(unsubscribe);
        
        // Also register globally
        if (window.customjs?.subscriptions) {
          const moduleSubscriptions = window.customjs.subscriptions.get(this.metadata.id);
          if (moduleSubscriptions) {
            moduleSubscriptions.add(unsubscribe);
          }
        }
        
        return unsubscribe;
      } else {
        setTimeout(() => {
          const result = setupSubscription();
          if (result) {
            this.logger?.log?.(`Successfully subscribed to ${eventType} after retry`);
          }
        }, 500);
        return null;
      }
    };

    return setupSubscription();
  }

  // Hook registration
  registerPreHook(functionPath: string, callback: Function): void {
    window.customjs.hooks.pre[functionPath] = window.customjs.hooks.pre[functionPath] || [];
    window.customjs.hooks.pre[functionPath].push({ plugin: this, callback });
    this.resources.hooks!.add({ type: "pre", functionPath, callback });
    this.wrapFunctionWhenReady(functionPath);
  }

  registerPostHook(functionPath: string, callback: Function): void {
    window.customjs.hooks.post[functionPath] = window.customjs.hooks.post[functionPath] || [];
    window.customjs.hooks.post[functionPath].push({ plugin: this, callback });
    this.resources.hooks!.add({ type: "post", functionPath, callback });
    this.wrapFunctionWhenReady(functionPath);
  }

  registerVoidHook(functionPath: string, callback: Function): void {
    window.customjs.hooks.void[functionPath] = window.customjs.hooks.void[functionPath] || [];
    window.customjs.hooks.void[functionPath].push({ plugin: this, callback });
    this.resources.hooks!.add({ type: "void", functionPath, callback });
    this.wrapFunctionWhenReady(functionPath);
  }

  registerReplaceHook(functionPath: string, callback: Function): void {
    window.customjs.hooks.replace[functionPath] = window.customjs.hooks.replace[functionPath] || [];
    window.customjs.hooks.replace[functionPath].push({ plugin: this, callback });
    this.resources.hooks!.add({ type: "replace", functionPath, callback });
    this.wrapFunctionWhenReady(functionPath);
  }

  private wrapFunctionWhenReady(functionPath: string, retries: number = 0, maxRetries: number = 10): boolean {
    if (this.wrapFunction(functionPath)) {
      return true;
    }

    if (retries < maxRetries) {
      const delay = Math.min(500 * Math.pow(1.5, retries), 5000);
      setTimeout(() => {
        this.wrapFunctionWhenReady(functionPath, retries + 1, maxRetries);
      }, delay);
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
      const voidHooks = window.customjs.hooks.void[functionPath] || [];
      if (voidHooks.length > 0) {
        for (const { plugin, callback } of voidHooks) {
          try {
            callback.call(plugin, args);
          } catch (error) {
            console.error(`Error in void-hook for ${functionPath}:`, error);
          }
        }
        return;
      }

      const preHooks = window.customjs.hooks.pre[functionPath] || [];
      for (const { plugin, callback } of preHooks) {
        try {
          callback.call(plugin, args);
        } catch (error) {
          console.error(`Error in pre-hook for ${functionPath}:`, error);
        }
      }

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
              console.error(`Error in replace-hook for ${functionPath}:`, error);
              return nextFunction.apply(this, hookArgs);
            }
          };
        }

        result = chainedFunction(...args);
      } else {
        result = originalFunc.apply(this, args);
      }

      const postHooks = window.customjs.hooks.post[functionPath] || [];
      for (const { plugin, callback } of postHooks) {
        try {
          callback.call(plugin, result, args);
        } catch (error) {
          console.error(`Error in post-hook for ${functionPath}:`, error);
        }
      }

      return result;
    };

    return true;
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

  /**
   * Static method to fetch module metadata from URL without executing code
   */
  static async fetchMetadata(moduleUrl: string): Promise<any | null> {
    try {
      const response = await fetch(moduleUrl + "?v=" + Date.now());
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const sourceCode = await response.text();
      const metadata: any = {
        url: moduleUrl,
        size: sourceCode.length,
        lineCount: sourceCode.split('\n').length,
      };

      // Extract class name
      const classNameMatch = sourceCode.match(/class\s+(\w+)\s+extends\s+CustomModule/);
      if (classNameMatch) metadata.className = classNameMatch[1];

      // Extract constructor metadata
      const constructorMatch = sourceCode.match(/constructor\s*\(\s*\)\s*{[\s\S]*?super\s*\(\s*{([\s\S]*?)}\s*\)/);
      if (constructorMatch) {
        const superArgs = constructorMatch[1];
        
        const nameMatch = superArgs.match(/name:\s*["'](.+?)["']/);
        if (nameMatch) metadata.name = nameMatch[1];
        
        const descMatch = superArgs.match(/description:\s*["'](.+?)["']/s);
        if (descMatch) metadata.description = descMatch[1].replace(/\s+/g, ' ').trim();
        
        const authorsMatch = superArgs.match(/authors:\s*\[([\s\S]*?)\]/);
        if (authorsMatch) {
          metadata.authors = [];
          const authorsCode = authorsMatch[1];
          const authorMatches = authorsCode.matchAll(/\{\s*name:\s*["']([^"']+)["']/g);
          for (const match of authorMatches) {
            metadata.authors.push({ name: match[1] });
          }
        }
        
        const buildMatch = superArgs.match(/build:\s*["'](.+?)["']/);
        if (buildMatch) metadata.build = buildMatch[1];
        
        const tagsMatch = superArgs.match(/tags:\s*\[(.*?)\]/);
        if (tagsMatch) {
          metadata.tags = tagsMatch[1].split(',').map(t => t.trim().replace(/["']/g, ''));
        }
        
        const depsMatch = superArgs.match(/dependencies:\s*\[([\s\S]*?)\]/);
        if (depsMatch) {
          metadata.dependencies = depsMatch[1].split(',')
            .map(d => d.trim().replace(/["']/g, ''))
            .filter(d => d.length > 0);
        }
      }

      return metadata;
    } catch (error) {
      console.error(`%c[CJS|CustomModule] Failed to fetch metadata from ${moduleUrl}:`, 'color: #888888', error);
      return null;
    }
  }

  /**
   * Static method to load a module from URL
   */
  static async loadFromUrl(moduleUrl: string, retries: number = 0, maxRetries: number = 3): Promise<CustomModule | null> {
    try {
      console.log(`%c[CJS|CustomModule] Fetching module: ${moduleUrl}`, 'color: #888888');

      const response = await fetch(moduleUrl + "?v=" + Date.now());
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const moduleCode = await response.text();
      
      // Wait for any previous script execution to complete (prevents race conditions)
      await CustomModule.scriptExecutionLock;
      
      // Create a new lock for this execution
      let releaseLock!: () => void;
      CustomModule.scriptExecutionLock = new Promise<void>(resolve => {
        releaseLock = () => resolve();
      });
      
      try {
        const moduleCountBefore = window.customjs.modules?.length || 0;

      // Wrap in IIFE to isolate scope and inject common classes
      const wrappedCode = `(function() { 
        window.customjs = window.customjs || {};
        window.customjs.__currentPluginUrl = "${moduleUrl}";
        
        const { CustomModule, Logger, CustomActionButton } = window.customjs.classes;
        const { definePluginSettings, utils } = window.customjs;
        const SettingType = window.customjs.types.SettingType;
        
        ${moduleCode}
        
        if (typeof window.customjs.__LAST_PLUGIN_CLASS__ !== 'undefined') {
          try {
            const ModuleClass = window.customjs.__LAST_PLUGIN_CLASS__;
            const moduleInstance = new ModuleClass();
            console.log(\`%c[CJS|CustomModule] ✓ Instantiated module: \${moduleInstance.metadata.name}\`, \`color: #888888\`);
            delete window.customjs.__LAST_PLUGIN_CLASS__;
            delete window.customjs.__currentPluginUrl;
          } catch (e) {
            console.error('%c[CJS|CustomModule] Error instantiating module:', \`color: #888888\`, e);
            delete window.customjs.__currentPluginUrl;
          }
        }
      })();`;

      const script = document.createElement("script");
      script.type = "text/javascript";
      script.textContent = wrappedCode;
      script.dataset.moduleUrl = moduleUrl;

      await new Promise<void>((resolve, reject) => {
        const timeoutId = setTimeout(() => reject(new Error(`Module load timeout`)), 10000);
        script.onerror = () => {
          clearTimeout(timeoutId);
          reject(new Error(`Script error loading module`));
        };
        setTimeout(() => {
          clearTimeout(timeoutId);
          resolve();
        }, 100);
      });

      document.head.appendChild(script);

      // Get the newly created module
      const moduleCountAfter = window.customjs.modules?.length || 0;
      if (moduleCountAfter > moduleCountBefore) {
        const newModule = window.customjs.modules[moduleCountAfter - 1];
        (newModule as CustomModule).scriptElement = script;
        CustomModule.loadedUrls.add(moduleUrl);
        console.log(`%c[CJS|CustomModule] ✓ Loaded ${newModule.metadata.name}`, 'color: #888888');
        releaseLock!(); // Release lock for next module
        return newModule;
      }

      releaseLock!(); // Release lock even on failure
      throw new Error("Module did not register itself");
      } catch (execError) {
        releaseLock!(); // Release lock on execution error
        throw execError;
      }
    } catch (error) {
      if (retries < maxRetries) {
        console.warn(`%c[CJS|CustomModule] Retry ${retries + 1}/${maxRetries} for: ${moduleUrl}`, 'color: #888888');
        await new Promise((resolve) => setTimeout(resolve, 1000 * (retries + 1)));
        return await CustomModule.loadFromUrl(moduleUrl, retries + 1, maxRetries);
      } else {
        CustomModule.failedUrls.add(moduleUrl);
        console.error(`%c[CJS|CustomModule] Failed to load after ${maxRetries} attempts: ${moduleUrl}`, 'color: #888888', error);
        return null;
      }
    }
  }

  /**
   * Unload this module (remove from DOM)
   */
  async unload(): Promise<void> {
    await this.stop();

    // Remove script element from DOM
    if (this.scriptElement && this.scriptElement.parentNode) {
      this.scriptElement.parentNode.removeChild(this.scriptElement);
    }

    // Remove from modules array
    const index = window.customjs.modules.indexOf(this);
    if (index > -1) {
      window.customjs.modules.splice(index, 1);
    }

    // Remove from loaded URLs
    if (this.metadata.url) {
      CustomModule.loadedUrls.delete(this.metadata.url);
    }

    this.log("✓ Module unloaded");
  }

  /**
   * Reload this module
   */
  async reload(): Promise<CustomModule | null> {
    if (!this.metadata.url) {
      this.error("Cannot reload module without URL");
      return null;
    }

    const moduleUrl = this.metadata.url;
    await this.unload();
    await new Promise(resolve => setTimeout(resolve, 100));
    return await CustomModule.loadFromUrl(moduleUrl);
  }
}
