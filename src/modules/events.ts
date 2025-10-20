/**
 * Event System - Modern event registration and management
 * Provides automatic IPC broadcasting, console logging, and event discovery
 */

export interface EventPayloadSchema {
  [key: string]: string; // key: description
}

export interface EventMetadata {
  eventName: string;
  registeredBy: Set<string>; // Plugin IDs that registered this event
  description: string;
  payload: EventPayloadSchema;
  broadcastIPC: boolean;
  logToConsole: boolean;
  emitCount: number;
  lastEmitted: number | null;
  listeners: Set<{plugin: any; callback: Function}>;
}

export interface EventRegistrationOptions {
  description: string;
  payload?: EventPayloadSchema;
  broadcastIPC?: boolean;
  logToConsole?: boolean;
}

export const eventSystemMetadata = {
  id: "event-system",
  name: "Event System",
  description: "Modern event registration and management system",
  authors: [
    {
      name: "Bluscream",
      description: "Core Maintainer",
    }
  ],
  tags: ["Core", "Events"],
};

/**
 * Global Event Registry
 * Manages all registered events across all plugins
 */
export class EventRegistry {
  private events: Map<string, EventMetadata> = new Map();
  private wildcardListeners: Map<string, Set<{plugin: any; callback: Function}>> = new Map();

  /**
   * Register a new event
   * @param plugin - Plugin instance
   * @param eventName - Event name (global, no plugin prefix)
   * @param options - Event metadata and options
   */
  register(plugin: any, eventName: string, options: EventRegistrationOptions): void {
    let metadata = this.events.get(eventName);
    
    if (metadata) {
      // Event already exists, add this plugin to the registeredBy set
      metadata.registeredBy.add(plugin.metadata.id);
      console.log(`[CJS|EventSystem] ✓ Plugin ${plugin.metadata.id} registered event: ${eventName}`);
    } else {
      // Create new event
      metadata = {
        eventName,
        registeredBy: new Set([plugin.metadata.id]),
        description: options.description,
        payload: options.payload || {},
        broadcastIPC: options.broadcastIPC !== undefined ? options.broadcastIPC : true,
        logToConsole: options.logToConsole !== undefined ? options.logToConsole : true,
        emitCount: 0,
        lastEmitted: null,
        listeners: new Set()
      };

      this.events.set(eventName, metadata);
      console.log(`[CJS|EventSystem] ✓ Registered event: ${eventName}`);
    }
  }

  /**
   * Unregister an event (called on plugin unload)
   */
  unregister(plugin: any, eventName: string): void {
    const metadata = this.events.get(eventName);
    if (metadata) {
      metadata.registeredBy.delete(plugin.metadata.id);
      // If no plugins registered this event anymore, remove it
      if (metadata.registeredBy.size === 0) {
        this.events.delete(eventName);
      }
    }
  }

  /**
   * Unregister all events for a plugin
   */
  unregisterAll(pluginId: string): void {
    const toDelete: string[] = [];
    this.events.forEach((metadata, eventName) => {
      metadata.registeredBy.delete(pluginId);
      if (metadata.registeredBy.size === 0) {
        toDelete.push(eventName);
      }
    });
    toDelete.forEach(key => this.events.delete(key));
  }

