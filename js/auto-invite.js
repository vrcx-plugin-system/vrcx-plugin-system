// ============================================================================
// AUTO INVITE MANAGEMENT
// ============================================================================

class AutoInviteManager {
    static SCRIPT = {
        name: "Auto Invite Module",
        description: "Automatic user invitation system with location tracking",
        author: "Bluscream",
        version: "1.0.0",
        dependencies: [
            "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/api-helpers.js",
            "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/context-menu.js",
            "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/utils.js"
        ]
    };
    constructor() {
        this.autoInviteUser = null;
        this.lastInvitedTo = null;
        this.lastJoined = null;
        
        // Try to get existing CustomContextMenu instance or create new one
        if (window.customjs?.contextMenu) {
            this.customMenu = window.customjs.contextMenu;
            window.Logger?.log('Using existing CustomContextMenu instance', { console: true }, 'info');
        } else if (window.CustomContextMenu) {
            this.customMenu = new window.CustomContextMenu();
            window.Logger?.log('Created new CustomContextMenu instance', { console: true }, 'info');
        } else {
            window.Logger?.log('CustomContextMenu not available, will retry later', { console: true }, 'warning');
            this.customMenu = null;
        }
        
        this.autoInviteItem = null;
        this.setupLocationTracking();
        
        // Listen for context menu ready event as additional fallback
        window.addEventListener('contextMenuReady', (event) => {
            if (!this.customMenu && !this.autoInviteItem) {
                this.customMenu = event.detail.contextMenu;
                window.Logger?.log('Context menu received via event, setting up user button', { console: true }, 'info');
                this.setupUserButton();
            }
        });
        
        this.setupUserButton();
    }

    setupLocationTracking() {
        // Store original function if not already stored
        if (typeof window.bak === 'undefined') {
            window.bak = {};
        }
        if (!window.bak.setCurrentUserLocation) {
            window.bak.setCurrentUserLocation = $app.setCurrentUserLocation;
        }
        
        // Override setCurrentUserLocation to track location changes
        $app.setCurrentUserLocation = (location, travelingToLocation) => {
            window.Logger?.log(`Location change detected: ${location} (traveling to: ${travelingToLocation})`, { console: true }, 'info');
            
            // Call original function with all parameters
            window.bak.setCurrentUserLocation(location, travelingToLocation);
            
            // Process location change with a delay to ensure VRCX state is updated
            setTimeout(async () => { 
                await this.onCurrentUserLocationChanged(location, travelingToLocation);
            }, 1000);
        };
    }

    setupUserButton() {
        try {
            // Don't setup if already done
            if (this.autoInviteItem) {
                window.Logger?.log('Auto Invite user button already setup, skipping', { console: true }, 'info');
                return true;
            }
            
            window.Logger?.log('Setting up Auto Invite user button...', { console: true }, 'info');
            
            // Try to get the context menu if we don't have it yet
            if (!this.customMenu) {
                if (window.customjs?.contextMenu) {
                    this.customMenu = window.customjs.contextMenu;
                    window.Logger?.log('Found CustomContextMenu instance on retry', { console: true }, 'info');
                } else if (window.CustomContextMenu) {
                    this.customMenu = new window.CustomContextMenu();
                    window.Logger?.log('Created new CustomContextMenu instance on retry', { console: true }, 'info');
                } else {
                    throw new Error('CustomContextMenu still not available');
                }
            }
            
            this.autoInviteItem = this.customMenu.addUserItem('autoInvite', {
                text: 'Auto Invite',
                icon: 'el-icon-message',
                onClick: (user) => this.toggleAutoInvite(user)
            });
            
            window.Logger?.log('Auto Invite user button setup completed', { console: true }, 'info');
            return true;
        } catch (error) {
            window.Logger?.log(`Error setting up Auto Invite user button: ${error.message}`, { console: true }, 'error');
            console.error('Auto Invite setup error:', error);
            
            // Retry after a delay if the context menu isn't ready yet (but only if we haven't already succeeded)
            if (!this.autoInviteItem) {
                setTimeout(() => {
                    window.Logger?.log('Retrying Auto Invite user button setup...', { console: true }, 'info');
                    this.setupUserButton();
                }, 2000);
            }
            
            return false;
        }
    }

