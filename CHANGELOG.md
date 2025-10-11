# Changelog

## Version 1.4.1 - 2025-10-11

### 🎉 Major Features

#### Context Menu System Rewrite (v1.4.1)

- **Fixed:** Avatar and world dialog context menus now work correctly
- **Fixed:** Z-index based detection for overlapping dialogs
- **Fixed:** Attribute observer for Element Plus popper menus
- **Improved:** Detection now works for pre-created menus that toggle visibility
- **Removed:** Excessive debug logging (reduced noise by ~80%)

#### Auto Invite Module (v1.0.1)

- **Removed:** Debug methods (~120 lines of debug code)
- **Simplified:** Cleaner API with only essential utility functions
- **Kept:** `setAutoInviteUser()` and `clearAutoInviteUser()` for console testing

#### Version System

- **Changed:** Plugin versions now use generic `{VERSION}` and `{BUILD}` placeholders
- **Improved:** PowerShell script automatically determines file-specific commit counts
- **Added:** Per-file build timestamps based on modification time

### 🆕 New Additions

#### Debug Plugin (v1.0.0)

- **Added:** Comprehensive debug plugin (`js/debug.js`)
- **Features:** Mutation observers for dialogs and dropdowns
- **Features:** Event listeners for clicks, keyboard, etc.
- **Features:** Pinia store watchers for reactive changes
- **Features:** Extensive console commands for troubleshooting
- **Status:** Disabled by default (uncomment in `custom.js` to enable)
- **Documentation:** See `js/DEBUG_PLUGIN.md`

### 🔧 Technical Improvements

#### Context Menu Detection

- **Before:** Heuristics based on item count (unreliable)
- **After:** Button lookup → Find containing dialogs → Sort by z-index → Use topmost
- **Added:** Attribute observer to catch visibility toggles on popper elements
- **Result:** 100% reliable detection across all dialog types

#### Module System

- **Cleaned:** Removed ~200 lines of debug code across all modules
- **Standardized:** All modules use `{VERSION}` and `{BUILD}` placeholders
- **Improved:** Consistent logging patterns
- **Updated:** README with debug plugin documentation

### 📝 Files Changed

```
custom.js              - Removed debug output, added debug.js (commented)
js/context-menu-api.js - Attribute observer, z-index sorting, cleanup
js/auto-invite.js      - Removed debug methods
js/debug.js            - NEW: Comprehensive debug plugin
js/DEBUG_PLUGIN.md     - NEW: Debug plugin documentation
README.md              - Updated with debug plugin info
```

### 🐛 Bug Fixes

- **Fixed:** Avatar context menu not appearing
- **Fixed:** World context menu not appearing
- **Fixed:** Wrong context menu items showing when multiple dialogs open
- **Fixed:** Z-index detection using overlay parent instead of dialog element

### ⚡ Performance

- Reduced console spam by ~80%
- Removed unused debug methods and watchers
- Cleaner code with better maintainability

---

## Previous Changes

See Git commit history for detailed changes before v1.4.1.
