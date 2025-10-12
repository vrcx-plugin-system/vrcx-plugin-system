# VRCX Custom JS - Modern Plugin System

> **A powerful, modular plugin system for VRCX with lifecycle management, hot-reload, and automatic resource cleanup.**

A modern JavaScript framework extending VRCX with features including custom navigation tabs, plugin management UI, context menus, user tagging, bio automation, and comprehensive debugging. Built on a robust Plugin base class with proper lifecycle management and resource tracking.

**🎯 Status:** Production Ready ✅ | **📦 Version:** 2.1.0 | **🔌 Plugins:** 14 (All Refactored ✅) | **📊 Lines:** ~8000+

## 🌟 What's New in v2.1.0

- ✨ **Complete Plugin System Refactoring** - All 14 plugins extend unified `Plugin` base class
- 🔄 **Proper Lifecycle Management** - `load()` → `start()` → `onLogin()` → `stop()`
- 🧹 **Automatic Resource Cleanup** - Timers, observers, listeners automatically cleaned up
- 🎯 **Event System** - Plugins can emit and listen to events from each other
- 🪝 **Hook System** - Intercept and modify function calls with pre/post hooks
- ♻️ **Hot Reload** - Enable/disable/reload plugins at runtime
- 📁 **Clean Structure** - Base classes in `js/`, plugins in `js/plugins/`
- 🌐 **Unified Namespace** - Everything under `window.customjs` (no global pollution)
- 🔧 **Merged PluginManager** - PluginLoader merged into PluginManager for simplicity
- ❌ **Removed Redundant APIs** - No more `window.plugins` or `window.on_login` wrappers

## 📋 Plugin Overview

| Plugin                    | Description                                    | Status          |
| ------------------------- | ---------------------------------------------- | --------------- |
| **Plugin.js**             | Base class for all plugins                     | ✅ Base Class   |
| **config.js**             | Configuration management                       | ✅ Refactored   |
| **utils.js**              | Utilities, clipboard, notifications, Steam API | ✅ Refactored   |
| **api-helpers.js**        | API wrappers, logging, location management     | ✅ Refactored   |
| **bio-updater.js**        | Auto-update bio with dynamic templates         | ✅ Refactored   |
| **debug.js**              | Debug utilities and system inspection          | ✅ Refactored   |
| **template.js**           | Comprehensive plugin example                   | ✅ Refactored   |
| **context-menu-api.js**   | Add items to dialog context menus              | ⏳ Needs Update |
| **nav-menu-api.js**       | Custom navigation tabs API                     | ⏳ Needs Update |
| **auto-invite.js**        | Location-based automatic invitations           | ⏳ Needs Update |
| **protocol-links.js**     | Copy VRCX protocol links                       | ⏳ Needs Update |
| **registry-overrides.js** | VRChat registry settings management            | ⏳ Needs Update |
| **tag-manager.js**        | Load 6000+ custom user tags                    | ⏳ Needs Update |
| **plugin-manager-ui.js**  | Visual plugin management dashboard             | ⏳ Needs Update |

## 📁 Project Structure

```
vrcx-custom/
├── custom.js                          # Main loader with PluginManager & PluginLoader
├── custom.css                         # Custom styling
├── update.ps1                         # Deployment script
│
├── js/                                # BASE CLASSES
│   └── Plugin.js                      # Plugin base class (loaded first)
│
└── js/plugins/                        # ALL PLUGINS
    ├── config.js                      # Configuration management ✅
    ├── utils.js                       # Utility functions ✅
    ├── api-helpers.js                 # API wrappers & logger ✅
    ├── bio-updater.js                 # Bio auto-updater ✅
    ├── debug.js                       # Debug utilities ✅
    ├── template.js                    # Plugin template/example ✅
    ├── context-menu-api.js            # Context menu management ✅
    ├── nav-menu-api.js                # Navigation menu API ✅
    ├── auto-invite.js                 # Auto-invite system ✅
    ├── protocol-links.js              # Protocol link handlers ✅
    ├── registry-overrides.js          # Registry settings ✅
    ├── tag-manager.js                 # Custom user tags ✅
    ├── managers.js                    # Manager utilities ✅
    └── plugin-manager-ui.js           # Plugin UI manager ✅
```

## 🚀 Quick Start

### Installation

1. **Clone or download** this repository
2. **Edit `custom.js`** and configure `window.customjs.config`:

```javascript
window.customjs.config = {
  steam: {
    id: "{env:STEAM_ID64}", // Your Steam ID
    key: "{env:STEAM_API_KEY}", // Your Steam API key
  },
  bio: {
    updateInterval: 7200000, // 2 hours
    template: `...`, // Your bio template
  },
  tags: {
    urls: ["https://your-tags-url.json"],
  },
  // ... other settings
};
```

