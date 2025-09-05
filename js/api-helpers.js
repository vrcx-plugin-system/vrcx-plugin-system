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
        // Default options object with all logging methods enabled
        defaultOptions: {
            console: true,
            vrcx: {
                notify: true,
                message: true
            },
            event: {
                noty: true,
                external: true
            },
            desktop: true,
            xsoverlay: true,
            ovrtoolkit: true,
            webhook: true
        },

        log: function(msg, options = {}, level = 'info') {
            // Merge with default options, assuming false for missing properties
            const opts = {
                console: options.console ?? false,
                vrcx: {
                    notify: options.vrcx?.notify ?? false,
                    message: options.vrcx?.message ?? false
                },
                event: {
                    noty: options.event?.noty ?? false,
                    external: options.event?.external ?? false
                },
                desktop: options.desktop ?? false,
                xsoverlay: options.xsoverlay ?? false,
                ovrtoolkit: options.ovrtoolkit ?? false,
                webhook: options.webhook ?? false
            };

            // Add timestamp to longer messages
            const timestamp = new Date().toISOString();
            const timestampedMsg = msg.length > 50 ? `[${timestamp}] ${msg}` : msg;

            // Console logging using the specified level
            if (opts.console) {
                if (typeof console[level] === 'function') {
                    console[level](timestampedMsg);
                } else {
                    console.log(timestampedMsg);
                }
            }

            // VRCX event logging
            if (opts.event.noty) {
                $app.store.vrcx.eventVrcxMessage({'MsgType': 'Noty', 'Data': timestampedMsg });
            }
            if (opts.event.external) {
                $app.store.vrcx.eventVrcxMessage({'MsgType': 'External', 'UserId': $app.store.user.currentUser.id, 'Data': timestampedMsg });
            }

            // Desktop notifications
            if (opts.desktop) {
                setTimeout(async () => { 
                    try {
                        await AppApi.DesktopNotification("VRCX Addon", timestampedMsg);
                    } catch (error) {
                        console.error('Error sending desktop notification:', error);
                    }
                }, 0);
            }

            // XSOverlay notifications
            if (opts.xsoverlay) {
                setTimeout(async () => { 
                    try {
                        await AppApi.XSNotification("VRCX Addon", timestampedMsg, 5000);
                    } catch (error) {
                        console.error('Error sending XSOverlay notification:', error);
                    }
                }, 0);
            }

            // OVRToolkit notifications
            if (opts.ovrtoolkit) {
                setTimeout(async () => { 
                    try {
                        await AppApi.OVRTNotification(true, true, "VRCX Addon", timestampedMsg, 5000, 1.0, null);
                    } catch (error) {
                        console.error('Error sending OVRToolkit notification:', error);
                    }
                }, 0);
            }

            // VRCX UI notifications
            if (opts.vrcx.notify && window.$app && window.$app.$notify) {
                try {
                    const notifyMethod = window.$app.$notify[level];
                    if (typeof notifyMethod === 'function') {
                        notifyMethod({
                            title: 'VRCX Addon',
                            message: msg,
                            type: level
                        });
                    } else {
                        window.$app.$notify.info({
                            title: 'VRCX Addon',
                            message: msg,
                            type: 'info'
                        });
                    }
                } catch (error) {
                    console.error('Error sending VRCX notify:', error);
                }
            }

            // VRCX message toasts
            if (opts.vrcx.message && window.$app && window.$app.$message) {
                try {
                    const messageMethod = window.$app.$message[level];
                    if (typeof messageMethod === 'function') {
                        messageMethod(msg);
                    } else {
                        window.$app.$message.info(msg);
                    }
                } catch (error) {
                    console.error('Error sending VRCX message:', error);
                }
            }

            // Webhook notifications
            if (opts.webhook) {
                setTimeout(async () => {
                    try {
                        const webhookUrl = window.customjs?.config?.webhook;
                        if (webhookUrl) {
                            const payload = {
                                message: msg,
                                level: level,
                                timestamp: timestamp,
                                source: 'VRCX-Addon'
                            };
                            
                            await fetch(webhookUrl, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                },
                                body: JSON.stringify(payload)
                            });
                        }
                    } catch (error) {
                        console.error('Error sending webhook notification:', error);
                    }
                }, 0);
            }
        },

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
            if (window.Logger?.log) {
                window.Logger.log(`Location object: ${JSON.stringify(loc)}`, { console: true }, 'info');
            }
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
