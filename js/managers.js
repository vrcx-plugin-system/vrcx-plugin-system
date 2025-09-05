// ============================================================================
// MANAGEMENT CLASSES
// ============================================================================

const SCRIPT = {
    name: "Managers Module",
    description: "Management classes for instance monitoring, notifications, and debug tools",
    author: "Bluscream",
    version: "1.0.0",
    dependencies: [
        "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/api-helpers.js",
        "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/utils.js"
    ]
};

// ============================================================================
// INSTANCE MONITORING
// ============================================================================

class InstanceMonitor {
    constructor() {
        this.lastInvisiblePlayers = 0;
        this.setupInstanceOverride();
    }

    setupInstanceOverride() {
        const originalGetInstance = window.request.instanceRequest.getInstance;
        window.request.instanceRequest.getInstance = (params) => {
            return originalGetInstance(params).then((args) => {
                const users = args.json.userCount;
                const realUsers = args.json.n_users - args.json.queueSize;
                args.json.invisiblePlayers = realUsers - users;
                if (args.json.invisiblePlayers > 0) {
                    args.json.displayName = `${args.json.displayName??args.json.name} (${args.json.invisiblePlayers} invisible)`
                    setTimeout(async () => { 
                        Logger.log(`Found ${args.json.invisiblePlayers} potentially invisible players in instance "${args.json.instanceId}" in world "${args.json.worldName}"`, true, true, true);
                    }, 1000);
                }
                return args;
            });
        };
    }
}

// ============================================================================
// NOTIFICATION HANDLING
// ============================================================================

class NotificationHandler {
    constructor() {
        this.setupNotificationOverride();
    }

    setupNotificationOverride() {
        $app.playNoty = (json) => {
            setTimeout(() => { bak.playNoty(json); }, 0);
            let noty = json;
            let message, image;
            if (typeof json === 'string') noty, message, image = JSON.parse(json);
            if (Utils.isEmpty(noty)) return;
            
            const now = new Date().getTime();
            const time = new Date(noty.created_at).getTime();
            const diff = now - time;
            
            if (diff > 10000) return;

            switch (noty.type) {
                case 'OnPlayerJoined':
                    // Check if the joining player has custom tags
                    this.handleTaggedPlayerJoined(noty);
                    break;
                case 'BlockedOnPlayerJoined':
                    console.log(noty.type, autoInviteManager.lastJoined);
                    if (Utils.isEmpty(autoInviteManager.lastJoined)) return;
                    const p = $app.parseLocation(autoInviteManager.lastJoined);
                    $app.newInstanceSelfInvite(p.worldId);
                    break;
                case 'invite':
                    console.log(noty);
                    break;
                case 'GameStarted':
                    // Trigger registry overrides when game starts
                    if (window.customjs?.registryOverrides) {
                        window.customjs.registryOverrides.triggerEvent('GAME_START');
                    }
                    break;
            }
        };
    }

    handleTaggedPlayerJoined(noty) {
        try {
            // Extract player information from the notification
            const playerId = noty.userId || noty.id;
            const playerName = noty.displayName || noty.name || 'Unknown Player';
            
            if (!playerId) {
                console.log('No player ID found in join notification');
                return;
            }

            // Check if the player has custom tags
            const customTags = $app.store.user.customTags;
            if (!customTags || customTags.size === 0) {
                return; // No custom tags loaded
            }

            // Look for tags for this player
            const playerTags = [];
            for (const [tagKey, tagData] of customTags.entries()) {
                if (tagKey.startsWith(playerId + '_')) {
                    playerTags.push({
                        text: tagData.Tag,
                        color: tagData.TagColour || '#FF00C6'
                    });
                }
            }

            // If player has tags, show notification
            if (playerTags.length > 0) {
                const tagText = playerTags.map(tag => tag.text).join(', ');
                const notificationMessage = `${playerName} joined (${tagText})`;
                
                // Notify with playerName and each tag on a new line
                const lines = [playerName, ...playerTags.map(tag => tag.text)];
                const notification = lines.join('\n');
                Logger.log(notification, true, true, true);
            }
        } catch (error) {
            console.error('Error handling tagged player joined:', error);
        }
    }
}

// ============================================================================
// DEBUG & DEVELOPMENT TOOLS
// ============================================================================

class DebugTools {
    constructor() {
        this.setupIPCLogging();
        this.setupConsoleFunctions();
    }

    setupIPCLogging() {
        AppApi.SendIpc = (...args) => {
            console.log("[IPC OUT]", ...args);
            bak.SendIpc(...args);
        }
        
        $app.store.vrcx.eventVrcxMessage = (...args) => {
            console.log("[IPC IN]", ...args);
            bak.eventVrcxMessage(...args);
        }
    }

    setupConsoleFunctions() {
        // Add useful console functions for debugging
        const debugVRCX = {
            getCurrentUser: () => $app.store.user.currentUser,
            getCurrentLocation: () => $app.lastLocation,
            getFriends: () => $app.store.user.currentUser.friends,
            getCustomTags: () => $app.store.user.customTags,
            clearProcessedMenus: () => window.customjs?.clearProcessedMenus(),
            triggerRegistryEvent: (event) => window.customjs?.registryOverrides?.triggerEvent(event),
            refreshTags: () => window.customjs?.tagManager?.refreshTags(),
            getLoadedTagsCount: () => window.customjs?.tagManager?.getLoadedTagsCount()
        };
        
        // Register debug functions in the global namespace
        window.customjs = window.customjs || {};
        window.customjs.debug = debugVRCX;
        
        // Also make available globally for backward compatibility
        window.debugVRCX = debugVRCX;
    }
}

// Auto-initialize the module
(function() {
    // Register this module in the global namespace
    window.customjs = window.customjs || {};
    window.customjs.instanceMonitor = new InstanceMonitor();
    window.customjs.notificationHandler = new NotificationHandler();
    window.customjs.debugTools = new DebugTools();
    window.customjs.script = window.customjs.script || {};
    window.customjs.script.managers = SCRIPT;
    
    // Also make classes available globally for backward compatibility
    window.InstanceMonitor = InstanceMonitor;
    window.NotificationHandler = NotificationHandler;
    window.DebugTools = DebugTools;
    
    console.log(`✓ Loaded ${SCRIPT.name} v${SCRIPT.version} by ${SCRIPT.author}`);
})();