3. **Set environment variables** (optional):

```powershell
[System.Environment]::SetEnvironmentVariable("STEAM_ID64", "your_id", "User")
[System.Environment]::SetEnvironmentVariable("STEAM_API_KEY", "your_key", "User")
```

4. **Run update script**:

```powershell
cd vrcx-custom
.\update.ps1
```

5. **Restart VRCX** - plugins load automatically from GitHub

### Manual Installation

Copy `custom.js` to `%APPDATA%\VRCX\custom.js` and replace placeholders:

- `{env:STEAM_ID64}` → your Steam ID
- `{env:STEAM_API_KEY}` → your Steam API key
- `{VERSION}` → version string
- `{BUILD}` → build timestamp

## 🏗️ Plugin System Architecture

### The Plugin Base Class

All plugins extend the `Plugin` base class which provides:

#### **Lifecycle Management**

```javascript
class MyPlugin extends Plugin {
  async load() {
    // Called when plugin code loads
    // Setup, register hooks, expose methods
  }

  async start() {
    // Called after all plugins loaded
    // Start timers, modify DOM, setup UI
  }

  async onLogin(currentUser) {
    // Called after VRChat login
    // Access user data, make API calls
  }

  async stop() {
    // Called when disabled/unloaded
    // Custom cleanup, then auto-cleanup
  }
}
```

#### **Resource Tracking**

Automatically cleaned up on `stop()`:

```javascript
// Register timer (auto-cleanup)
this.registerTimer(setInterval(() => {}, 1000));

// Register observer (auto-cleanup)
const observer = new MutationObserver(...);
this.registerObserver(observer);

// Register event listener (auto-cleanup)
this.registerListener(element, 'click', handler);

// Register Pinia subscription (auto-cleanup)
this.registerSubscription(unsubscribe);
```

#### **Event System**

```javascript
// Emit events
this.emit("my-event", { data: "value" });

// Listen to events
this.on("other-plugin:event", (data) => {
  console.log("Received:", data);
});
```

#### **Hook System**

```javascript
// Run before function
this.registerPreHook("AppApi.SendIpc", (args) => {
  console.log("SendIpc called with:", args);
});

// Run after function
this.registerPostHook("AppApi.SendIpc", (result, args) => {
  console.log("SendIpc returned:", result);
});
```

#### **State Management**

```javascript
await plugin.enable(); // Enable plugin
await plugin.disable(); // Disable & cleanup
await plugin.toggle(); // Toggle state

console.log(plugin.enabled); // Is enabled?
console.log(plugin.loaded); // Has load() completed?
console.log(plugin.started); // Has start() completed?
```

### Creating a Plugin

See `js/plugins/template.js` for a comprehensive example:

```javascript
class MyPlugin extends Plugin {
  constructor() {
    super({
      id: "my-plugin",
      name: "My Plugin",
      description: "What it does",
      author: "Your Name",
      version: "1.0.0",
      build: "1728668400",
      dependencies: [
        "https://github.com/USER/REPO/raw/refs/heads/main/js/Plugin.js",
        "https://github.com/USER/REPO/raw/refs/heads/main/js/plugins/utils.js",
      ],
    });
  }

  async load() {
    window.customjs.myPlugin = this;
    this.loaded = true;
  }

  async start() {
    this.enabled = true;
    this.started = true;
  }

  async onLogin(currentUser) {
    console.log("User:", currentUser.displayName);
  }

  async stop() {
    await super.stop(); // Auto-cleanup
  }
}

// Export for loader
window.__LAST_PLUGIN_CLASS__ = MyPlugin;
```

## 🌐 Global API

### Plugin Management (`customjs.pluginManager`)

```javascript
// List all plugins
customjs.pluginManager.getPluginList();

// Get plugin by ID
customjs.pluginManager.getPlugin("plugin-id");

// Access all plugins directly
customjs.plugins; // Array of all Plugin instances

// Load new plugin
await customjs.pluginManager.addPlugin("https://example.com/plugin.js");

// Unload plugin
await customjs.pluginManager.removePlugin("https://example.com/plugin.js");

// Reload plugin
await customjs.pluginManager.reloadPlugin("https://example.com/plugin.js");

// Reload all
await customjs.pluginManager.reloadAllPlugins();

// Enable/disable/toggle (access plugin directly)
const plugin = customjs.pluginManager.getPlugin("plugin-id");
await plugin.enable();
await plugin.disable();
await plugin.toggle();

// Or find and control in one line
customjs.plugins.find((p) => p.metadata.id === "utils").toggle();
```

