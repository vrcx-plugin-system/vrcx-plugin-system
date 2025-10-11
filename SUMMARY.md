# VRCX Custom Plugins - Complete Summary

> **Production-ready plugin system for VRCX with 13 modules and comprehensive features**

## 📊 Overview

**Status:** ✅ Production Ready  
**Total Plugins:** 13 (12 active + 1 optional debug)  
**Total Lines:** ~6000+  
**Version:** 1.5.0  
**Last Updated:** October 11, 2025

## 🎯 Core Features

### 1. Dynamic Plugin System

- Load/unload/reload plugins at runtime
- Lifecycle hooks (`on_startup`, `on_login`)
- Automatic dependency management
- Global `window.plugins.*` API

### 2. Navigation Menu API ✨ NEW

- Add custom tabs to VRCX navigation
- **Automatic content management** - no manual show/hide needed
- Uses Pinia `$subscribe` for reactivity
- Supports HTMLElement, function, or string content

### 3. Plugin Manager UI ✨ ENHANCED

- Beautiful dashboard with stat cards
- Load plugins from URL input
- Enhanced plugin cards with metadata
- 4 actions per plugin: Reload, Start, Stop, Unload
- Module inspector (click to view in console)
- Click URLs to copy to clipboard

### 4. Context Menu API

- Add items to user/avatar/world/group dialogs
- Z-index based dialog detection
- Attribute observer for Element Plus poppers
- 100% reliable for all dialog types

### 5. Utils Library ✨ NEW

- `copyToClipboard()` - Works even when document unfocused
- `showSuccess()`, `showError()`, `showInfo()` - Unified notifications
- Steam API integration with playtime
- Time formatting utilities

### 6. Debug Plugin

- **Auto-opens DevTools** on startup
- Mutation observers for dialogs and dropdowns
- Event listeners for interactions
- Pinia watchers for state changes
- **`debugDumpHTML()`** - Dump page HTML to console + clipboard
- Log deduplication (500ms window)

## 📦 Plugin List

| #   | Plugin                | Version     | Purpose                                         |
| --- | --------------------- | ----------- | ----------------------------------------------- |
| 1   | custom.js             | 23+ commits | Main loader, lifecycle, dynamic management      |
| 2   | config.js             | {VERSION}   | Configuration and metadata                      |
| 3   | utils.js              | 1.1.0       | Clipboard, notifications, Steam API, time utils |
| 4   | api-helpers.js        | {VERSION}   | API wrappers, IPC, logging                      |
| 5   | context-menu-api.js   | 1.4.1       | Dialog context menus                            |
| 6   | nav-menu-api.js       | 1.2.0       | Navigation tabs with auto content               |
| 7   | protocol-links.js     | 1.0.0       | VRCX protocol link copying                      |
| 8   | registry-overrides.js | {VERSION}   | VRChat registry management                      |
| 9   | tag-manager.js        | {VERSION}   | 6000+ custom user tags                          |
| 10  | bio-updater.js        | {VERSION}   | Auto bio updates                                |
| 11  | auto-invite.js        | 1.0.1       | Location-based invites                          |
| 12  | managers.js           | {VERSION}   | Instance monitoring, notifications              |
| 13  | plugin-manager-ui.js  | 1.2.0       | Visual plugin management                        |
| 🔧  | debug.js              | 1.1.0       | Debug tools (disabled by default)               |

## 🎮 Console API Reference

### Plugin Management

```javascript
plugins.list(); // List all plugins
plugins.loadPlugin(url); // Load from URL
plugins.unloadPlugin(url); // Unload plugin
plugins.reloadPlugin(url); // Reload specific
plugins.reloadAllPlugins(); // Reload all
plugins.startPlugin(name); // Call on_startup()
plugins.stopPlugin(name); // Call cleanup()

// Aliases
plugins.reload(url);
plugins.reloadAll();
```

### Navigation Menu

