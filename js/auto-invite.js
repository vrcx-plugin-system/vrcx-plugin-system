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
        // Override setCurrentUserLocation to track location changes
        $app.setCurrentUserLocation = (loc) => {
            bak.setCurrentUserLocation();
            setTimeout(async () => { await this.onCurrentUserLocationChanged(loc) }, 1000);
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

    async onCurrentUserLocationChanged(loc) {
        window.Logger?.log(`User Location changed to: ${loc}`, { console: true }, 'info');
        if (loc === 'traveling:traveling') {
            if (!Utils.isEmpty(this.autoInviteUser) && this.lastInvitedTo !== loc) {
                const userName = `"${this.autoInviteUser?.displayName ?? this.autoInviteUser}"`;
                let n;
                let l = $app.lastLocationDestination;
                if (Utils.isEmpty(l)) {
                    l = $app.lastLocation.location;
                    n = $app.lastLocation.name;
                }
                if (Utils.isEmpty(n)) n = await $app.getWorldName(l);
                window.Logger?.log(`Inviting user ${userName} to "${n}"`, { console: true }, 'info');
                API.sendInvite({ instanceId: l, worldId: l, worldName: n }, this.autoInviteUser.id);
                this.lastInvitedTo = l;
            }
        } else {
            this.lastJoined = loc;
            
            // Trigger registry overrides for instance switching
            if (window.customjs?.registryOverrides) {
                // Determine if this is a public or private instance
                const isPublic = loc.includes('~public') || loc.includes('~hidden');
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
            menuContainers: this.customMenu?.menuContainers?.size || 0
        };
        
        console.log('Auto Invite Menu Debug Status:', status);
        window.Logger?.log(`Auto Invite Menu Debug: ${JSON.stringify(status)}`, { console: true }, 'info');
        
        return status;
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
    
    console.log(`✓ Loaded ${AutoInviteManager.SCRIPT.name} v${AutoInviteManager.SCRIPT.version} by ${AutoInviteManager.SCRIPT.author}`);
    
    // Run initial debug check after a short delay
    setTimeout(() => {
        window.customjs.autoInviteManager.debugMenuStatus();
    }, 1000);
})();