### Plugin Instances (`window.customjs`)

```javascript
// System
customjs.version; // Plugin system version
customjs.build; // Build timestamp
customjs.config; // User configuration
customjs.plugins; // Array of all Plugin instances
customjs.pluginManager; // PluginManager instance (handles loading & management)
customjs.events; // Event registry
customjs.functions; // Backed up functions
customjs.hooks; // Hook registry (pre & post)

// Access plugins via manager
customjs.pluginManager.getPlugin("plugin-id"); // Get plugin by ID
customjs.pluginManager.waitForPlugin("plugin-id"); // Wait for plugin to load
```

### Configuration

```javascript
// Access config directly
customjs.config.steam.id;

// Or use the config plugin helper methods
const config = customjs.pluginManager.getPlugin("config");
config.get("steam.id");
config.set("steam.id", "value");
config.has("steam.id");
config.getAll();
```

### Utilities

```javascript
// Get plugin instance
const utils = customjs.pluginManager.getPlugin("utils");

// Clipboard
await utils.copyToClipboard("text", "Description");

// Notifications
utils.showSuccess("Success!");
utils.showError("Error!");
utils.showInfo("Info!");

// Time formatting
utils.timeToText(milliseconds);
utils.getTimestamp();
utils.formatDateTime();

// Steam API
await utils.getSteamPlaytime(steamId, apiKey);

// Helpers
utils.isEmpty(value);
utils.tryDecodeBase64(string);

// Register login callback
customjs.pluginManager.onLogin((currentUser) => {
  console.log(`User logged in: ${currentUser.displayName}`);
});
```

### API & Logging

```javascript
// API wrappers
await customjs.api.saveBio(bio);
await customjs.api.sendInvite(params, userId);

// Logging
customjs.logger.log(
  "Message",
  {
    console: true,
    vrcx: { notify: true, message: true },
    desktop: true,
    xsoverlay: true,
    webhook: true,
  },
  "info"
);
```

## ⚙️ Configuration

All configuration is in `window.customjs.config` in `custom.js`:

```javascript
window.customjs.config = {
  steam: {
    id: "{env:STEAM_ID64}", // Steam ID (base64 supported)
    key: "{env:STEAM_API_KEY}", // API key (base64 supported)
  },
  bio: {
    updateInterval: 7200000, // 2 hours
    initialDelay: 20000, // 20 seconds
    template: `
-
Relationship: {partners} <3
Auto Invite: {autoinvite}
Real Rank: {rank}
Friends: {friends} | Blocked: {blocked}
Time played: {playtime}
Last updated: {now}
    `,
  },
  registry: {
    VRC_ALLOW_UNTRUSTED_URL: {
      value: 0,
      events: ["VRCX_START", "GAME_START"],
    },
  },
  tags: {
    urls: ["https://github.com/USER/tags.json"],
    updateInterval: 3600000, // 1 hour
    initialDelay: 5000, // 5 seconds
  },
  webhook: "http://homeassistant.local:8123/api/webhook/vrcx",
};
```

### Bio Template Placeholders

- `{partners}` - Partners from favorites
- `{autojoin}` - Auto-join users
- `{autoinvite}` - Auto-invite user
- `{rank}` - Trust level
- `{friends}` - Friend count
- `{blocked}` - Blocked user count
- `{muted}` - Muted user count
- `{playtime}` - Time played (Steam API)
- `{date_joined}` - Join date
- `{now}` - Current timestamp
- `{tags_loaded}` - Loaded tag count
- `{userId}` - User ID
- `{steamId}` - Steam ID
- `{oculusId}` - Oculus ID

## 🐛 Debugging

### Enable Debug Plugin

Uncomment in `custom.js`:

```javascript
"https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/plugins/debug.js",
```

### Debug Commands

```javascript
// Access debug functions (provided by managers plugin)
const debugFns = customjs.debugFunctions; // or window.debugVRCX

// List plugins
debugFns.listPlugins();

// List events
debugFns.listEvents();

// List hooks
debugFns.listHooks();

// Inspect specific plugin
debugFns.inspectPlugin("plugin-id");

// Get plugin by ID
debugFns.getPlugin("plugin-id");
```

### Console Commands