  /**
   * Emit an event with automatic plugin injection and IPC/logging
   */
  emit(plugin: any, eventName: string, payload: any): void {
    const metadata = this.events.get(eventName);

    if (!metadata) {
      console.error(`[CJS|EventSystem] Event "${eventName}" not registered!`);
      return;
    }

    // Auto-inject plugin object into payload
    const enrichedPayload = {
      plugin: plugin,
      ...payload
    };

    // Update statistics
    metadata.emitCount++;
    metadata.lastEmitted = Date.now();

    // Console logging
    if (metadata.logToConsole) {
      const pluginName = plugin.metadata.name || plugin.metadata.id;
      console.groupCollapsed(`[CJS|${plugin.metadata.id}] Event: ${eventName}`);
      console.log('Plugin:', pluginName);
      console.log('Payload:', payload);
      console.log('Emit Count:', metadata.emitCount);
      console.log('Listeners:', metadata.listeners.size);
      console.groupEnd();
    }

    // IPC broadcasting
    if (metadata.broadcastIPC) {
      try {
        const AppApi = (window as any).AppApi;
        if (AppApi?.SendIpc) {
          AppApi.SendIpc('PluginEvent', JSON.stringify({
            pluginId: plugin.metadata.id,
            pluginName: plugin.metadata.name,
            eventName,
            payload: enrichedPayload,
            timestamp: Date.now()
          }));
        }
      } catch (error) {
        console.error(`[CJS|EventSystem] IPC broadcast failed for ${eventName}:`, error);
      }
    }

    // Call registered listeners with enriched payload
    metadata.listeners.forEach(({callback}) => {
      try {
        callback(enrichedPayload);
      } catch (error) {
        console.error(`[CJS|EventSystem] Error in listener for ${eventName}:`, error);
      }
    });

    // Call wildcard listeners
    const wildcardListeners = this.wildcardListeners.get('*');
    if (wildcardListeners) {
      wildcardListeners.forEach(({callback}) => {
        try {
          callback(eventName, enrichedPayload);
        } catch (error) {
          console.error(`[CJS|EventSystem] Error in wildcard listener:`, error);
        }
      });
    }
  }

  /**
   * Add event listener
   */
  addListener(listenerPlugin: any, fullEventName: string, callback: Function): Function {
    // Handle wildcard patterns
    if (fullEventName.includes('*')) {
      if (!this.wildcardListeners.has(fullEventName)) {
        this.wildcardListeners.set(fullEventName, new Set());
      }
      const listener = {plugin: listenerPlugin, callback};
      this.wildcardListeners.get(fullEventName)!.add(listener);
      
      // Return unsubscribe function
      return () => {
        this.wildcardListeners.get(fullEventName)?.delete(listener);
      };
    }

    // Regular event listener
    const metadata = this.events.get(fullEventName);
    if (!metadata) {
      console.warn(`[CJS|EventSystem] Listening to unregistered event: ${fullEventName}`);
    }

    const listener = {plugin: listenerPlugin, callback};
    
    if (metadata) {
      metadata.listeners.add(listener);
    }

    // Return unsubscribe function
    return () => {
      metadata?.listeners.delete(listener);
    };
  }

  /**
   * Remove event listener
   */
  removeListener(listenerPlugin: any, fullEventName: string, callback: Function): void {
    const metadata = this.events.get(fullEventName);
    if (metadata) {
      // Find and remove the listener
      for (const listener of metadata.listeners) {
        if (listener.plugin === listenerPlugin && listener.callback === callback) {
          metadata.listeners.delete(listener);
          break;
        }
      }
    }

    // Also check wildcard listeners
    if (fullEventName.includes('*')) {
      const listeners = this.wildcardListeners.get(fullEventName);
      if (listeners) {
        for (const listener of listeners) {
          if (listener.plugin === listenerPlugin && listener.callback === callback) {
            listeners.delete(listener);
            break;
          }
        }
      }
    }
  }

  /**
   * Remove all listeners for a plugin
   */
  removeAllListeners(listenerPlugin: any): void {
    // Remove from regular events
    this.events.forEach(metadata => {
      const toRemove: any[] = [];
      metadata.listeners.forEach(listener => {
        if (listener.plugin === listenerPlugin) {
          toRemove.push(listener);
        }
      });
      toRemove.forEach(listener => metadata.listeners.delete(listener));
    });

    // Remove from wildcard listeners
    this.wildcardListeners.forEach(listeners => {
      const toRemove: any[] = [];
      listeners.forEach(listener => {
        if (listener.plugin === listenerPlugin) {
          toRemove.push(listener);
        }
      });
      toRemove.forEach(listener => listeners.delete(listener));
    });
  }

