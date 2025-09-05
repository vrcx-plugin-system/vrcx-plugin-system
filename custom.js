console.log("custom.js START - Version 2.0 - Cache Buster: " + Date.now())

// ============================================================================
// USER CONFIGURATION
// ============================================================================

// User-configurable settings
const USER_CONFIG = {
    url: "https://gist.github.com/Bluscream/7842ad23efb6cbb73f6a1bb17008deed",
    steam: {
        id: "", // TODO: Remove
        key: ""
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
        },
        "VRC_ALLOW_INSECURE_CONTENT": {
            value: "yes",
            events: ["VRCX_START", "GAME_START"]
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
            await this.loadModule(module, 'github');
        }
        
        console.log(`Module loading complete. Loaded: ${this.loadedModules.size}, Failed: ${this.failedModules.size}`);
        
        // Initialize systems after all modules are loaded
        this.initializeSystems();
    }

    async loadModule(modulePath, type = 'github') {
        try {
            // Add cache-busting parameter to force fresh fetch
            const url = modulePath + '?v=' + Date.now();
            console.log(`Loading ${type} module: ${modulePath}`);
            
            // Fetch the module content first to handle MIME type issues
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const moduleCode = await response.text();
            
            // Extract module name from URL for unique variable naming
            const moduleName = modulePath.split('/').pop().replace('.js', '');
            const uniqueScriptVar = `SCRIPT_${moduleName.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`;
            
            // Replace SCRIPT declarations with unique variable names
            const processedCode = moduleCode.replace(/const SCRIPT =/g, `const ${uniqueScriptVar} =`);
            
            // Wrap the module code in an IIFE to create a separate scope
            const wrappedCode = `(function() {
                ${processedCode}
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

// ============================================================================
// USAGE EXAMPLES
// ============================================================================

/*
// Example usage of the new CustomContextMenu class:

// Create a single instance for all context menus
const customMenu = new CustomContextMenu();

// User context menu items
const userItem = customMenu.addUserItem('customUserAction', {
    text: 'Custom User Action',
    icon: 'el-icon-star-on',
    onClick: (user) => {
        console.log('Custom action for user:', user.displayName);
    }
});

// Remove user item later
customMenu.removeUserItem('customUserAction');

// World context menu items
const worldItem = customMenu.addWorldItem('worldAction', {
    text: 'Custom World Action',
    icon: 'el-icon-location',
    onClick: (world) => {
        console.log('Custom action for world:', world.name);
    }
});

// Avatar context menu items
const avatarItem = customMenu.addAvatarItem('avatarAction', {
    text: 'Custom Avatar Action',
    icon: 'el-icon-user',
    onClick: (avatar) => {
        console.log('Custom action for avatar:', avatar.name);
    }
});

// Group context menu items
const groupItem = customMenu.addGroupItem('groupAction', {
    text: 'Custom Group Action',
    icon: 'el-icon-s-custom',
    onClick: (group) => {
        console.log('Custom action for group:', group.name);
    }
});

// Instance context menu items
const instanceItem = customMenu.addInstanceItem('instanceInfo', {
    text: 'Show Instance Info',
    icon: 'el-icon-info',
    onClick: (instanceData) => {
        console.log('Instance data:', instanceData);
    }
});

// Update items
customMenu.updateUserItem('customUserAction', { 
    text: 'Updated User Action',
    enabled: false 
});

// Check if item exists
if (customMenu.hasItem('user', 'customUserAction')) {
    console.log('User action item exists');
}

// Get all item IDs for a menu type
const userItemIds = customMenu.getItemIds('user');
console.log('User menu items:', userItemIds);

// Clear all items of a specific type
customMenu.clear('user');

// Clear all items
customMenu.clear();

// Registry Overrides Examples:
// Trigger registry updates for specific events
registryOverrides.triggerEvent('GAME_START');
registryOverrides.triggerEvent('INSTANCE_SWITCH_PUBLIC');

// Registry Configuration Examples:
registry: {
    // Event-based configuration
    "VRC_ALLOW_UNTRUSTED_URL": {
        value: 0,
        events: ["VRCX_START", "GAME_START", "INSTANCE_SWITCH_PUBLIC", "INSTANCE_SWITCH_PRIVATE"]
    },
    "VRC_ALLOW_INSECURE_CONTENT": {
        value: "yes",
        events: ["VRCX_START", "GAME_START"]
    },
    // Simple format (applies on all events)
    "VRC_SIMPLE_SETTING": 42,
    "VRC_ANOTHER_STRING_SETTING": "value"
}

// Custom Tags Examples:
// Manual tag management
customTagManager.addTag('usr_12345678-1234-1234-1234-123456789012', 'Cool Person', '#00FF00');
customTagManager.refreshTags(); // Manually refresh from URLs
console.log('Total loaded tags:', customTagManager.getLoadedTagsCount());

// Tags Configuration Examples:
tags: {
    urls: [
        "https://github.com/Bluscream/FewTags/raw/refs/heads/main/usertags.json",
        "https://raw.githubusercontent.com/user/repo/main/tags.json",
        "https://example.com/my-tags.json"
    ],
    updateInterval: 1800000, // 30 minutes
    initialDelay: 10000      // 10 seconds
}

// JSON Tag File Format Examples:
// Option 1: FewTags format (object with user IDs as keys)
{
    "usr_c4f62fc6-24ce-4806-8c8e-fd1857f79b66": {
        "id": -231,
        "active": true,
        "malicious": false,
        "tags": ["FewTags Owner", "Custom Tag 1", "Custom Tag 2"],
        "tag": "FewTags Owner",
        "foreground_color": "#ff0000",
        "sources": ["ExternalTags.json", "FewTags.json"]
    }
}

// Option 2: Direct array format
[
    {
        "UserId": "usr_12345678-1234-1234-1234-123456789012",
        "Tag": "Friend",
        "TagColour": "#00FF00"
    },
    {
        "UserId": "usr_87654321-4321-4321-4321-210987654321",
        "Tag": "Moderator",
        "TagColour": "#FF0000"
    }
]

// Option 3: Object with tags property
{
    "tags": [
        {
            "UserId": "usr_12345678-1234-1234-1234-123456789012",
            "Tag": "VIP",
            "TagColour": "#FFD700"
        }
    ]
}

// Option 4: Object with data property
{
    "data": [
        {
            "UserId": "usr_12345678-1234-1234-1234-123456789012",
            "Tag": "Developer",
            "TagColour": "#0000FF"
        }
    ]
}
*/
