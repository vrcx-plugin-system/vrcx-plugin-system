// ============================================================================
// CONFIGURATION & METADATA
// ============================================================================

// Configuration class that uses the user config from main custom.js
class ConfigManager {
    static SCRIPT = {
        name: "Config Module",
        description: "Configuration management and metadata for VRCX custom modules",
        author: "Bluscream",
        version: "1.0.0",
        dependencies: []
    };

    constructor() {
        this.config = null;
        this.init();
    }

    init() {
        // Wait for user config to be available
        const checkConfig = () => {
            if (window.customjs && window.customjs.config) {
                this.config = window.customjs.config;
                this.registerModule();
            } else {
                setTimeout(checkConfig, 100);
            }
        };
        checkConfig();
    }

    registerModule() {
        // Register this module in the global namespace
        window.customjs = window.customjs || {};
        
        // Don't overwrite the existing config if it exists
        if (!window.customjs.config) {
            window.customjs.config = this.config;
        }
        
        // Store the config manager instance separately
        window.customjs.configManager = this;
        window.customjs.script = window.customjs.script || {};
//         window.customjs.script.config = SCRIPT;
        
        // Also make CONFIG available globally for backward compatibility
        window.CONFIG = window.customjs.config;
        
        console.log(`✓ Loaded ${ConfigManager.SCRIPT.name} v${ConfigManager.SCRIPT.version} by ${ConfigManager.SCRIPT.author}`);
    }

}

// Auto-initialize the module
new ConfigManager();
