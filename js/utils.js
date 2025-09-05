// ============================================================================
// UTILITY CLASSES
// ============================================================================

const SCRIPT = {
    name: "Utils Module",
    description: "Utility classes and helper functions for VRCX custom modules",
    author: "Bluscream",
    version: "1.0.0",
    dependencies: []
};

// Utils class for common utility functions
class Utils {
    static isEmpty(v) {
        return v === null || v === undefined || v === ""
    }

    static timeToText(ms) {
        if (!ms || ms < 0) return '0s';
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        
        if (days > 0) return `${days}d ${hours % 24}h`;
        if (hours > 0) return `${hours}h ${minutes % 60}m`;
        if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
        return `${seconds}s`;
    }

    static getTimestamp(now = null) {
        now = now ?? new Date();
        const timestamp = now.toLocaleString('en-US', {
            year: 'numeric',
            month: '2-digit', 
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });
        return timestamp;
    }

    static formatDateTime(now = null) {
        now = now ?? new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds} GMT+1`;
    }

    static async getSteamPlaytime(steamId, apiKey) {
        try {
            if (!steamId) {
                console.log("No Steam ID found");
                return null;
            }
            const response = await fetch(`https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?key=${apiKey}&steamid=${steamId}&appids_filter[0]=438100`);
            const data = await response.json();
            if (!data?.response?.games?.[0]) {
                console.log("No VRChat playtime data found");
                return null;
            }
            const playtimeMinutes = data.response.games[0].playtime_forever;
            console.log(`Got Steam playtime for vrchat: ${playtimeMinutes} minutes`)
            return playtimeMinutes;
        } catch (error) {
            console.error("Error getting Steam playtime:", error);
            return null;
        }
    }
}

// Global registry to track processed menus
const processedMenus = new Set();

// Utility function to clear the processed menus registry (useful for debugging)
function clearProcessedMenus() {
    processedMenus.clear();
    console.log('Cleared processed menus registry');
}

// Auto-initialize the module
(function() {
    // Register this module in the global namespace
    window.customjs = window.customjs || {};
    window.customjs.utils = Utils;
    window.customjs.clearProcessedMenus = clearProcessedMenus;
    window.customjs.script = window.customjs.script || {};
    window.customjs.script.utils = SCRIPT;
    
    // Also make Utils available globally for backward compatibility
    window.Utils = Utils;
    window.clearProcessedMenus = clearProcessedMenus;
    
    console.log(`✓ Loaded ${SCRIPT.name} v${SCRIPT.version} by ${SCRIPT.author}`);
})();
