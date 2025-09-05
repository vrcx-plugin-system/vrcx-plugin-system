// ============================================================================
// BIO MANAGEMENT SYSTEM
// ============================================================================

class BioUpdater {
    static SCRIPT = {
        name: "Bio Updater Module",
        description: "Automatic bio updating with user statistics and custom templates",
        author: "Bluscream",
        version: "1.0.0",
        dependencies: [
            "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/config.js",
            "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/api-helpers.js",
            "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/utils.js"
        ]
    };
    constructor() {
        this.updateInterval = null;
        this.init();
    }

    init() {
        this.updateInterval = setInterval(async () => { await this.updateBio(); }, CONFIG.bio.updateInterval);
        setTimeout(async () => { await this.updateBio(); }, CONFIG.bio.initialDelay);
    }

    async updateBio() {
        try {
            const now = Date.now();
            const stats = await window.database.getUserStats({'id': $app.store.user.currentUser.id});
            const oldBio = $app.store.user.currentUser.bio.split("\n-\n")[0];
            const steamPlayTime = await Utils.getSteamPlaytime(CONFIG.steam.id, CONFIG.steam.key);
            
            let steamHours, steamSeconds = null;
            if (steamPlayTime) {
                steamHours = `${Math.floor(steamPlayTime / 60).toString().padStart(2, '0')}h`;
                steamSeconds = (steamPlayTime * 60 * 1000);
            }
            
            let playTimeText = Utils.timeToText(steamSeconds ?? stats.timeSpent);
            if (steamHours) playTimeText += ` (${steamHours})`;
            
            const moderations = Array.from($app.store.moderation.cachedPlayerModerations.values());
            const last_activity = new Date($app.store.user.currentUser.last_activity);
            const favs = Array.from($app.store.favorite.favoriteFriends.values())
            const joiners = favs.filter(friend => friend.groupKey === "friend:group_2");
            const partners = favs.filter(friend => friend.groupKey === "friend:group_1");
            
            const newBio = CONFIG.bio.template
                .replace('{last_activity}', Utils.timeToText(now-last_activity) ?? "")
                .replace('{playtime}', playTimeText)
                .replace('{date_joined}', $app.store.user.currentUser.date_joined ?? "Unknown")
                .replace('{friends}', $app.store.user.currentUser.friends.length ?? "?")
                .replace('{blocked}', moderations.filter(item => item.type === "block").length ?? "?")
                .replace('{muted}', moderations.filter(item => item.type === "mute").length ?? "?")
                .replace('{now}', Utils.formatDateTime())
                .replace('{autojoin}', joiners.map(f => f.name).join(", "))
                .replace('{partners}', partners.map(f => f.name).join(", "))
                .replace('{autoinvite}', window.customjs?.autoInviteManager?.getAutoInviteUser()?.displayName ?? '')
                .replace('{tags_loaded}', window.customjs?.tagManager ? window.customjs.tagManager.getLoadedTagsCount() : 0)
                .replace('{userId}', $app.store.user.currentUser.id)
                .replace('{steamId}', $app.store.user.currentUser.steamId)
                .replace('{oculusId}', $app.store.user.currentUser.oculusId)
                .replace('{picoId}', $app.store.user.currentUser.picoId)
                .replace('{viveId}', $app.store.user.currentUser.viveId)
                .replace('{rank}', $app.store.user.currentUser.$trustLevel)
            
            const bio = oldBio + newBio;
            console.log(`Updating bio to ${bio}`)
            await API.saveBio(bio);
        } catch (error) {
            console.error('Error updating bio:', error);
        }
    }
}

// Auto-initialize the module
(function() {
    // Register this module in the global namespace
    window.customjs = window.customjs || {};
    window.customjs.bioUpdater = new BioUpdater();
    window.customjs.script = window.customjs.script || {};
//     window.customjs.script.bioUpdater = SCRIPT;
    
    // Also make BioUpdater available globally for backward compatibility
    window.BioUpdater = BioUpdater;
    
    console.log(`✓ Loaded ${SCRIPT.name} v${SCRIPT.version} by ${SCRIPT.author}`);
})();
