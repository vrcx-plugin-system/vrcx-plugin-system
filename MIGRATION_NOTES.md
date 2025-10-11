# VRCX Custom Plugins - Migration Notes

## Overview

These plugins have been updated to work with the new VRCX source structure that uses Pinia stores instead of Vuex.

## Breaking Changes in New VRCX

### 1. Store Structure Change

**Old:** `$app.store.user`, `$app.store.vrcx`, etc.  
**New:** `window.$pinia.user`, `window.$pinia.vrcx`, etc.

**Notification System Change:**  
**Old:** `$app.playNoty(notification)`  
**New:** `window.$pinia.notification.playNoty(notification)` - Now part of notification store

**Custom Tags Change:**  
**Old:** `$app.store.user.customTags`  
**New:** `window.$pinia.user.customUserTags` - Renamed property

**Friends Array Change:**  
**Old:** `friends[i].id` - Array of friend objects  
**New:** `friends[i]` - Array of userId strings directly

### 2. Removed Theme

The `material3` theme has been removed from the new VRCX. Available themes are:

- `system` (follows system dark mode)
- `light`
- `dark`
- `darkblue`
- `amoled`

If you see theme errors, change your theme in VRCX Settings → Appearance.

### 3. IPC and Notification API Changes

#### SendIpc

**Old:** `AppApi.SendIpc({ MsgType: "type", Data: "data" })`  
**New:** `AppApi.SendIpc("type", "data")` - Two string parameters

#### XSNotification

**Old:** `AppApi.XSNotification("title", "message", timeout)`  
**New:** `AppApi.XSNotification("title", "message", timeout, opacity, image)` - Requires 5 parameters

The `eventVrcxMessage` function is now internal to the vrcx store and cannot be easily overridden. IPC event logging functionality may work differently or be limited.

## Files Updated

### 1. `js/api-helpers.js`

- Changed backup initialization to lazy loading to avoid timing issues
- Updated `saveBio()` to use `window.$pinia.user` instead of `$app.store.user`
- Fixed `SendIpc()` calls to use new signature: `(string type, string data)`
- Fixed `XSNotification()` calls to include all required parameters: `(title, content, timeout, opacity, image)`
- Updated event logging to work with new IPC structure
- Added safety checks for store availability

### 2. `js/managers.js`

- **IMPORTANT**: Changed notification override from `$app.playNoty` to `window.$pinia.notification.playNoty`
- Updated `NotificationHandler` to work with Pinia notification store
- Changed `handleTaggedPlayerJoined()` to use `window.$pinia.user.customTags`
- Updated `DebugTools.setupIPCLogging()` to work with new structure
- Updated debug console functions to access `window.$pinia` stores
- Added `getStores()` helper to inspect all Pinia stores
- Fixed `autoInviteManager` references to use `window.customjs.autoInviteManager`

### 3. `js/bio-updater.js`

- Updated `updateBio()` to use `window.$pinia.user.currentUser`
- Updated references to moderation and favorite stores
- Added safety check for user availability

### 4. `js/context-menu.js`

- Updated all dialog data access methods to try new Pinia structure first
- Added fallback to old structure for compatibility
- Updated `getCurrentInstanceData()` to use `window.$pinia.location`

### 5. `js/tag-manager.js`

- **CRITICAL FIX**: Changed all `customTags` references to `customUserTags`
- **CRITICAL FIX**: Updated to handle friends as userId strings instead of objects
- Updated `applyTags()` to use `window.$pinia.user.customUserTags`
- Updated `checkFriendsAndBlockedForTags()` to use new store structure
- Updated `getUserTags()` to access `window.$pinia.user.customUserTags`
- Updated `addTag()` with safety checks for store availability
- Added `getFriendName()` helper to look up display names from cached users
- Added extensive debug logging to identify structure differences

### 6. `update.ps1`

- Added theme compatibility notice at script start
- Added detailed migration summary at script completion
- Warns users about key changes and how to troubleshoot

## Compatibility

### Backward Compatibility

The plugins maintain some backward compatibility by:

- Using optional chaining (`?.`) to safely access properties
- Providing fallback logic in some places (e.g., context-menu.js)
- Keeping global references like `window.bak`, `window.API`, etc.

### Forward Compatibility

The new structure is more robust with:

- Lazy initialization to handle timing issues
- Explicit safety checks before accessing stores
- Better error handling and logging

## Troubleshooting

### If you see errors about undefined stores:

1. Open browser console (F12) in VRCX
2. Check if `window.$pinia` exists
3. Verify the store you need exists: `window.$pinia.user`, `window.$pinia.vrcx`, etc.

### If theme errors appear:

1. Go to VRCX Settings → Appearance
2. Change theme to one of: dark, darkblue, amoled, light, or system
3. Restart VRCX

### If tags aren't loading:

1. Check browser console for errors
2. Verify `window.$pinia.user.addCustomTag` exists
3. Try `window.customjs.tagManager.refreshTags()` in console

## Testing

After updating, verify:

- [ ] No console errors on VRCX startup
- [ ] Custom tags load and display
- [ ] Bio updater works (if enabled)
- [ ] Context menus function properly
- [ ] Registry overrides apply (if configured)
- [ ] Debug tools are accessible via `window.debugVRCX`

## Additional Resources

- **New VRCX Source:** `vrcx-source/src/`
- **Pinia Store Definitions:** `vrcx-source/src/stores/`
- **Theme Configuration:** `vrcx-source/src/shared/constants/themes.js`

## Version Information

**Last Updated:** October 11, 2025  
**Compatible with:** New VRCX (Pinia-based architecture)  
**Previous Version:** Old VRCX (Vuex-based architecture)
