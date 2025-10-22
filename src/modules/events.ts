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
      console.log(`[CJS|${plugin.metadata.id}] Event: ${eventName} [${metadata.emitCount}|${metadata.listeners.size}] (${JSON.stringify(payload)})`, payload);
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
  addListener(listenerPlugin: any, eventName: string, callback: Function): Function {
    // Handle wildcard pattern
    if (eventName === '*') {
      if (!this.wildcardListeners.has('*')) {
        this.wildcardListeners.set('*', new Set());
      }
      const listener = {plugin: listenerPlugin, callback};
      const wildcardSet = this.wildcardListeners.get('*');
      if (wildcardSet) {
        wildcardSet.add(listener);
      }
      
      // Return unsubscribe function
      return () => {
        this.wildcardListeners.get('*')?.delete(listener);
      };
    }

    // Regular event listener
    const metadata = this.events.get(eventName);
    if (!metadata) {
      console.warn(`[CJS|EventSystem] Listening to unregistered event: ${eventName}`);
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
  removeListener(listenerPlugin: any, eventName: string, callback: Function): void {
    const metadata = this.events.get(eventName);
    if (metadata) {
      // Find and remove the listener
      for (const listener of metadata.listeners) {
        if (listener.plugin === listenerPlugin && listener.callback === callback) {
          metadata.listeners.delete(listener);
          break;
        }
      }
    }

    // Also check wildcard listener
    if (eventName === '*') {
      const listeners = this.wildcardListeners.get('*');
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
    this.events.forEach((metadata, eventName) => {
      if (!pluginId || metadata.registeredBy.has(pluginId)) {
        events.push(eventName);
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
      if (!pluginId || metadata.registeredBy.has(pluginId)) {
        events.push({
          ...metadata,
          registeredBy: new Set(metadata.registeredBy),
          listeners: new Set(metadata.listeners)
        });
      }
    });
    return events.sort((a, b) => a.eventName.localeCompare(b.eventName));
  }

  /**
   * Get event metadata
   */
  get(eventName: string): EventMetadata | null {
    return this.events.get(eventName) || null;
  }

  /**
   * Get event statistics
   */
  getStats(eventName?: string): any {
    if (eventName) {
      const metadata = this.events.get(eventName);
      if (!metadata) return null;
      
      return {
        eventName: metadata.eventName,
        registeredBy: Array.from(metadata.registeredBy),
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

      // Track stats for each plugin that registered this event
      metadata.registeredBy.forEach(pluginId => {
        if (!stats.byPlugin[pluginId]) {
          stats.byPlugin[pluginId] = {
            events: 0,
            emits: 0,
            listeners: 0
          };
        }
        stats.byPlugin[pluginId].events++;
      });
    });

    return stats;
  }
}
