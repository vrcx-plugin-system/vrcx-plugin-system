console.log("custom.js START - Version 2.0 - Cache Buster: " + Date.now())

// ============================================================================
// USER CONFIGURATION
// ============================================================================

// User-configurable settings
const USER_CONFIG = {
    steam: {
        id: "{env:STEAM_ID64}",
        key: "{env:STEAM_API_KEY}"
    },
    bio: {
        updateInterval: 7200000, // 2 hours
        initialDelay: 20000,     // 20 seconds
        template: `
-
Relationship: {partners} <3
Auto Accept: {autojoin}
Auto Invite: {autoinvite}

Real Rank: {rank}
Friends: {friends} | Blocked: {blocked} | Muted: {muted}
Time played: {playtime}
Date joined: {date_joined}
Last updated: {now} (every 2h)
Tags loaded: {tags_loaded}

User ID: {userId}
Steam ID: {steamId}
Oculus ID: {oculusId}`
    },
    registry: {
        // Registry settings to apply/override
        // Can be simple key-value pairs or objects with value and events
        "VRC_ALLOW_UNTRUSTED_URL": {
            value: 0,
            events: ["VRCX_START", "GAME_START", "INSTANCE_SWITCH_PUBLIC", "INSTANCE_SWITCH_PRIVATE"]
        }
        // Simple format (applies on all events):
        // VRC_SOME_OTHER_SETTING: 1,
        // VRC_ANOTHER_STRING_SETTING: "value"
    },
    tags: {
        // URLs to JSON files containing custom tags
        // Each JSON file should contain user objects with tags arrays
        urls: [
            "https://github.com/Bluscream/FewTags/raw/refs/heads/main/usertags.json"
        ],
        // Update interval in milliseconds (default: 1 hour)
        updateInterval: 3600000,
        // Initial delay before first fetch (default: 5 seconds)
        initialDelay: 5000
    }
};

// ============================================================================
// MODULE LOADER
// ============================================================================

// Configuration for module loading
const MODULE_CONFIG = {
    // GitHub URLs for modules (loaded in dependency order)
    modules: [
        'https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/config.js',
        'https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/utils.js', 
        'https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/api-helpers.js',
        'https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/context-menu.js',
        'https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/registry-overrides.js',
        'https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/tag-manager.js',
        'https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/bio-updater.js',
        'https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/auto-invite.js',
        'https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/managers.js'
    ],
    // Load timeout in milliseconds
    loadTimeout: 10000
};

// Module loader class
class ModuleLoader {
    constructor() {
        this.loadedModules = new Set();
        this.failedModules = new Set();
    }

    async loadAllModules() {
        console.log('Loading VRCX custom modules from GitHub...');
        
        // Load GitHub modules
        for (const module of MODULE_CONFIG.modules) {
            await this.loadModule(module);
        }
        
        console.log(`Module loading complete. Loaded: ${this.loadedModules.size}, Failed: ${this.failedModules.size}`);
        
        // Initialize systems after all modules are loaded
        this.initializeSystems();
    }

    async loadModule(modulePath) {
        try {
            // Add cache-busting parameter to force fresh fetch
            const url = modulePath + '?v=' + Date.now();
            console.log(`Loading module: ${modulePath}`);
            
            // Fetch the module content first to handle MIME type issues
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const moduleCode = await response.text();
            
            // Wrap the module code in an IIFE to create a separate scope
            const wrappedCode = `(function() {
                ${moduleCode}
            })();`;
            
            // Create a script element and inject the wrapped code directly
            const script = document.createElement('script');
            script.type = 'text/javascript';
            script.textContent = wrappedCode;
            
            // Set up promise-based loading
            const loadPromise = new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error(`Module load timeout: ${modulePath}`));
                }, MODULE_CONFIG.loadTimeout);
                
                // Since we're injecting code directly, we can resolve immediately
                // but add a small delay to ensure proper execution order
                setTimeout(() => {
                    clearTimeout(timeout);
                    this.loadedModules.add(modulePath);
                    console.log(`✓ Loaded module: ${modulePath}`);
                    resolve();
                }, 10);
            });
            
            // Append script to head
            document.head.appendChild(script);
            
            // Wait for load to complete
            await loadPromise;
            
        } catch (error) {
            console.error(`Error loading module ${modulePath}:`, error);
            this.failedModules.add(modulePath);
        }
    }

    initializeSystems() {
        try {
            console.log('Initializing VRCX systems...');
            
            // Create global customjs namespace
            window.customjs = window.customjs || {};
            
            // Pass user config to global namespace
            window.customjs.config = USER_CONFIG;
            
            // Initialize all systems
            setTimeout(async () => { await AppApi.FocusWindow(); }, 0);
            
            // Modules are now self-initializing, so we just need to trigger their initialization
            // Each module will register itself in the window.customjs namespace
            
            console.log("custom.js END - All systems initialized");
            console.log("Available modules:", Object.keys(window.customjs));
            
        } catch (error) {
            console.error('Error initializing systems:', error);
        }
    }
}

// ============================================================================
// INITIALIZATION
// ============================================================================

// Start loading modules when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        const loader = new ModuleLoader();
        loader.loadAllModules();
    });
} else {
    // DOM is already ready
    const loader = new ModuleLoader();
    loader.loadAllModules();
}