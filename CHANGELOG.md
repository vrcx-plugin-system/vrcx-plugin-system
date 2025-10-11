# Changelog

All notable changes to VRCX Custom Plugins are documented in this file.

## [1.5.0] - 2025-10-11

### 🎉 Major Features

#### Navigation Menu API - Automatic Tab Content Management (v1.2.0)

- **New:** Automatic content container creation and management
- **New:** Uses Pinia `$subscribe` to watch `menuActiveIndex` changes
- **New:** Supports HTMLElement, function, or string content types
- **New:** `on_login()` lifecycle hook for proper initialization timing
- **Fixed:** Content visibility now works correctly (reads from store, not state param)
- **Improved:** No manual visibility management required
- **Result:** ✅ 100% working custom navigation tabs

#### Plugin Manager UI - Complete Redesign (v1.2.0)

- **New:** Beautiful dashboard with gradient stat cards
- **New:** Load plugin from URL input (with Enter key support)
- **New:** Enhanced plugin cards showing version, build, author, description, dependencies
- **New:** Status badges with color coding (green=loaded, red=failed)
- **New:** 4 action buttons per plugin: Reload, Start, Stop, Unload
- **New:** Module inspector - click module instances to view details in console
- **New:** Click plugin URLs to copy to clipboard
- **New:** Hover effects with smooth transitions
- **Improved:** Uses Nav Menu API's automatic content management
- **Removed:** Manual panel creation and visibility logic (~60 lines removed)
- **Result:** Professional, feature-rich plugin management interface

#### Utils Module - Shared Utility Functions (v1.1.0)

- **New:** `Utils.copyToClipboard(text, description)` - Universal clipboard function
  - Works even when document isn't focused
  - Falls back to `document.execCommand('copy')` for reliability
  - Returns `true/false` for success/failure
- **New:** `Utils.showSuccess(message)` - Success notifications
- **New:** `Utils.showError(message)` - Error notifications
- **New:** `Utils.showInfo(message)` - Info notifications
- **Improved:** Centralized common utility functions across all plugins
- **Refactored:** protocol-links.js and debug.js now use Utils functions
- **Result:** Consistent clipboard and notification behavior across all plugins

#### Debug Plugin - Enhanced Tools (v1.1.0)

- **New:** `window.debugDumpHTML()` command to dump entire page HTML
  - Outputs raw HTML to console (no line numbers)
  - Copies to clipboard with fallback method
  - Returns HTML as function result
- **New:** Auto-opens DevTools on startup via `AppApi.ShowDevTools()`
- **Improved:** Better debugging capabilities for plugin development
- **Result:** Much easier to inspect and debug VRCX UI

### 🔧 Changes

#### Update Script

- **New:** Clears logs directory before deployment for fresh debugging
- **Improved:** Better error handling for files in use
- **Result:** Cleaner debugging experience

#### All Plugins

- **Changed:** Removed excessive debug logging across all modules
- **Changed:** nav-menu-api and plugin-manager-ui now use `{BUILD}` placeholder
- **Improved:** Cleaner console output, only essential logs

### 🐛 Bug Fixes

#### Navigation Menu Content Visibility

- **Problem:** Content not showing when clicking custom nav items
- **Root Cause:** Vue 3 doesn't expose `$app.$watch`, and Pinia `$subscribe` state param was undefined
- **Fix:** Switched to `window.$pinia.ui.$subscribe()` and read `menuActiveIndex` from store directly
- **Result:** ✅ Custom tab content now displays correctly

#### Clipboard Fallback

- **Problem:** Clipboard operations failing when VRCX isn't focused
- **Root Cause:** Modern Clipboard API requires document focus
- **Fix:** Implemented try-catch with fallback to `document.execCommand('copy')` using textarea method
- **Result:** ✅ Clipboard works reliably in all scenarios

## [1.4.1] - 2025-10-11

### 🎉 Major Features

#### Context Menu System Rewrite (v1.4.1)

- **Fixed:** Avatar and world dialog context menus now work correctly
- **Fixed:** Z-index based detection for overlapping dialogs
- **Fixed:** Attribute observer for Element Plus popper menus
- **Improved:** Detection now works for pre-created menus that toggle visibility
- **Result:** ✅ 100% reliable for all dialog types

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

