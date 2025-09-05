// ============================================================================
// CUSTOM TAGS MANAGEMENT
// ============================================================================

class CustomTagManager {
    static SCRIPT = {
        name: "Tag Manager Module",
        description: "Custom user tags management with URL-based loading",
        author: "Bluscream",
        version: "1.0.0",
        dependencies: [
            "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/config.js",
            "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/api-helpers.js",
            "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/utils.js"
        ]
    };
    constructor() {
        this.loadedTags = new Map(); // Map of URL -> Set of tag objects
        this.updateInterval = null;
        this.init();
    }

    init() {
        // Start the tag loading process
        setTimeout(async () => {
            await this.loadAllTags();
            this.startPeriodicUpdates();
            
            // Log startup message if Utils and Logger are available
            try {
                const timestamp = window.Utils?.getTimestamp ? window.Utils.getTimestamp() : new Date().toISOString();
                const msg = `VRCX-Utils started at\n ${timestamp}`;
                if (window.Logger?.log) {
                    window.Logger.log(msg, window.Logger.defaultOptions, 'info');
                } else {
                    console.log(msg);
                }
            } catch (error) {
                console.log('VRCX-Utils started at', new Date().toISOString());
            }
        }, window.customjs?.config?.tags?.initialDelay || 5000);
    }

    async loadAllTags() {
        const tagConfig = window.customjs?.config?.tags;
        
        
        if (!tagConfig?.urls || tagConfig.urls.length === 0) {
            if (window.Logger?.log) {
                window.Logger.log('No tag URLs configured', { console: true }, 'warning');
            }
            return;
        }

        if (window.Logger?.log) {
            window.Logger.log(`Loading tags from ${tagConfig.urls.length} URL(s)...`, { console: true }, 'info');
        }
        
        for (const url of tagConfig.urls) {
            try {
                await this.loadTagsFromUrl(url);
            } catch (error) {
                if (window.Logger?.log) {
                    window.Logger.log(`Failed to load tags from ${url}: ${error.message}`, { console: true }, 'error');
                }
            }
        }
    }

    async loadTagsFromUrl(url) {
        try {
            if (window.Logger?.log) {
                window.Logger.log(`Fetching tags from: ${url}`, { console: true }, 'info');
            }
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            const tags = this.parseTagData(data, url);
            
            if (tags.length > 0) {
                this.loadedTags.set(url, new Set(tags));
                await this.applyTags(tags);
                if (window.Logger?.log) {
                    window.Logger.log(`Loaded ${tags.length} tags from ${url}`, { console: true }, 'success');
                }
            } else {
                if (window.Logger?.log) {
                    window.Logger.log(`No valid tags found in ${url}`, { console: true }, 'warning');
                }
            }
        } catch (error) {
            if (window.Logger?.log) {
                window.Logger.log(`Error loading tags from ${url}: ${error.message}`, { console: true }, 'error');
            }
            throw error;
        }
    }

    parseTagData(data, url) {
        const tags = [];
        
        // Handle FewTags format: object with user IDs as keys
        if (typeof data === 'object' && !Array.isArray(data)) {
            for (const [userId, userData] of Object.entries(data)) {
                if (userData && userData.tags && Array.isArray(userData.tags)) {
                    // Extract the main tag (usually the first one or specified tag)
                    const mainTag = userData.tag || userData.tags[0] || 'Custom Tag';
                    const tagColor = userData.foreground_color || '#FF00C6';
                    
                    // Add the main tag
                    tags.push({
                        UserId: userId,
                        Tag: this.cleanTagText(mainTag),
                        TagColour: tagColor
                    });
                    
                    // Optionally add individual tags from the tags array
                    // (uncomment if you want each tag as a separate entry)
                    /*
                    for (const tagText of userData.tags) {
                        tags.push({
                            UserId: userId,
                            Tag: this.cleanTagText(tagText),
                            TagColour: tagColor
                        });
                    }
                    */
                }
            }
        }
        // Handle alternative formats
        else if (Array.isArray(data)) {
            // Direct array of tags
            tags.push(...data);
        } else if (data.tags && Array.isArray(data.tags)) {
            // Object with tags property
            tags.push(...data.tags);
        } else if (data.data && Array.isArray(data.data)) {
            // Object with data property
            tags.push(...data.data);
        } else {
            if (window.Logger?.log) {
                window.Logger.log(`Unknown data structure in ${url}: ${JSON.stringify(data)}`, { console: true }, 'warning');
            }
            return [];
        }

        // Validate and filter tags
        return tags.filter(tag => this.validateTag(tag, url));
    }

