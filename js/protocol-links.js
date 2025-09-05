// ============================================================================
// VRCX PROTOCOL LINKS MODULE
// ============================================================================

class VRCXProtocolLinks {
    static SCRIPT = {
        name: "VRCX Protocol Links Module",
        description: "Adds context menu items to copy VRCX protocol links for users, avatars, worlds, groups, and instances",
        author: "Bluscream",
        version: "1.0.0",
        dependencies: [
            "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/context-menu.js"
        ]
    };

    constructor() {
        this.contextMenu = null;
        this.init();
    }

    init() {
        // Wait for context menu module to be available
        this.waitForContextMenu();
    }

    waitForContextMenu() {
        const checkInterval = setInterval(() => {
            if (window.customjs && window.customjs.contextMenu) {
                clearInterval(checkInterval);
                this.contextMenu = window.customjs.contextMenu;
                this.setupContextMenuItems();
                window.Logger?.log(`✓ ${VRCXProtocolLinks.SCRIPT.name} initialized`, { console: true }, 'success');
            }
        }, 100);

        // Timeout after 10 seconds
        setTimeout(() => {
            clearInterval(checkInterval);
            if (!this.contextMenu) {
                window.Logger?.log(`Failed to initialize ${VRCXProtocolLinks.SCRIPT.name}: Context menu module not found`, { console: true }, 'error');
                window.Logger?.log(`Available modules: ${JSON.stringify(Object.keys(window.customjs || {}))}`, { console: true }, 'error');
            }
        }, 10000);
    }

    setupContextMenuItems() {
        window.Logger?.log('Setting up protocol links context menu items...', { console: true }, 'info');
        
        // User dialog items
        const userLinkResult = this.contextMenu.addUserItem('copy-user-link', {
            text: 'Copy User Link',
            icon: 'el-icon-link',
            onClick: (userData) => this.copyUserLink(userData)
        });
        window.Logger?.log(`User link item result: ${JSON.stringify(userLinkResult)}`, { console: true }, 'info');

        this.contextMenu.addUserItem('copy-user-import', {
            text: 'Copy User Import Link',
            icon: 'el-icon-download',
            onClick: (userData) => this.copyUserImportLink(userData)
        });

        // Avatar dialog items
        this.contextMenu.addAvatarItem('copy-avatar-link', {
            text: 'Copy Avatar Link',
            icon: 'el-icon-link',
            onClick: (avatarData) => this.copyAvatarLink(avatarData)
        });

        this.contextMenu.addAvatarItem('copy-avatar-import', {
            text: 'Copy Avatar Import Link',
            icon: 'el-icon-download',
            onClick: (avatarData) => this.copyAvatarImportLink(avatarData)
        });

        // World dialog items
        this.contextMenu.addWorldItem('copy-world-link', {
            text: 'Copy World Link',
            icon: 'el-icon-link',
            onClick: (worldData) => this.copyWorldLink(worldData)
        });

        this.contextMenu.addWorldItem('copy-world-import', {
            text: 'Copy World Import Link',
            icon: 'el-icon-download',
            onClick: (worldData) => this.copyWorldImportLink(worldData)
        });

        // Group dialog items
        this.contextMenu.addGroupItem('copy-group-link', {
            text: 'Copy Group Link',
            icon: 'el-icon-link',
            onClick: (groupData) => this.copyGroupLink(groupData)
        });

        // Note: Instance context items removed as they don't have a proper context menu in VRCX
        // Instance links should be handled through world dialogs instead

        window.Logger?.log('VRCX Protocol Links context menu items added', { console: true }, 'success');
    }

    // Copy functions for different protocol types
    copyUserLink(userData) {
        if (!userData || !userData.id) {
            this.showError('No user data available');
            return;
        }

        const link = `vrcx://user/${userData.id}`;
        this.copyToClipboard(link, 'User link');
    }