```javascript
window.customjs.navMenu.addItem(id, {
  label: "My Tab",
  icon: "ri-star-line",
  content: "<h1>Content here</h1>", // Auto-managed!
  before: "settings",
});
window.customjs.navMenu.removeItem(id);
```

### Context Menus

```javascript
window.customjs.contextMenu.addUserItem(id, { text, icon, onClick });
window.customjs.contextMenu.addAvatarItem(id, { text, icon, onClick });
window.customjs.contextMenu.addWorldItem(id, { text, icon, onClick });
window.customjs.contextMenu.addGroupItem(id, { text, icon, onClick });
```

### Utils

```javascript
await Utils.copyToClipboard(text, "Description");
Utils.showSuccess("Message");
Utils.showError("Message");
Utils.showInfo("Message");
```

### Debug Commands

```javascript
window.logVRCXState(); // Log current state
await window.debugDumpHTML(); // Dump HTML + clipboard
window.debugFindElements(sel); // Find DOM elements
window.debugWatchElement(sel); // Watch mutations
```

## 🔧 Build System

**Placeholders** (auto-replaced by `update.ps1`):

- `{VERSION}` → Git commit count for that file
- `{BUILD}` → Unix timestamp of file modification
- `{env:VARIABLE}` → Environment variable value

**Update Script** (`update.ps1`):

1. ✅ Git commit & push to main branch
2. ✅ Process placeholders with real values
3. ✅ Clear logs directory
4. ✅ Deploy to `%APPDATA%\VRCX\`

## 🐛 Major Fixes

### Navigation Menu Content (v1.2.0)

**Problem:** Content not showing when clicking nav items  
**Cause:** Vue 3 doesn't have `$app.$watch`, Pinia `$subscribe` state param was undefined  
**Fix:** Use `window.$pinia.ui.$subscribe()` and read from store directly, not state param  
**Result:** ✅ 100% working tab content management

### Context Menu Detection (v1.4.1)

**Problem:** Avatar/world menus not working  
**Cause:** Element Plus pre-creates menus, toggles via attributes  
**Fix:** Added attribute observer + z-index sorting for topmost dialog  
**Result:** ✅ 100% reliable for all dialog types

### Clipboard Fallback (v1.1.0)

**Problem:** Clipboard fails when document not focused  
**Cause:** Modern clipboard API requires focus  
**Fix:** Try modern API, fallback to `document.execCommand('copy')` with textarea  
**Result:** ✅ Works even when VRCX is unfocused

### Tag Manager (v1.0.0)

**Problem:** Tags showing 0/1082 despite loading  
**Cause:** Friends array has userId strings directly, not objects; wrong property names  
**Fix:** Changed to `customUserTags`, iterate over strings, use lowercase properties  
**Result:** ✅ 27 tagged users detected correctly

## 📁 File Structure

```
vrcx-custom/
├── custom.js (539 lines)         ← Main loader
├── custom.css                     ← Custom styles
├── update.ps1 (297 lines)         ← Deployment script
├── README.md                      ← Documentation
├── CHANGELOG.md                   ← Version history
└── js/
    ├── config.js                  ← Config management
    ├── utils.js (255 lines)       ← Shared utilities ✨
    ├── api-helpers.js             ← API wrappers
    ├── context-menu-api.js        ← Dialog menus
    ├── nav-menu-api.js (400 lines)← Navigation API ✨
    ├── plugin-manager-ui.js (693) ← Plugin UI ✨
    ├── protocol-links.js          ← VRCX links
    ├── registry-overrides.js      ← Registry settings
    ├── tag-manager.js             ← User tags
    ├── bio-updater.js             ← Bio automation
    ├── auto-invite.js             ← Auto invites
    ├── managers.js                ← Monitoring
    └── debug.js (494 lines)       ← Debug tools ✨
