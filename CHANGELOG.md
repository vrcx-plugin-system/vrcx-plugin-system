# Changelog - VRCX Custom JS Plugin System

## v2.1.0 - Complete Refactoring (October 11, 2025)

### 🎯 Major Changes

#### Plugin System Refactoring

- ✅ **All 14 plugins refactored** to extend unified `Plugin` base class
- ✅ **Merged PluginLoader into PluginManager** - Single unified class
- ✅ **Proper lifecycle management** - `load()` → `start()` → `onLogin()` → `stop()`
- ✅ **Automatic resource cleanup** - Timers, observers, listeners auto-tracked

#### Global Namespace Cleanup

- ✅ **Everything under `customjs`** - No global pollution
- ✅ **Removed `window.plugins`** - Use `customjs.plugins` and `customjs.pluginManager`
- ✅ **Removed `window.on_login`** - Use `customjs.pluginManager.onLogin()`
- ✅ **Removed `USER_CONFIG`** - Now `customjs.config`
- ✅ **Removed `PLUGIN_CONFIG`** - Now `customjs.pluginConfig`

#### Hook System Improvements

- ✅ **Auto-waiting hooks** - Hook system automatically waits for functions to exist
- ✅ **No manual retries needed** - `wrapFunctionWhenReady()` with exponential backoff
- ✅ **Proper function interception** - All plugins use `registerPreHook`/`registerPostHook`
- ✅ **Removed direct overrides** - No more manual function overrides

#### API Improvements

- ✅ **Removed `initBackups()`** from api-helpers.js - Hook system handles backups automatically
- ✅ **Clean API surface** - Only `window.customjs`, `window.Plugin`, and `class PluginManager` in global scope
- ✅ **Direct plugin access** - `customjs.plugins` is array of Plugin instances

#### File Structure

- ✅ **Base classes in `js/`** - `Plugin.js`
- ✅ **All plugins in `js/plugins/`** - 14 plugins organized
- ✅ **Removed duplicates** - Cleaned up duplicate files
- ✅ **Correct case** - `Plugin.js` (capital P)

### 🔧 Plugin Changes

#### Updated Plugins (v3.0.0)

- **managers.js** v3.0.0
  - Removed manual setup() retry functions
  - Now uses auto-waiting hook system
  - Simplified code significantly
- **api-helpers.js** v3.0.0
  - Removed `initBackups()` function
  - Removed `window.bak` object
  - Hook system handles all function backups
- **plugin-manager-ui.js** v3.0.0
  - Fully refactored to use `customjs.plugins`
  - Uses `customjs.pluginManager` directly
  - Enhanced UI with system info section
  - Better plugin cards with all metadata

#### All Other Plugins (v2.0.0)

- config.js
- utils.js
- bio-updater.js (v2.1.0)
- debug.js (v1.0.0)
- template.js (v1.0.0)
- context-menu-api.js
- nav-menu-api.js
- auto-invite.js
- protocol-links.js
- registry-overrides.js
- tag-manager.js

### 📝 API Changes

#### Removed

```javascript
// ❌ REMOVED
window.plugins.list();
window.plugins.load(url);
window.on_login(callback);
window.bak.SendIpc();
USER_CONFIG;
PLUGIN_CONFIG;
api - helpers.initBackups();
```

#### New

```javascript
// ✅ NEW
customjs.plugins; // Array of Plugin instances
customjs.pluginManager.getPluginList();
customjs.pluginManager.addPlugin(url);
customjs.pluginManager.onLogin(callback);
customjs.functions["AppApi.SendIpc"]; // Auto-backed up by hooks
customjs.config;
customjs.pluginConfig;
```

### 🚀 Features

1. **Auto-Waiting Hooks**

   ```javascript
   // Just register - system waits for function to exist
   this.registerPreHook("AppApi.SendIpc", (args) => {
     console.log(args);
   });
   // No more manual setTimeout/retry logic needed!
   ```

2. **Automatic Resource Cleanup**

   ```javascript
   this.registerTimer(setInterval(() => {}, 1000));
   this.registerObserver(new MutationObserver(() => {}));
   // All cleaned up automatically on stop()!
   ```

3. **Event System**

   ```javascript
   this.emit("my-event", { data: "value" });
   this.on("other-plugin:event", (data) => {});
   ```

4. **Hot Reload**
   ```javascript
   await customjs.pluginManager.reloadPlugin(url);
   await plugin.toggle();
   ```

### 📚 Documentation

New documentation files:

- `README.md` - Updated for v2.1.0
- `REFACTORING_SUMMARY.md` - Complete refactoring guide
- `FINAL_VERIFICATION.md` - Verification checklist

### 🎉 Result

**100% Complete Refactoring**

- All requirements from PROMPT.md met
- All code under `customjs` namespace
- All plugins using proper hooks
- No manual retry logic needed
- Clean, maintainable architecture

---

## v1.5.0 (Previous)

- Navigation Menu API with automatic content management
- Plugin Manager UI redesign
- Utils module enhancements
- Debug plugin improvements

---

**Current Version**: 2.1.0  
**Status**: Production Ready ✅  
**Plugins**: 14/14 Refactored ✅