    copyUserImportLink(userData) {
        if (!userData || !userData.id) {
            this.showError('No user data available');
            return;
        }

        const link = `vrcx://import/friend/${userData.id}`;
        this.copyToClipboard(link, 'User import link');
    }

    copyAvatarLink(avatarData) {
        if (!avatarData || !avatarData.id) {
            this.showError('No avatar data available');
            return;
        }

        const link = `vrcx://avatar/${avatarData.id}`;
        this.copyToClipboard(link, 'Avatar link');
    }

    copyAvatarImportLink(avatarData) {
        if (!avatarData || !avatarData.id) {
            this.showError('No avatar data available');
            return;
        }

        const link = `vrcx://import/avatar/${avatarData.id}`;
        this.copyToClipboard(link, 'Avatar import link');
    }

    copyWorldLink(worldData) {
        if (!worldData || !worldData.id) {
            this.showError('No world data available');
            return;
        }

        const link = `vrcx://world/${worldData.id}`;
        this.copyToClipboard(link, 'World link');
    }

    copyWorldImportLink(worldData) {
        if (!worldData || !worldData.id) {
            this.showError('No world data available');
            return;
        }

        const link = `vrcx://import/world/${worldData.id}`;
        this.copyToClipboard(link, 'World import link');
    }

    copyGroupLink(groupData) {
        if (!groupData || !groupData.id) {
            this.showError('No group data available');
            return;
        }

        const link = `vrcx://group/${groupData.id}`;
        this.copyToClipboard(link, 'Group link');
    }

    // Instance link functionality removed - use world dialog instead

    // Utility functions
    async copyToClipboard(text, description) {
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(text);
            } else {
                // Fallback for non-secure contexts
                const textArea = document.createElement('textarea');
                textArea.value = text;
                textArea.style.position = 'fixed';
                textArea.style.left = '-999999px';
                textArea.style.top = '-999999px';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                document.execCommand('copy');
                textArea.remove();
            }
            
            this.showSuccess(`${description} copied to clipboard: ${text}`);
        } catch (error) {
            window.Logger?.log(`Failed to copy to clipboard: ${error.message}`, { console: true }, 'error');
            this.showError(`Failed to copy ${description.toLowerCase()}`);
        }
    }

    showSuccess(message) {
        // Use VRCX's notification system if available
        if (window.$app && window.$app.$message) {
            window.$app.$message.success(message);
        } else {
            window.Logger?.log(`✓ ${message}`, { console: true }, 'success');
        }
    }

    showError(message) {
        // Use VRCX's notification system if available
        if (window.$app && window.$app.$message) {
            window.$app.$message.error(message);
        } else {
            window.Logger?.log(`✗ ${message}`, { console: true }, 'error');
        }
    }

    // Method to add custom avatar database provider link
    addAvatarDatabaseProvider(url) {
        const link = `vrcx://addavatardb/${url}`;
        this.copyToClipboard(link, 'Avatar database provider link');
    }

    // Method to create multi-item import links
    createMultiImportLink(type, ids) {
        if (!Array.isArray(ids) || ids.length === 0) {
            this.showError('No IDs provided for import');
            return;
        }

        const validTypes = ['avatar', 'world', 'friend'];
        if (!validTypes.includes(type)) {
            this.showError(`Invalid import type. Must be one of: ${validTypes.join(', ')}`);
            return;
        }

        const link = `vrcx://import/${type}/${ids.join(',')}`;
        this.copyToClipboard(link, `${type} import link (${ids.length} items)`);
    }
}

// Auto-initialize the module
(function() {
    // Register this module in the global namespace
    window.customjs = window.customjs || {};
    window.customjs.protocolLinks = new VRCXProtocolLinks();
    window.customjs.script = window.customjs.script || {};
    window.customjs.script.protocolLinks = VRCXProtocolLinks.SCRIPT;
    
    console.log(`✓ Loaded ${VRCXProtocolLinks.SCRIPT.name} v${VRCXProtocolLinks.SCRIPT.version} by ${VRCXProtocolLinks.SCRIPT.author}`);
})();