  /**
   * List all events (optionally filtered by plugin)
   */
  list(pluginId?: string): string[] {
    const events: string[] = [];
    this.events.forEach((metadata, fullEventName) => {
      if (!pluginId || metadata.pluginId === pluginId) {
        events.push(fullEventName);
      }
    });
    return events.sort();
  }

  /**
   * List all events with full metadata
   */
  listAll(pluginId?: string): EventMetadata[] {
    const events: EventMetadata[] = [];
    this.events.forEach((metadata) => {
      if (!pluginId || metadata.pluginId === pluginId) {
        events.push({
          ...metadata,
          listeners: new Set(metadata.listeners) // Clone listeners set
        });
      }
    });
    return events.sort((a, b) => a.fullEventName.localeCompare(b.fullEventName));
  }

  /**
   * Get event metadata
   */
  get(fullEventName: string): EventMetadata | null {
    return this.events.get(fullEventName) || null;
  }

  /**
   * Get event statistics
   */
  getStats(fullEventName?: string): any {
    if (fullEventName) {
      const metadata = this.events.get(fullEventName);
      if (!metadata) return null;
      
      return {
        eventName: metadata.fullEventName,
        emitCount: metadata.emitCount,
        lastEmitted: metadata.lastEmitted,
        listenerCount: metadata.listeners.size,
        broadcastIPC: metadata.broadcastIPC,
        logToConsole: metadata.logToConsole
      };
    }

    // Global stats
    const stats: any = {
      totalEvents: this.events.size,
      totalEmits: 0,
      totalListeners: 0,
      byPlugin: {} as any
    };

    this.events.forEach(metadata => {
      stats.totalEmits += metadata.emitCount;
      stats.totalListeners += metadata.listeners.size;

      if (!stats.byPlugin[metadata.pluginId]) {
        stats.byPlugin[metadata.pluginId] = {
          pluginName: metadata.pluginName,
          events: 0,
          emits: 0,
          listeners: 0
        };
      }

      stats.byPlugin[metadata.pluginId].events++;
      stats.byPlugin[metadata.pluginId].emits += metadata.emitCount;
      stats.byPlugin[metadata.pluginId].listeners += metadata.listeners.size;
    });

    return stats;
  }
}

/**
 * Plugin-scoped Event API
 * Provides convenient methods for plugins to work with events
 */
export class PluginEventAPI {
  private plugin: any;
  private registry: EventRegistry;

  constructor(plugin: any, registry: EventRegistry) {
    this.plugin = plugin;
    this.registry = registry;
  }

  /**
   * Register an event that this plugin can emit
   */
  register(eventName: string, options: EventRegistrationOptions): void {
    this.registry.register(this.plugin, eventName, options);
  }

  /**
   * Emit an event
   */
  emit(eventName: string, payload: any): void {
    this.registry.emit(this.plugin, eventName, payload);
  }

  /**
   * Listen to an event from any plugin
   * @param fullEventName - Format: 'pluginId:eventName' or 'pluginId:*' or '*:*'
   * @param callback - Event handler
   * @returns Unsubscribe function
   */
  on(fullEventName: string, callback: Function): Function {
    const unsubscribe = this.registry.addListener(this.plugin, fullEventName, callback);
    this.plugin.registerSubscription(unsubscribe);
    return unsubscribe;
  }

  /**
   * Remove event listener
   */
  off(fullEventName: string, callback: Function): void {
    this.registry.removeListener(this.plugin, fullEventName, callback);
  }

  /**
   * List events registered by this plugin
   */
  list(): string[] {
    return this.registry.list(this.plugin.metadata.id);
  }

  /**
   * Get metadata for a specific event
   */
  get(fullEventName: string): EventMetadata | null {
    return this.registry.get(fullEventName);
  }

  /**
   * Get statistics for this plugin's events
   */
  getStats(): any {
    const allEvents = this.registry.listAll(this.plugin.metadata.id);
    return {
      totalEvents: allEvents.length,
      events: allEvents.map(e => ({
        name: e.eventName,
        emitCount: e.emitCount,
        listenerCount: e.listeners.size,
        lastEmitted: e.lastEmitted
      }))
    };
  }
}
