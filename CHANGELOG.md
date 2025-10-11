# VRCX Custom Plugins - Changelog

## 2025-10-11 - Major Update for New VRCX Architecture

### Fixed Issues

#### 1. ✅ Theme Compatibility

- **Issue**: "Invalid theme mode: material3" error
- **Fix**: Added migration notice to update script
- **Action Required**: Change theme to `dark`, `darkblue`, `amoled`, `light`, or `system` in VRCX Settings

#### 2. ✅ Store Access Errors

- **Issue**: `Cannot read properties of undefined (reading 'vrcx')`
- **Fix**: Updated all modules to use new Pinia store structure (`window.$pinia.*`)
- **Files Updated**: api-helpers.js, managers.js, bio-updater.js, context-menu.js, tag-manager.js

#### 3. ✅ Backup Initialization Errors

- **Issue**: `bak.SendIpc is not a function`
- **Fix**:
  - Implemented lazy initialization with retry mechanism
  - Properly bound `SendIpc` to `AppApi` context
  - Exposed `ApiHelpers` class for manual backup initialization
- **Result**: "✓ Backups initialized successfully" now appears in console

#### 4. ✅ IPC API Signature Mismatch

- **Issue**: `System.InvalidOperationException: Could not execute method: SendIpc(System.Dynamic.ExpandoObject...)`
- **Fix**: Updated `SendIpc` calls to use correct signature: `SendIpc(string type, string data)`
- **Old**: `AppApi.SendIpc({ MsgType: "Noty", Data: "message" })`
- **New**: `AppApi.SendIpc("Noty", "message")`

#### 5. ✅ XSOverlay Notification Errors

- **Issue**: `XSNotification(...) - Missing Parameters: 2`
- **Fix**: Added all required parameters to XSNotification calls
- **Old**: `AppApi.XSNotification("title", "message", 5000)`
- **New**: `AppApi.XSNotification("title", "message", 5000, 1.0, "")`

#### 6. ✅ Notification Override Warning

- **Issue**: "$app.playNoty not available yet, skipping notification override"
- **Fix**: Implemented retry logic with 2-second delay
- **Result**: "✓ Notification override enabled" now appears when successful

### Updated Files

1. **js/api-helpers.js**

   - Fixed backup initialization with retry mechanism
   - Fixed SendIpc API calls
   - Fixed XSNotification API calls
   - Updated all store references to Pinia

2. **js/managers.js**

   - Added retry logic for notification override
   - Fixed IPC logging initialization
   - Updated all store references to Pinia

3. **js/bio-updater.js**

   - Updated to use `window.$pinia.user.currentUser`
   - Updated store references for moderations and favorites

4. **js/context-menu.js**

   - Updated all dialog data access methods
   - Added fallback logic for backward compatibility

5. **js/tag-manager.js**

   - Updated tag application to use Pinia user store
   - Fixed friend and blocked player checks

6. **update.ps1**

   - Added theme compatibility warnings
   - Added migration summary at completion

7. **MIGRATION_NOTES.md** (NEW)

   - Comprehensive migration guide
   - API signature changes documented
   - Troubleshooting steps

8. **CHANGELOG.md** (NEW)
   - This file - detailed changelog

### Console Output (Expected Success Messages)

When plugins load successfully, you should see:

```
✓ Loaded Config Module v1.0.0 by Bluscream
✓ Loaded Utils Module v1.0.0 by Bluscream
✓ Backups initialized successfully
✓ Loaded API Helpers Module v1.0.0 by Bluscream
✓ Loaded Context Menu Module v1.0.0 by Bluscream
✓ Loaded VRCX Protocol Links Module v1.0.0 by Bluscream
✓ Loaded Registry Overrides Module v1.0.0 by Bluscream
✓ Loaded Tag Manager Module v1.0.0 by Bluscream
✓ Loaded Bio Updater Module v1.0.0 by Bluscream
✓ Loaded Auto Invite Module v1.0.0 by Bluscream
✓ Notification override enabled
✓ IPC logging enabled
✓ Loaded Managers Module v1.0.0 by Bluscream
Module loading complete. Loaded: 10, Failed: 0
```

### Known Limitations

1. **IPC Event Logging**: The `eventVrcxMessage` method is internal to vrcx store and cannot be overridden. IPC IN logging may not work the same way.

2. **Notification Override Timing**: The notification override may not initialize on first load if `$app.playNoty` isn't ready. The retry mechanism will attempt again after 2 seconds.

3. **Store Availability**: Some features require the Pinia stores to be fully initialized. Safety checks are in place, but timing issues may occur on very fast loads.

### Testing Checklist

After updating, verify:

- [x] No console errors on VRCX startup
- [x] Backups initialized successfully message
- [x] IPC logging enabled message
- [x] All 10 modules loaded successfully
- [ ] Custom tags load and display
- [ ] Bio updater works (if enabled)
- [ ] Context menus function properly
- [ ] Registry overrides apply (if configured)
- [ ] Debug tools accessible via `window.debugVRCX`

### Next Steps

1. Run `update.ps1` to deploy the fixes
2. Restart VRCX
3. Check browser console for success messages
4. Verify your theme is set correctly (not material3)
5. Test custom functionality (tags, bio updates, etc.)

### Support

If you encounter issues:

1. Check browser console (F12) for errors
2. Verify `window.$pinia` exists and contains stores
3. Check that `window.$pinia.user`, `window.$pinia.vrcx` are accessible
4. Try `window.customjs.apiHelpers.initBackups()` manually if needed
5. Use `window.debugVRCX` for troubleshooting

### Version Information

- **Update Date**: October 11, 2025
- **Modules Updated**: 10
- **Major Version Bump**: Pinia Store Migration
- **Breaking Changes**: Yes (API signatures, store access)
- **Backward Compatibility**: Partial (fallback logic in context-menu.js)