    async onCurrentUserLocationChanged(location, travelingToLocation) {
        window.Logger?.log(`Processing location change: ${location} (traveling to: ${travelingToLocation})`, { console: true }, 'info');
        
        // Check if user is starting to travel (entering a new instance)
        if (location === 'traveling') {
            window.Logger?.log(`User is traveling, checking for auto invite...`, { console: true }, 'info');
            
            if (!Utils.isEmpty(this.autoInviteUser) && !Utils.isEmpty(travelingToLocation)) {
                // Only invite if we haven't already invited to this location
                if (this.lastInvitedTo !== travelingToLocation) {
                    const userName = `"${this.autoInviteUser?.displayName ?? this.autoInviteUser}"`;
                    
                    // Parse the traveling destination
                    let instanceId = travelingToLocation;
                    let worldId = travelingToLocation;
                    let worldName = '';
                    
                    // Try to get world name from VRCX
                    try {
                        worldName = await $app.getWorldName(worldId.split(':')[0]);
                    } catch (error) {
                        window.Logger?.log(`Failed to get world name: ${error.message}`, { console: true }, 'warning');
                        worldName = 'Unknown World';
                    }
                    
                    console.info(`Inviting user ${userName} to "${worldName}" (${instanceId})`);
                    window.Logger?.log(`Inviting user ${userName} to "${worldName}" (${instanceId})`, { console: true }, 'info');
                    
                    try {
                        API.sendInvite({ 
                            instanceId: instanceId, 
                            worldId: worldId.split(':')[0], 
                            worldName: worldName 
                        }, this.autoInviteUser.id);
                        
                        this.lastInvitedTo = travelingToLocation;
                        window.Logger?.log(`Successfully sent invite to ${userName}`, { console: true }, 'success');
                    } catch (error) {
                        window.Logger?.log(`Failed to send invite: ${error.message}`, { console: true }, 'error');
                    }
                } else {
                    window.Logger?.log(`Already invited user to this location: ${travelingToLocation}`, { console: true }, 'info');
                }
            } else if (Utils.isEmpty(this.autoInviteUser)) {
                window.Logger?.log(`No auto invite user selected`, { console: true }, 'info');
            } else if (Utils.isEmpty(travelingToLocation)) {
                window.Logger?.log(`No traveling destination provided`, { console: true }, 'warning');
            }
        } else if (location && location !== 'offline' && location !== 'private') {
            // User has arrived at a new location
            this.lastJoined = location;
            window.Logger?.log(`User arrived at: ${location}`, { console: true }, 'info');
            
            // Trigger registry overrides for instance switching
            if (window.customjs?.registryOverrides) {
                // Determine if this is a public or private instance
                const isPublic = location.includes('~public') || location.includes('~hidden');
                const eventType = isPublic ? 'INSTANCE_SWITCH_PUBLIC' : 'INSTANCE_SWITCH_PRIVATE';
                window.customjs.registryOverrides.triggerEvent(eventType);
            }
        }
    }

    toggleAutoInvite(user) {
        if (Utils.isEmpty(user) || (!Utils.isEmpty(this.autoInviteUser) && user.id === this.autoInviteUser?.id)) {
            window.Logger?.log(`Disabled Auto Invite for user ${this.autoInviteUser.displayName}`, { console: true, vrcx: { message: true } }, 'warning');
            this.autoInviteUser = null;
            this.customMenu.updateUserItem('autoInvite', { 
                text: 'Auto Invite',
                icon: 'el-icon-message'
            });
        } else {
            this.autoInviteUser = user;
            window.Logger?.log(`Enabled Auto Invite for user ${this.autoInviteUser.displayName}`, { console: true, vrcx: { message: true } }, 'success');
            this.customMenu.updateUserItem('autoInvite', { 
                text: `Auto Invite: ${this.autoInviteUser.displayName}`,
                icon: 'el-icon-message'
            });
        }
    }

    getAutoInviteUser() {
        return this.autoInviteUser;
    }

    // Debug method to check if the menu item is properly registered
    debugMenuStatus() {
        const status = {
            hasCustomMenu: !!this.customMenu,
            hasAutoInviteItem: !!this.autoInviteItem,
            userItemsCount: this.customMenu?.items?.get('user')?.size || 0,
            hasUserItems: this.customMenu?.hasItem('user', 'autoInvite') || false,
            processedMenus: this.customMenu?.processedMenus?.size || 0,
            menuContainers: this.customMenu?.menuContainers?.size || 0,
            autoInviteUser: this.autoInviteUser?.displayName || 'None',
            lastInvitedTo: this.lastInvitedTo || 'None',
            lastJoined: this.lastJoined || 'None'
        };
        
        console.log('Auto Invite Debug Status:', status);
        window.Logger?.log(`Auto Invite Debug: ${JSON.stringify(status)}`, { console: true }, 'info');
        
        return status;
    }

    // Debug method to manually test location change
    debugLocationChange(location, travelingTo) {
        console.log(`Manual location change test: ${location} -> ${travelingTo}`);
        this.onCurrentUserLocationChanged(location, travelingTo);
    }

    // Method to manually trigger menu setup (for debugging)
    reinitializeMenu() {
        window.Logger?.log('Manually reinitializing Auto Invite menu...', { console: true }, 'info');
        this.setupUserButton();
        return this.debugMenuStatus();
    }
}

// Auto-initialize the module
(function() {
    // Register this module in the global namespace
    window.customjs = window.customjs || {};
    window.customjs.autoInviteManager = new AutoInviteManager();
    window.customjs.script = window.customjs.script || {};
    window.customjs.script.autoInvite = AutoInviteManager.SCRIPT;
    
    // Also make AutoInviteManager available globally for backward compatibility
    window.AutoInviteManager = AutoInviteManager;
    
    // Add debug functions to global scope for easy console access
    window.debugAutoInvite = () => window.customjs.autoInviteManager.debugMenuStatus();
    window.reinitAutoInvite = () => window.customjs.autoInviteManager.reinitializeMenu();
    window.testAutoInviteLocation = (location, travelingTo) => window.customjs.autoInviteManager.debugLocationChange(location, travelingTo);
    
    console.log(`✓ Loaded ${AutoInviteManager.SCRIPT.name} v${AutoInviteManager.SCRIPT.version} by ${AutoInviteManager.SCRIPT.author}`);
    
    // Run initial debug check after a short delay
    setTimeout(() => {
        window.customjs.autoInviteManager.debugMenuStatus();
    }, 1000);
})();
