// ============================================================================
// AUTO INVITE MANAGEMENT
// ============================================================================

const SCRIPT = {
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

class AutoInviteManager {
    constructor() {
        this.autoInviteUser = null;
        this.lastInvitedTo = null;
        this.lastJoined = null;
        this.customMenu = new CustomContextMenu();
        this.autoInviteItem = null;
        this.setupLocationTracking();
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
        this.autoInviteItem = this.customMenu.addUserItem('autoInvite', {
            text: 'Auto Invite',
            icon: 'el-icon-message',
            onClick: (user) => this.toggleAutoInvite(user)
        });
    }

    async onCurrentUserLocationChanged(loc) {
        console.log(`User Location changed to: ${loc}`)
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
                Logger.log(`Inviting user ${userName} to "${n}"`, false)
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
            Logger.log(`Disabled Auto Invite for user ${this.autoInviteUser.displayName}`);
            this.autoInviteUser = null;
            this.customMenu.updateUserItem('autoInvite', { 
                text: 'Auto Invite',
                icon: 'el-icon-message'
            });
        } else {
            this.autoInviteUser = user;
            Logger.log(`Enabled Auto Invite for user ${this.autoInviteUser.displayName}`);
            this.customMenu.updateUserItem('autoInvite', { 
                text: `Auto Invite: ${this.autoInviteUser.displayName}`,
                icon: 'el-icon-message'
            });
        }
    }

    getAutoInviteUser() {
        return this.autoInviteUser;
    }
}

// Auto-initialize the module
(function() {
    // Register this module in the global namespace
    window.customjs = window.customjs || {};
    window.customjs.autoInviteManager = new AutoInviteManager();
    window.customjs.script = window.customjs.script || {};
    window.customjs.script.autoInvite = SCRIPT;
    
    // Also make AutoInviteManager available globally for backward compatibility
    window.AutoInviteManager = AutoInviteManager;
    
    console.log(`✓ Loaded ${SCRIPT.name} v${SCRIPT.version} by ${SCRIPT.author}`);
})();