```javascript
// Inspect all plugins
console.log(customjs.plugins);
console.log(customjs.pluginManager.getPluginList());

// Check plugin state
const plugin = customjs.pluginManager.getPlugin("plugin-id");
console.log(plugin.enabled, plugin.loaded, plugin.started);

// Find plugin and toggle
customjs.plugins.find((p) => p.metadata.id === "utils").toggle();

// Reload plugin
await customjs.pluginManager.reloadPlugin("https://url-to-plugin.js");

// Register for login events
customjs.pluginManager.onLogin((user) => console.log(user.displayName));
```

## 🔄 Updates

Run the update script to deploy changes:

```powershell
.\update.ps1
```

The script will:

- ✅ Commit and push to GitHub
- ✅ Process version placeholders (`{VERSION}`, `{BUILD}`)
- ✅ Replace environment variables
- ✅ Clear logs directory
- ✅ Copy to `%APPDATA%\VRCX\`

## 📚 Plugin Development

### Step-by-Step Guide

1. **Copy `js/plugins/template.js`** as your starting point
2. **Update metadata** in constructor
3. **Implement lifecycle methods**:
   - `load()` - Setup, expose globally
   - `start()` - Initialize, start timers
   - `onLogin()` - Handle user login
   - `stop()` - Cleanup
4. **Use resource tracking** for automatic cleanup
5. **Export** with `window.__LAST_PLUGIN_CLASS__`
6. **Add to `PLUGIN_CONFIG.plugins`** in `custom.js`
7. **Test** with hot reload

### Best Practices

- ✅ Always call `super()` with metadata
- ✅ Use `registerTimer()` for setInterval/setTimeout
- ✅ Use `registerObserver()` for MutationObserver
- ✅ Use `registerListener()` for addEventListener
- ✅ Use `registerSubscription()` for Pinia subscriptions
- ✅ Expose plugin to `window.customjs.pluginName`
- ✅ Call `await super.stop()` in stop()
- ✅ Use `this.log()`, `this.warn()`, `this.error()`
- ❌ Don't auto-initialize (loader handles it)
- ❌ Don't use IIFE wrapper at bottom

## 🔒 Security

- **Base64 Encoding**: Credentials can be base64 encoded
- **Environment Variables**: Sensitive data in env vars
- **Error Isolation**: Failed plugins don't break system
- **Resource Cleanup**: No memory leaks

## 🚀 Performance

- **Lazy Loading**: Plugins loaded on demand
- **Cache Busting**: Fresh updates with timestamps
- **Error Recovery**: Graceful error handling
- **Memory Management**: Automatic cleanup
- **Hot Reload**: No restart required

## 📄 Documentation

- **REFACTORING_SUMMARY.md** - Complete refactoring guide
- **STRUCTURE.md** - Project structure details
- **URL_REFERENCE.md** - URL patterns
- **REORGANIZATION_COMPLETE.md** - Migration notes

## 🤝 Contributing

1. Create plugin in `js/plugins/`
2. Extend `Plugin` base class
3. Follow lifecycle pattern
4. Add to `PLUGIN_CONFIG.plugins`
5. Update README.md
6. Test thoroughly
7. Commit and push

## 🆘 Support

**Common Issues:**

- "Plugin not registered" - Check `window.__LAST_PLUGIN_CLASS__`
- Load errors - Check dependencies in metadata
- Resource leaks - Use `register*()` methods

**Debug Steps:**

1. Check console logs
2. Verify config settings
3. Test with `plugins.list()`
4. Enable debug plugin
5. Check GitHub repo for updates

---

**Version**: 2.1.0  
**Author**: Bluscream  
**Last Updated**: October 11, 2025

## 🎉 Changelog

### v2.1.0 (October 11, 2025) - Major Refactoring

- ✨ **Complete Plugin System Refactoring**
  - All plugins extend unified `Plugin` base class
  - Proper lifecycle: `load()` → `start()` → `onLogin()` → `stop()`
  - Automatic resource cleanup (timers, observers, listeners)
  - Event system for inter-plugin communication
  - Hook system for function interception
  - Hot reload support
- 📁 **File Structure Reorganization**
  - Base classes in `js/` directory
  - All plugins in `js/plugins/` directory
  - Clean, consistent URL patterns
- 🌐 **Unified Namespace**
  - Everything under `window.customjs`
  - Direct plugin access via `customjs.plugins` array
  - Plugin management via `customjs.pluginManager`
- ✅ **Refactored Plugins**
  - config.js, utils.js, api-helpers.js
  - bio-updater.js, debug.js, template.js
- 📚 **Comprehensive Documentation**
  - REFACTORING_SUMMARY.md
  - STRUCTURE.md
  - URL_REFERENCE.md

### v1.5.0 (Previous)

- Navigation Menu API with automatic content management
- Plugin Manager UI redesign
- Utils module enhancements
- Debug plugin improvements
