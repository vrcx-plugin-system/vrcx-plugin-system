import { ModuleMetadata, ResourceTracking } from '../types';
import { Logger } from './logger';

export const moduleMetadata: ModuleMetadata = {
  id: "module",
  name: "Module System",
  description: "Base module system for CoreModules and CustomModules",
  authors: [
    {
      name: "Bluscream",
      description: "Core Maintainer",
    }
  ],
  tags: ["Core", "Module"],
};

/**
 * Base Module class - shared functionality for CoreModule and CustomModule
 */
export abstract class Module {
  metadata: ModuleMetadata;
  loaded: boolean = false;
  started: boolean = false;
  enabled: boolean = false;
  logger: Logger;
  resources: ResourceTracking;
  logColor: string;
  repository?: any;

  constructor(metadata: Partial<ModuleMetadata>) {
    const moduleId = metadata.id || this.constructor.name.toLowerCase();
    const authors = metadata.authors || [{ name: "Unknown" }];

    this.metadata = {
      id: moduleId,
      name: metadata.name || moduleId,
      description: metadata.description || "",
      authors: authors,
      build: metadata.build || "0",
      url: metadata.url || null,
      tags: metadata.tags || [],
    };

    this.logger = new Logger(this.metadata.id);
    
    this.resources = {
      timers: new Set(),
      observers: new Set(),
      listeners: new Map(),
      subscriptions: new Set(),
      hooks: new Set(),
    };

    this.logColor = '#888888';
  }

  /**
   * Called immediately after module is instantiated
   */
  async load(): Promise<void> {
    this.log("load() called - Override this method in your module");
    this.loaded = true;
  }

  /**
   * Called after all modules have finished loading
   */
  async start(): Promise<void> {
    this.log("start() called - Override this method in your module");
    this.started = true;
  }

  /**
   * Called when module is disabled or unloaded
   */
  async stop(): Promise<void> {
    this.log("stop() called - Override this method in your module");
    this.started = false;
    this.cleanupResources();
  }

  /**
   * Called after successful VRChat login
   */
  async onLogin(currentUser: any): Promise<void> {
    // Optional - override in subclass if needed
  }

  /**
   * Enable the module
   */
  async enable(): Promise<boolean> {
    if (this.enabled) {
      this.warn("Already enabled");
      return false;
    }
    this.enabled = true;
    this.log("✓ Module enabled");

    if (this.loaded && !this.started) {
      await this.start();
    }

    return true;
  }

  /**
   * Disable the module
   */
  async disable(): Promise<boolean> {
    if (!this.enabled) {
      this.warn("Already disabled");
      return false;
    }
    this.enabled = false;
    await this.stop();
    this.log("✓ Module disabled");
    return true;
  }

  /**
   * Toggle module enabled state
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
    const elementListeners = this.resources.listeners.get(element);
    if (elementListeners) {
      elementListeners.push({ event, handler, options });
    }
    return { element, event, handler };
  }

  registerSubscription(unsubscribe: () => void): () => void {
    this.resources.subscriptions.add(unsubscribe);
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

  /**
   * Get decoded display name (with emojis properly rendered)
   */
  getDisplayName(): string {
    const utils = window.customjs?.utils;
    return utils?.decodeUnicode ? utils.decodeUnicode(this.metadata.name) : this.metadata.name;
  }

  /**
   * Get decoded description (with emojis properly rendered)
   */
  getDisplayDescription(): string {
    const utils = window.customjs?.utils;
    return utils?.decodeUnicode ? utils.decodeUnicode(this.metadata.description) : this.metadata.description;
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
 * CoreModule - For built-in system modules (logger, config, utils, etc.)
 */
export class CoreModule extends Module {
  constructor(metadata: Partial<ModuleMetadata>) {
    super(metadata);
    
    // Register core module globally
    if (window.customjs?.coreModules) {
      window.customjs.coreModules.set(this.metadata.id, this);
    }
  }
}