    cleanTagText(tagText) {
        if (typeof tagText !== 'string') return 'Custom Tag';
        
        // Remove HTML-like color tags and formatting
        return tagText
            .replace(/<color=#[^>]*>/g, '')
            .replace(/<\/color>/g, '')
            .replace(/\*\*/g, '')
            .replace(/\*/g, '')
            .replace(/_/g, '')
            .trim();
    }

    validateTag(tag, url) {
        if (!tag || typeof tag !== 'object') {
            if (window.Logger?.log) {
                window.Logger.log(`Invalid tag object in ${url}: ${JSON.stringify(tag)}`, { console: true }, 'warning');
            }
            return false;
        }

        if (!tag.UserId || typeof tag.UserId !== 'string') {
            if (window.Logger?.log) {
                window.Logger.log(`Invalid UserId in tag from ${url}: ${JSON.stringify(tag)}`, { console: true }, 'warning');
            }
            return false;
        }

        if (!tag.Tag || typeof tag.Tag !== 'string') {
            if (window.Logger?.log) {
                window.Logger.log(`Invalid Tag in tag from ${url}: ${JSON.stringify(tag)}`, { console: true }, 'warning');
            }
            return false;
        }

        // Validate color if provided
        if (tag.TagColour && typeof tag.TagColour !== 'string') {
            if (window.Logger?.log) {
                window.Logger.log(`Invalid TagColour in tag from ${url}: ${JSON.stringify(tag)}`, { console: true }, 'warning');
            }
            return false;
        }

        // Set default color if not provided
        if (!tag.TagColour) {
            tag.TagColour = '#FF00C6';
        }

        return true;
    }

    async applyTags(tags) {
        for (const tag of tags) {
            try {
                // Check if tag already exists to avoid duplicates
                const existingTags = $app.store.user.customTags || new Map();
                const tagKey = `${tag.UserId}_${tag.Tag}`;
                
                if (!existingTags.has(tagKey)) {
                    $app.store.user.addCustomTag({
                        UserId: tag.UserId,
                        Tag: tag.Tag,
                        TagColour: tag.TagColour
                    });
                    // console.log(`Applied tag: ${tag.Tag} for user ${tag.UserId}`);
                }
            } catch (error) {
                if (window.Logger?.log) {
                    window.Logger.log(`Error applying tag for user ${tag.UserId}: ${error.message}`, { console: true }, 'error');
                }
            }
        }
        
        // After applying tags, check friends and blocked players for tags
        this.checkFriendsAndBlockedForTags();
    }

    checkFriendsAndBlockedForTags() {
        try {
            if (window.Logger?.log) {
                window.Logger.log('=== Checking Friends and Blocked Players for Tags ===', { console: true }, 'info');
            }
            
            // Check friends
            const friends = $app.store.user.currentUser?.friends || [];
            if (window.Logger?.log) {
                window.Logger.log(`Checking ${friends.length} friends for tags...`, { console: true }, 'info');
            }
            
            let taggedFriendsCount = 0;
            for (const friend of friends) {
                const friendTags = this.getUserTags(friend.id);
                if (friendTags.length > 0) {
                    taggedFriendsCount++;
                    const tagText = friendTags.map(tag => tag.Tag).join(', ');
                    if (window.Logger?.log) {
                        window.Logger.log(`👥 Friend: ${friend.displayName} (${friend.id}) - Tags: ${tagText}`, { console: true }, 'info');
                    }
                }
            }
            
            // Check blocked players
            const moderations = Array.from($app.store.moderation?.cachedPlayerModerations?.values() || []);
            const blockedPlayers = moderations.filter(item => item.type === "block");
            if (window.Logger?.log) {
                window.Logger.log(`Checking ${blockedPlayers.length} blocked players for tags...`, { console: true }, 'info');
            }
            
            let taggedBlockedCount = 0;
            for (const blocked of blockedPlayers) {
                const blockedTags = this.getUserTags(blocked.targetUserId);
                if (blockedTags.length > 0) {
                    taggedBlockedCount++;
                    const tagText = blockedTags.map(tag => tag.Tag).join(', ');
                    if (window.Logger?.log) {
                        window.Logger.log(`🚫 Blocked: ${blocked.targetDisplayName} (${blocked.targetUserId}) - Tags: ${tagText}`, { console: true }, 'info');
                    }
                }
            }
            
            // Summary
            if (window.Logger?.log) {
                window.Logger.log('=== Tag Summary ===', { console: true }, 'info');
                window.Logger.log(`Tagged Friends: ${taggedFriendsCount}/${friends.length}`, { console: true }, 'info');
                window.Logger.log(`Tagged Blocked: ${taggedBlockedCount}/${blockedPlayers.length}`, { console: true }, 'info');
                window.Logger.log(`Total Tagged Users: ${taggedFriendsCount + taggedBlockedCount}`, { console: true }, 'info');
            }
            
        } catch (error) {
            if (window.Logger?.log) {
                window.Logger.log(`Error checking friends and blocked players for tags: ${error.message}`, { console: true }, 'error');
            }
        }
    }

    getUserTags(userId) {
        const customTags = $app.store.user.customTags;
        if (!customTags || customTags.size === 0) {
            return [];
        }

        const userTags = [];
        for (const [tagKey, tagData] of customTags.entries()) {
            if (tagKey.startsWith(userId + '_')) {
                userTags.push(tagData);
            }
        }
        return userTags;
    }

    startPeriodicUpdates() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }

