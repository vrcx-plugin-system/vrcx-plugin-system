// ============================================================================
// API WRAPPERS & HELPERS
// ============================================================================

const SCRIPT = {
    name: "API Helpers Module",
    description: "API wrapper functions, logging, and location management for VRCX custom modules",
    author: "Bluscream",
    version: "1.0.0",
    dependencies: [
        "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/utils.js"
    ]
};

// Backup original functions
const bak = {
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
const API = {
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
        return API.saveCurrentUser({
            bio: bio ?? $app.store.user.currentUser.bio,
            bioLinks: bioLinks ?? $app.store.user.currentUser.bioLinks
        });
    }
};

// ============================================================================
// LOGGING & NOTIFICATIONS
// ============================================================================

const Logger = {
    log: function(msg, _alert = true, _notify = false, _noty = false, _noty_type = 'alert') {
        console.log(msg);
        $app.store.vrcx.eventVrcxMessage({'MsgType': 'Noty', 'Data': msg });
        $app.store.vrcx.eventVrcxMessage({'MsgType': 'External', 'UserId': $app.store.user.currentUser.id, 'Data': msg });
        if (_notify) this.notify("VRCX Addon", msg);
        if (_noty) {
            setTimeout(async () => { await AppApi.DesktopNotification("VRCX Addon", msg) }, 0);
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

const LocationManager = {
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

// Auto-initialize the module
(function() {
    // Register this module in the global namespace
    window.customjs = window.customjs || {};
    window.customjs.api = API;
    window.customjs.logger = Logger;
    window.customjs.location = LocationManager;
    window.customjs.script = window.customjs.script || {};
    window.customjs.script.apiHelpers = SCRIPT;
    
    // Also make objects available globally for backward compatibility
    window.bak = bak;
    window.API = API;
    window.Logger = Logger;
    window.LocationManager = LocationManager;
    
    console.log(`✓ Loaded ${SCRIPT.name} v${SCRIPT.version} by ${SCRIPT.author}`);
})();