- **New:** Comprehensive debugging plugin with mutation observers
- **New:** Event listeners for user interactions
- **New:** Pinia watchers for state changes
- **New:** Auto-logs state on startup and login
- **New:** Log deduplication to prevent spam
- **Disabled:** By default (uncomment in custom.js to enable)

#### Dynamic Plugin Management

- **New:** `plugins.loadPlugin(url)` - Load plugins at runtime
- **New:** `plugins.unloadPlugin(url)` - Unload plugins
- **New:** `plugins.reloadPlugin(url)` - Reload specific plugin
- **New:** `plugins.reloadAllPlugins()` - Reload all plugins
- **New:** `plugins.startPlugin(name)` - Restart plugin
- **New:** `plugins.stopPlugin(name)` - Stop plugin
- **New:** `plugins.list()` and `plugins.getPlugins()` - List plugin info

### 🔧 Breaking Changes

#### Vuex to Pinia Migration

- **Changed:** `$app.store.vrcx` → `window.$pinia.vrcx`
- **Changed:** `$app.store.user` → `window.$pinia.user`
- **Changed:** All store access now uses Pinia API
- **Impact:** All plugins updated to new store structure

#### Custom Tags Structure

- **Changed:** `friends` array now contains userId strings directly (not objects)
- **Changed:** Tags stored in `customUserTags` Map (not `customTags`)
- **Changed:** Tag data uses lowercase properties (`tag`, `colour` not `Tag`, `Colour`)
- **Changed:** `getUserTags()` renamed to `getUserTag()` (returns single tag)
- **Impact:** Tag manager completely refactored

#### Notification System

- **Changed:** `$app.playNoty()` → `window.$pinia.notification.playNoty()`
- **Impact:** managers.js notification handler updated

#### IPC System

- **Changed:** `AppApi.SendIpc(object)` → `AppApi.SendIpc(type, data)` (two string params)
- **Changed:** `AppApi.XSNotification()` now requires 5 params (title, content, timeout, opacity, image)
- **Impact:** api-helpers.js updated with correct signatures

### 🐛 Bug Fixes

#### Steam API Integration

- **Problem:** "No VRChat playtime data found"
- **Cause:** Wrong API version (`/v1/` instead of `/v0001/`), missing parameters
- **Fix:** Corrected endpoint to `/IPlayerService/GetOwnedGames/v0001/` with `format=json&include_played_free_games=1`
- **Result:** ✅ Steam playtime working correctly

#### IPC Notifications

- **Problem:** `bak.SendIpc is not a function`
- **Cause:** Backup object not initialized, `SendIpc` not bound to correct context
- **Fix:** Lazy initialization with retry logic, proper `.bind(window.AppApi)`
- **Result:** ✅ IPC notifications working

#### Context Menu Detection

- **Problem:** Avatar and world dialog menus weren't showing custom items
- **Root Cause:** Element Plus pre-creates all `el-popper` menus and toggles visibility via `display` style and `aria-hidden` attributes
- **Solution:**
  - Added `attributes: true` to MutationObserver
  - Added `attributeFilter: ['style', 'aria-hidden', 'class']`
  - Implemented z-index sorting for overlapping dialogs
  - Button lookup via `aria-controls` to find containing dialog
- **Result:** ✅ 100% reliable for all dialog types

#### Tag Manager Friends Iteration

- **Problem:** Tagged friends showing 0/1082
- **Cause:** `friends` array structure changed from objects to userId strings
- **Fix:** Changed iteration from `friend.id` to just `friendId`
- **Result:** ✅ Correctly shows 18 tagged friends

## [1.0.0] - Initial Release

### Features

- Modular plugin system with GitHub loading
- Tag manager with external JSON support
- Bio auto-updater with dynamic placeholders
- Registry override system
- Context menu enhancements
- Protocol link utilities
- Auto-invite system
- Instance monitoring
- Notification handling

---

**Versioning Scheme:** `MAJOR.MINOR.PATCH`

- **MAJOR:** Breaking changes or major rewrites
- **MINOR:** New features, significant improvements
- **PATCH:** Bug fixes, minor tweaks

**Build Numbers:** Unix timestamps of file modification  
**Version Numbers:** Git commit count per file