```

## 🚀 Usage Examples

### Create a Custom Tab

```javascript
window.customjs.navMenu.addItem("myTab", {
  label: "My Custom Tab",
  icon: "ri-rocket-line",
  content: () => {
    const div = document.createElement("div");
    div.innerHTML = "<h1>Hello VRCX!</h1>";
    return div;
  },
});
```

### Add Context Menu Item

```javascript
window.customjs.contextMenu.addUserItem("copy-id", {
  text: "Copy User ID",
  icon: "el-icon-document-copy",
  onClick: async (userData) => {
    await Utils.copyToClipboard(userData.id, "User ID");
    Utils.showSuccess("User ID copied!");
  },
});
```

### Load Plugin Dynamically

```javascript
await plugins.loadPlugin("https://example.com/my-plugin.js");
```

### Debug Page State

```javascript
window.logVRCXState(); // Logs dialogs, user, location, modules
await window.debugDumpHTML(); // Full HTML to clipboard
```

## 📝 Configuration

Edit `USER_CONFIG` in `custom.js`:

```javascript
const USER_CONFIG = {
  steam: {
    id: "{env:STEAM_ID64}",
    key: "{env:STEAM_API_KEY}",
  },
  bio: {
    updateInterval: 7200000, // 2 hours
    template: "...", // Your bio template
  },
  tags: {
    urls: ["https://..."], // Tag JSON URLs
    updateInterval: 3600000, // 1 hour
  },
  webhook: "http://...", // Optional webhook
};
```

## 🎓 Development Guide

### Creating a New Plugin

```javascript
class MyPlugin {
  static SCRIPT = {
    name: "My Plugin",
    version: "{VERSION}",
    build: "{BUILD}",
    dependencies: [],
  };

  constructor() {
    this.on_startup();
  }

  on_startup() {
    // Setup before login
    window.on_login((user) => this.on_login(user));
  }

  on_login(currentUser) {
    // Setup after login
  }

  cleanup() {
    // Cleanup resources
  }
}

(function () {
  window.customjs = window.customjs || {};
  window.customjs.myPlugin = new MyPlugin();
  window.customjs.script = window.customjs.script || {};
  window.customjs.script.myPlugin = MyPlugin.SCRIPT;
  console.log(`✓ Loaded ${MyPlugin.SCRIPT.name} v${MyPlugin.SCRIPT.version}`);
})();
```

### Adding to Module List

Add to `custom.js` MODULE_CONFIG in correct dependency order:

```javascript
modules: [
  // ... existing modules ...
  "https://github.com/YOUR_USERNAME/vrcx-custom/raw/refs/heads/main/js/my-plugin.js",
];
```

## 🔍 Troubleshooting

| Issue                 | Solution                                                    |
| --------------------- | ----------------------------------------------------------- |
| Plugins not loading   | Check GitHub URL, internet connection, console for errors   |
| Tags showing 0        | Check `tags.urls` configuration and JSON format             |
| Bio not updating      | Verify Steam credentials, check console logs                |
| Context menus missing | Ensure dialog is fully loaded, check z-index detection logs |
| Tab content blank     | Run `plugins.reloadAll()`, check Pinia store availability   |

**Check logs at:** `%APPDATA%\VRCX\logs\VRCX*.log`

## ✅ Current Status

**All Systems Working:**

- ✅ Plugin loader with lifecycle hooks
- ✅ Context menus for all dialog types
- ✅ Navigation menu with auto content management
- ✅ Plugin manager UI with dashboard
- ✅ Tag loading (6821 tags, 27 tagged users)
- ✅ Steam API integration (playtime working)
- ✅ Bio auto-updates
- ✅ Debug plugin with DevTools auto-open
- ✅ Dynamic plugin management
- ✅ Clipboard with unfocused fallback

**Known Limitations:**

- JavaScript doesn't allow true code unloading (refresh VRCX for full removal)
- Some features require VRChat login to function
- GitHub rate limits may affect frequent reloads

---

**Created:** October 11, 2025  
**Author:** Bluscream  
**License:** Part of VRCX ecosystem  
**Repository:** https://github.com/Bluscream/vrcx-custom