        this.updateInterval = setInterval(async () => {
            if (window.Logger?.log) {
                window.Logger.log('Updating tags from URLs...', { console: true }, 'info');
            }
            await this.loadAllTags();
        }, window.customjs?.config?.tags?.updateInterval || 3600000);
    }

    // Method to manually refresh tags
    async refreshTags() {
        if (window.Logger?.log) {
            window.Logger.log('Manually refreshing tags...', { console: true }, 'info');
        }
        await this.loadAllTags();
    }

    // Method to add a single tag manually
    addTag(userId, tag, color = '#FF00C6') {
        try {
            $app.store.user.addCustomTag({
                UserId: userId,
                Tag: tag,
                TagColour: color
            });
            if (window.Logger?.log) {
                window.Logger.log(`Manually added tag: ${tag} for user ${userId}`, { console: true }, 'success');
            }
        } catch (error) {
            if (window.Logger?.log) {
                window.Logger.log(`Error adding manual tag: ${error.message}`, { console: true }, 'error');
            }
        }
    }

    // Method to get loaded tags count
    getLoadedTagsCount() {
        let total = 0;
        for (const tagSet of this.loadedTags.values()) {
            total += tagSet.size;
        }
        return total;
    }

    // Method to get tags from specific URL
    getTagsFromUrl(url) {
        return this.loadedTags.get(url) || new Set();
    }

    // Cleanup method
    destroy() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        this.loadedTags.clear();
    }
}

// Auto-initialize the module
(function() {
    // Register this module in the global namespace
    window.customjs = window.customjs || {};
    window.customjs.tagManager = new CustomTagManager();
    window.customjs.script = window.customjs.script || {};
    window.customjs.script.tagManager = CustomTagManager.SCRIPT;
    
    // Also make CustomTagManager available globally for backward compatibility
    window.CustomTagManager = CustomTagManager;
    
    console.log(`✓ Loaded ${CustomTagManager.SCRIPT.name} v${CustomTagManager.SCRIPT.version} by ${CustomTagManager.SCRIPT.author}`);
})();
