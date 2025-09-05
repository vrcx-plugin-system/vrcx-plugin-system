// ============================================================================
// API WRAPPERS & HELPERS
// ============================================================================

// API Helpers class containing all API-related functionality
class ApiHelpers {
    static SCRIPT = {
        name: "API Helpers Module",
        description: "API wrapper functions, logging, and location management for VRCX custom modules",
        author: "Bluscream",
        version: "1.0.0",
        dependencies: [
            "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/utils.js"
        ]
    };

    // Backup original functions
    static bak = {
        updateCurrentUserLocation: $app.updateCurrentUserLocation,
        setCurrentUserLocation: $app.setCurrentUserLocation,
        applyWorldDialogInstances: $app.applyWorldDialogInstances,
        applyGroupDialogInstances: $app.applyGroupDialogInstances,
        eventVrcxMessage: $app.store.vrcx.eventVrcxMessage,
        playNoty: $app.playNoty,
        getInstance: window.request.instanceRequest.getInstance,
        SendIpc: AppApi.SendIpc
    };

    // API wrapper functions
    static API = {
        seeNotification: function(params, emit = true) {
            return window.request.request(
                `auth/user/notifications/${params.notificationId}/see`,
                { method: 'PUT' }
            ).then((json) => {
                const args = { json, params };
                if (emit) window.request.request.$emit('NOTIFICATION:SEE', args);
                return args;
            });
        },

        hideNotification: function(params, emit = true) {
            return window.request.notificationRequest.hideNotification(params);
        },

        sendInvite: function(params, receiverUserId) {
            return window.request.notificationRequest.sendInvite(params, receiverUserId);
        },

        saveCurrentUser: function(params) {
            return window.request.userRequest.saveCurrentUser(params);
        },

        saveBio: function(bio, bioLinks) {
            return ApiHelpers.API.saveCurrentUser({
                bio: bio ?? $app.store.user.currentUser.bio,
                bioLinks: bioLinks ?? $app.store.user.currentUser.bioLinks
            });
        }
    };

    // ============================================================================
    // LOGGING & NOTIFICATIONS
    // ============================================================================

    static Logger = {
        log: function(msg, _alert = true, _notify = false, _noty = false, _level = 'info') {
            console.log(msg);
            $app.store.vrcx.eventVrcxMessage({'MsgType': 'Noty', 'Data': msg });
            $app.store.vrcx.eventVrcxMessage({'MsgType': 'External', 'UserId': $app.store.user.currentUser.id, 'Data': msg });
            if (_notify) ApiHelpers.Logger.notify("VRCX Addon", msg);
            if (_noty) {
                setTimeout(async () => { await AppApi.DesktopNotification("VRCX Addon", msg) }, 0);
            }
            if (_alert && window.$app && window.$app.$message) {
                // Call the appropriate toast method based on _level
                const toastMethod = window.$app.$message[_level];
                if (typeof toastMethod === 'function') {
                    toastMethod(msg);
                } else {
                    // Fallback to info if the method doesn't exist
                    window.$app.$message.info(msg);
                }
            }
        },

        notify: function(title, msg) {
            (async () => {
                try {
                    await AppApi.DesktopNotification(title, msg);
                    // XSNotification requires additional parameters - let's skip it for now
                    // await AppApi.XSNotification(title, msg, 5000);
                    await AppApi.OVRTNotification(true, true, title, msg, 5000, 1.0, null);
                } catch (error) {
                    console.error('Error sending notification:', error);
                }
            })();
        }
    };

    // ============================================================================
    // LOCATION & WORLD MANAGEMENT
    // ============================================================================

    static LocationManager = {
        getLocationObject: async function(loc) {
            if (typeof loc === 'string') {
                if (loc.endsWith(')')) loc = $app.parseLocation(loc);
                else if (loc.startsWith('wrld')) loc = { worldId: loc, world: { id: loc } }
                else loc = { instanceId: loc, instance: { id: loc } }
            } else if (Utils.isEmpty(loc) || loc === 'traveling:traveling') {
                return;
            }
            if (Utils.isEmpty(loc) && !Utils.isEmpty($app.lastLocation)) this.getLocationObject($app.lastLocation);
            if (Utils.isEmpty(loc) && !Utils.isEmpty($app.lastLocationDestination)) this.getLocationObject($app.lastLocationDestination);
            loc.worldName = await $app.getWorldName(loc);
            console.log(loc);
            return loc;
        }
    };
}

// Auto-initialize the module
(function() {
    // Register this module in the global namespace
    window.customjs = window.customjs || {};
    window.customjs.api = ApiHelpers.API;
    window.customjs.logger = ApiHelpers.Logger;
    window.customjs.location = ApiHelpers.LocationManager;
    window.customjs.script = window.customjs.script || {};
    window.customjs.script.apiHelpers = ApiHelpers.SCRIPT;
    
    // Also make objects available globally for backward compatibility
    window.bak = ApiHelpers.bak;
    window.API = ApiHelpers.API;
    window.Logger = ApiHelpers.Logger;
    window.LocationManager = ApiHelpers.LocationManager;
    
    console.log(`✓ Loaded ${ApiHelpers.SCRIPT.name} v${ApiHelpers.SCRIPT.version} by ${ApiHelpers.SCRIPT.author}`);
})();
