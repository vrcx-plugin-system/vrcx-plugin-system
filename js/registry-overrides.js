// ============================================================================
// REGISTRY OVERRIDES MANAGEMENT
// ============================================================================

class RegistryOverrides {
    static SCRIPT = {
        name: "Registry Overrides Module",
        description: "VRChat registry settings management with event-based triggers",
        author: "Bluscream",
        version: "1.0.0",
        dependencies: [
            "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/config.js"
        ]
    };
    constructor() {
        this.updateInterval = null;
        this.eventHandlers = new Map();
        this.init();
    }

    init() {
        this.setupEventHandlers();
        this.applyRegistrySettings('VRCX_START');
        
        // Periodic application for keys that need constant enforcement
        this.updateInterval = setInterval(() => {
            this.applyRegistrySettings('PERIODIC');
        }, 2500);
    }

    setupEventHandlers() {
        // Set up event handlers for different VRCX events
        this.eventHandlers.set('VRCX_START', () => this.applyRegistrySettings('VRCX_START'));
        this.eventHandlers.set('GAME_START', () => this.applyRegistrySettings('GAME_START'));
        this.eventHandlers.set('INSTANCE_SWITCH_PUBLIC', () => this.applyRegistrySettings('INSTANCE_SWITCH_PUBLIC'));
        this.eventHandlers.set('INSTANCE_SWITCH_PRIVATE', () => this.applyRegistrySettings('INSTANCE_SWITCH_PRIVATE'));
        
        // You can add more event handlers here as needed
        // Example: this.eventHandlers.set('USER_LOGIN', () => this.applyRegistrySettings('USER_LOGIN'));
    }

    // Method to trigger registry updates for specific events
    triggerEvent(eventName) {
        const handler = this.eventHandlers.get(eventName);
        if (handler) {
            handler();
        }
    }

    async applyRegistrySettings(triggerEvent = 'PERIODIC') {
        try {
            // Get config from global namespace
            const config = window.customjs?.config?.registry || {};
            
            // Apply all registry settings from config
            for (const [key, configValue] of Object.entries(config)) {
                try {
                    let value, events;
                    
                    // Handle both simple key-value format and object format
                    if (typeof configValue === 'object' && configValue.value !== undefined) {
                        value = configValue.value;
                        events = configValue.events || ['PERIODIC'];
                    } else {
                        // Simple format - apply on all events
                        value = configValue;
                        events = ['PERIODIC'];
                    }
                    
                    // Check if this key should be applied for the current event
                    if (!events.includes(triggerEvent) && !events.includes('PERIODIC')) {
                        continue;
                    }
                    
                    const oldVal = await AppApi.GetVRChatRegistryKey(key);
                    if (window.Logger?.log) {
                        window.Logger.log(`[${triggerEvent}] ${key} was ${oldVal}, setting to ${value}`, { console: true }, 'info');
                    }
                    
                    // Determine the registry type based on the value type
                    let registryType = 3; // Default to REG_DWORD
                    if (typeof value === 'string') {
                        registryType = 1; // REG_SZ for strings
                    } else if (typeof value === 'number') {
                        registryType = 3; // REG_DWORD for numbers
                    }
                    
                    await AppApi.SetVRChatRegistryKey(key, value, registryType);
                } catch (error) {
                    if (window.Logger?.log) {
                        window.Logger.log(`Error setting registry key ${key}: ${error.message}`, { console: true }, 'error');
                    }
                }
            }
        } catch (error) {
            if (window.Logger?.log) {
                window.Logger.log(`Error applying registry settings: ${error.message}`, { console: true }, 'error');
            }
        }
    }
}

// Auto-initialize the module
(function() {
    // Register this module in the global namespace
    window.customjs = window.customjs || {};
    window.customjs.registryOverrides = new RegistryOverrides();
    window.customjs.script = window.customjs.script || {};
    window.customjs.script.registryOverrides = RegistryOverrides.SCRIPT;
    
    // Also make RegistryOverrides available globally for backward compatibility
    window.RegistryOverrides = RegistryOverrides;
    
    console.log(`✓ Loaded ${RegistryOverrides.SCRIPT.name} v${RegistryOverrides.SCRIPT.version} by ${RegistryOverrides.SCRIPT.author}`);
})();
